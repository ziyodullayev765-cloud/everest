-- =============================================================================
-- RLS regression tests. Run against a LOCAL / disposable database only:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_test.sql
-- Everything runs inside a transaction that is rolled back.
-- =============================================================================
\o /dev/null
begin;

create or replace function pg_temp.as_user(p_role text, p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', p_role)::text, true);
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
  execute format('set local role %I', p_role);
end $$;

create or replace function pg_temp.check(cond boolean, label text) returns void
language plpgsql as $$
begin
  if not cond then raise exception 'FAIL: %', label; end if;
  raise notice 'ok - %', label;
end $$;

-- Fixtures (as superuser)
insert into auth.users (id, instance_id, aud, role, email)
values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-fixture-admin@test.invalid'),
       ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-fixture-user@test.invalid');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-0000000000a1');

insert into public.projects (slug, title, status) values ('pub-one', 'Published', 'published'), ('draft-one', 'Draft', 'draft');
insert into public.media (path, url, file_name, mime_type, size_bytes, kind, in_gallery, status)
values ('a.jpg', 'http://x/a.jpg', 'a.jpg', 'image/jpeg', 1, 'image', true, 'published'),
       ('b.pdf', 'http://x/b.pdf', 'b.pdf', 'application/pdf', 1, 'document', false, 'draft');

-- ---------------------------------------------------------------- anonymous
select pg_temp.as_user('anon', null);
select pg_temp.check((select count(*) from public.projects where slug in ('pub-one','draft-one','new-one')) = 1, 'anon sees only published projects');
select pg_temp.check((select count(*) from public.media where path in ('a.jpg','b.pdf')) = 1, 'anon sees only published gallery media');
select pg_temp.check((select count(*) from public.profiles) = 1, 'anon can read profile');
select pg_temp.check((select count(*) from public.contact_messages) = 0, 'anon cannot read messages');
select pg_temp.check(not public.is_admin(), 'anon is not admin');

do $$ begin
  insert into public.projects (slug, title) values ('hack', 'Hack');
  raise exception 'FAIL: anon inserted project';
exception when insufficient_privilege then raise notice 'ok - anon cannot insert projects';
end $$;

do $$ begin
  insert into public.contact_messages (name, email, message) values ('Eve', 'e@x.io', 'direct insert attempt');
  raise exception 'FAIL: anon inserted message directly';
exception when insufficient_privilege then raise notice 'ok - anon cannot insert contact_messages directly';
end $$;

do $$ begin
  update public.site_settings set site_name = 'pwned';
  if (select site_name from public.site_settings) = 'pwned' then raise exception 'FAIL: anon updated settings'; end if;
  raise notice 'ok - anon update of settings is a no-op';
end $$;

select pg_temp.check(public.submit_contact_message('Visitor', 'v@example.com', 'Hi', 'Hello there, this is a test.', 'iphash-1', 'ua') is not null,
                     'anon can submit via submit_contact_message');

do $$ begin
  perform public.submit_contact_message('V', 'bad-email', '', 'short');
  raise exception 'FAIL: invalid contact accepted';
exception when sqlstate '22023' then raise notice 'ok - invalid contact rejected';
end $$;

do $$
declare i int;
begin
  for i in 1..4 loop
    perform public.submit_contact_message('Visitor', 'v@example.com', '', 'Message number ' || i, 'iphash-1', null);
  end loop;
  begin
    perform public.submit_contact_message('Visitor', 'v@example.com', '', 'One too many messages', 'iphash-1', null);
    raise exception 'FAIL: rate limit not enforced';
  exception when sqlstate 'P0001' then raise notice 'ok - per-IP rate limit enforced';
  end;
end $$;

do $$ begin
  insert into storage.objects (bucket_id, name) values ('media', 'evil.jpg');
  raise exception 'FAIL: anon uploaded to storage';
exception when insufficient_privilege then raise notice 'ok - anon cannot upload to storage';
end $$;

reset role;

-- ---------------------------------------------------- authenticated non-admin
select pg_temp.as_user('authenticated', '00000000-0000-0000-0000-0000000000b2');
select pg_temp.check(not public.is_admin(), 'regular user is not admin');
select pg_temp.check((select count(*) from public.projects where slug in ('pub-one','draft-one','new-one')) = 1, 'regular user sees only published');
select pg_temp.check((select count(*) from public.admin_users) = 0, 'regular user cannot list admins');

do $$ begin
  insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-0000000000b2');
  raise exception 'FAIL: user escalated to admin';
exception when insufficient_privilege then raise notice 'ok - user cannot self-promote';
end $$;

do $$ begin
  insert into public.projects (slug, title) values ('nope', 'Nope');
  raise exception 'FAIL: non-admin inserted project';
exception when insufficient_privilege then raise notice 'ok - non-admin cannot insert projects';
end $$;

do $$ begin
  delete from public.projects where slug in ('pub-one','draft-one','new-one');
  if (select count(*) from public.projects where slug in ('pub-one','draft-one','new-one')) <> 1 then raise exception 'FAIL'; end if;
  raise notice 'ok - non-admin delete is a no-op';
end $$;

do $$ begin
  insert into storage.objects (bucket_id, name) values ('media', 'evil.jpg');
  raise exception 'FAIL: non-admin uploaded to storage';
exception when insufficient_privilege then raise notice 'ok - non-admin cannot upload to storage';
end $$;

reset role;

-- -------------------------------------------------------------------- admin
select pg_temp.as_user('authenticated', '00000000-0000-0000-0000-0000000000a1');
select pg_temp.check(public.is_admin(), 'admin is admin');
select pg_temp.check((select count(*) from public.projects where slug in ('pub-one','draft-one','new-one')) = 2, 'admin sees drafts');
select pg_temp.check((select count(*) from public.media where path in ('a.jpg','b.pdf')) = 2, 'admin sees all media');
select pg_temp.check((select count(*) from public.contact_messages where ip_hash = 'iphash-1') = 5, 'admin reads messages');

insert into public.projects (slug, title, status) values ('new-one', 'New', 'draft');
update public.projects set status = 'published' where slug = 'new-one';
select pg_temp.check((select published_at is not null from public.projects where slug = 'new-one'), 'published_at set on publish');
update public.site_settings set accent_color = '#22c55e';
select pg_temp.check((select accent_color from public.site_settings) = '#22c55e', 'admin updates settings');
delete from public.projects where slug = 'draft-one';
select pg_temp.check((select count(*) from public.projects where slug in ('pub-one','draft-one','new-one')) = 2, 'admin deletes project');
insert into storage.objects (bucket_id, name) values ('media', 'ok.jpg');
select pg_temp.check(true, 'admin uploads to storage');
select pg_temp.check((select count(*) from public.activity_log where actor = '00000000-0000-0000-0000-0000000000a1') >= 3,
                     'activity log records admin edits');

do $$ begin
  update public.site_settings set accent_color = 'red';
  raise exception 'FAIL: invalid colour accepted';
exception when check_violation then raise notice 'ok - check constraint rejects bad colour';
end $$;

reset role;
rollback;
\o
\echo 'All RLS tests passed.'
