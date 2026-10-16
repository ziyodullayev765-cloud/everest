-- Blog posts, testimonials and case-study fields for projects.

-- Case study: problem → solution → architecture → results, plus headline metrics
-- written as "value | label" lines (e.g. "1 200 | monthly users").
alter table public.projects add column if not exists problem      text not null default '' check (char_length(problem) <= 6000);
alter table public.projects add column if not exists solution     text not null default '' check (char_length(solution) <= 6000);
alter table public.projects add column if not exists architecture text not null default '' check (char_length(architecture) <= 6000);
alter table public.projects add column if not exists results      text not null default '' check (char_length(results) <= 6000);
alter table public.projects add column if not exists metrics      text[] not null default '{}' check (cardinality(metrics) <= 8);

create table if not exists public.posts (
  id              uuid primary key default gen_random_uuid(),
  title           text not null check (char_length(title) between 1 and 200),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  excerpt         text not null default '' check (char_length(excerpt) <= 400),
  body            text not null default '' check (char_length(body) <= 50000),
  cover_url       text,
  cover_alt       text not null default '' check (char_length(cover_alt) <= 300),
  tags            text[] not null default '{}' check (cardinality(tags) <= 12),
  seo_title       text not null default '' check (char_length(seo_title) <= 120),
  seo_description text not null default '' check (char_length(seo_description) <= 320),
  featured        boolean not null default false,
  status          public.publish_status not null default 'draft',
  sort_order      integer not null default 0,
  published_at    timestamptz,
  translations    jsonb not null default '{}'::jsonb
                  check (jsonb_typeof(translations) = 'object' and pg_column_size(translations) < 200000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.testimonials (
  id           uuid primary key default gen_random_uuid(),
  quote        text not null check (char_length(quote) between 1 and 800),
  name         text not null check (char_length(name) between 1 and 120),
  role         text not null default '' check (char_length(role) <= 160),
  organization text not null default '' check (char_length(organization) <= 160),
  avatar_url   text,
  url          text check (url is null or char_length(url) <= 2048),
  status       public.publish_status not null default 'draft',
  sort_order   integer not null default 0,
  translations jsonb not null default '{}'::jsonb
               check (jsonb_typeof(translations) = 'object' and pg_column_size(translations) < 200000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists posts_public_idx        on public.posts (status, published_at desc);
create index if not exists testimonials_public_idx on public.testimonials (status, sort_order);

drop trigger if exists set_published_at on public.posts;
create trigger set_published_at before insert or update on public.posts
  for each row execute function public.projects_set_published_at();

alter table public.posts        enable row level security;
alter table public.testimonials enable row level security;
revoke insert, update, delete on public.posts, public.testimonials from anon;

do $$
declare t text;
begin
  foreach t in array array['posts','testimonials']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
    execute format('drop trigger if exists log_activity on public.%I', t);
    execute format('create trigger log_activity after insert or update or delete on public.%I
                    for each row execute function public.log_activity()', t);

    execute format('drop policy if exists "%s: read published" on public.%I', t, t);
    execute format('create policy "%s: read published" on public.%I for select to anon, authenticated
                    using (status = ''published'' or (select public.is_admin()))', t, t);
    execute format('drop policy if exists "%s: admin insert" on public.%I', t, t);
    execute format('create policy "%s: admin insert" on public.%I for insert to authenticated with check ((select public.is_admin()))', t, t);
    execute format('drop policy if exists "%s: admin update" on public.%I', t, t);
    execute format('create policy "%s: admin update" on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', t, t);
    execute format('drop policy if exists "%s: admin delete" on public.%I', t, t);
    execute format('create policy "%s: admin delete" on public.%I for delete to authenticated using ((select public.is_admin()))', t, t);
  end loop;
end $$;
