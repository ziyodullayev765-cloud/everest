-- Browser push notifications for administrators (new contact messages).
--
-- Each admin device that turns notifications on stores its Web Push
-- subscription here. Admins manage only their own rows. The server reads the
-- list through push_targets(), which requires a shared secret (PUSH_SECRET on
-- the server, stored here only as a SHA-256 hash), so anonymous visitors can
-- never list or remove subscriptions and the app needs no service-role key.

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  endpoint   text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh     text not null check (char_length(p256dh) <= 200),
  auth       text not null check (char_length(auth) <= 100),
  user_agent text check (char_length(user_agent) <= 400),
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push: admin read own" on public.push_subscriptions;
create policy "push: admin read own" on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()) and (select public.is_admin()));
drop policy if exists "push: admin insert own" on public.push_subscriptions;
create policy "push: admin insert own" on public.push_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_admin()));
drop policy if exists "push: admin update own" on public.push_subscriptions;
create policy "push: admin update own" on public.push_subscriptions for update to authenticated
  using (user_id = (select auth.uid()) and (select public.is_admin()))
  with check (user_id = (select auth.uid()) and (select public.is_admin()));
drop policy if exists "push: admin delete own" on public.push_subscriptions;
create policy "push: admin delete own" on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()) and (select public.is_admin()));

revoke all on public.push_subscriptions from anon;

-- One-row table holding the hash of the server's PUSH_SECRET. No policies:
-- nobody can read it through the API.
create table if not exists public.push_config (
  id          smallint primary key default 1 check (id = 1),
  secret_hash text not null check (secret_hash ~ '^[0-9a-f]{64}$')
);
alter table public.push_config enable row level security;
revoke all on public.push_config from anon, authenticated;

create or replace function public.push_secret_ok(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.push_config
    where char_length(coalesce(p_secret, '')) >= 32
      and secret_hash = encode(extensions.digest(p_secret, 'sha256'), 'hex')
  );
$$;
revoke all on function public.push_secret_ok(text) from public, anon, authenticated;

-- Subscriptions of current admins, for the server to deliver a notification.
create or replace function public.push_targets(p_secret text)
returns table (endpoint text, p256dh text, auth text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.push_secret_ok(p_secret) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
    select s.endpoint, s.p256dh, s.auth
    from public.push_subscriptions s
    join public.admin_users a on a.user_id = s.user_id;
end;
$$;

-- Forget a subscription the push service reported as gone (404/410).
create or replace function public.push_forget(p_secret text, p_endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.push_secret_ok(p_secret) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
end;
$$;

revoke all on function public.push_targets(text) from public;
revoke all on function public.push_forget(text, text) from public;
grant execute on function public.push_targets(text) to anon, authenticated;
grant execute on function public.push_forget(text, text) to anon, authenticated;
