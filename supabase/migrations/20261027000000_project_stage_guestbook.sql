-- Project stage badge ("In progress" / "Completed" / "Live") and a moderated guestbook.

alter table public.projects add column if not exists stage text check (stage is null or stage in ('in_progress', 'completed', 'live'));

-- Guestbook: visitors leave a short note through sign_guestbook(); nothing is
-- shown until the admin approves it. Visitors can read approved notes only.
create table if not exists public.guestbook_entries (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 60),
  message    text not null check (char_length(message) between 2 and 280),
  approved   boolean not null default false,
  ip_hash    text check (ip_hash is null or char_length(ip_hash) = 64),
  created_at timestamptz not null default now()
);
create index if not exists guestbook_public_idx on public.guestbook_entries (approved, created_at desc);
create index if not exists guestbook_ip_idx on public.guestbook_entries (ip_hash, created_at desc);

alter table public.guestbook_entries enable row level security;
revoke all on public.guestbook_entries from anon;
grant select (id, name, message, created_at) on public.guestbook_entries to anon;

drop policy if exists "guestbook: read approved" on public.guestbook_entries;
create policy "guestbook: read approved" on public.guestbook_entries for select to anon, authenticated
  using (approved or (select public.is_admin()));
drop policy if exists "guestbook: admin update" on public.guestbook_entries;
create policy "guestbook: admin update" on public.guestbook_entries for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "guestbook: admin delete" on public.guestbook_entries;
create policy "guestbook: admin delete" on public.guestbook_entries for delete to authenticated
  using ((select public.is_admin()));

create or replace function public.sign_guestbook(p_name text, p_message text, p_ip_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name    text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_message text := btrim(coalesce(p_message, ''));
begin
  if char_length(v_name) not between 1 and 60 or char_length(v_message) not between 2 and 280 then
    raise exception 'invalid' using errcode = '22023';
  end if;
  if p_ip_hash is not null and p_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid' using errcode = '22023';
  end if;
  -- 3 notes per day per (hashed) IP, and at most 200 waiting for review overall.
  if p_ip_hash is not null and (
    select count(*) from public.guestbook_entries
    where ip_hash = p_ip_hash and created_at > now() - interval '1 day'
  ) >= 3 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  if (select count(*) from public.guestbook_entries where not approved) >= 200 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.guestbook_entries (name, message, ip_hash) values (v_name, v_message, p_ip_hash);
end;
$$;

revoke all on function public.sign_guestbook(text, text, text) from public;
grant execute on function public.sign_guestbook(text, text, text) to anon, authenticated;
