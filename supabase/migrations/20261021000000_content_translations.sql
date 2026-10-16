-- Per-language copies of CMS text: { "uz": { "summary": "…" }, "ru": { … } }.
-- The regular columns keep the default (English) text; the site shows a
-- translated value instead when the visitor picked that language.

alter table public.site_settings add column if not exists translations jsonb not null default '{}'::jsonb;
alter table public.site_settings drop constraint if exists site_settings_translations_chk;
alter table public.site_settings add constraint site_settings_translations_chk
  check (jsonb_typeof(translations) = 'object' and pg_column_size(translations) < 200000);

alter table public.profiles add column if not exists translations jsonb not null default '{}'::jsonb;
alter table public.profiles drop constraint if exists profiles_translations_chk;
alter table public.profiles add constraint profiles_translations_chk
  check (jsonb_typeof(translations) = 'object' and pg_column_size(translations) < 200000);

alter table public.projects add column if not exists translations jsonb not null default '{}'::jsonb;
alter table public.projects drop constraint if exists projects_translations_chk;
alter table public.projects add constraint projects_translations_chk
  check (jsonb_typeof(translations) = 'object' and pg_column_size(translations) < 200000);

alter table public.achievements add column if not exists translations jsonb not null default '{}'::jsonb;
alter table public.achievements drop constraint if exists achievements_translations_chk;
alter table public.achievements add constraint achievements_translations_chk
  check (jsonb_typeof(translations) = 'object' and pg_column_size(translations) < 200000);

alter table public.experience add column if not exists translations jsonb not null default '{}'::jsonb;
alter table public.experience drop constraint if exists experience_translations_chk;
alter table public.experience add constraint experience_translations_chk
  check (jsonb_typeof(translations) = 'object' and pg_column_size(translations) < 200000);

alter table public.education add column if not exists translations jsonb not null default '{}'::jsonb;
alter table public.education drop constraint if exists education_translations_chk;
alter table public.education add constraint education_translations_chk
  check (jsonb_typeof(translations) = 'object' and pg_column_size(translations) < 200000);

alter table public.skills add column if not exists translations jsonb not null default '{}'::jsonb;
alter table public.skills drop constraint if exists skills_translations_chk;
alter table public.skills add constraint skills_translations_chk
  check (jsonb_typeof(translations) = 'object' and pg_column_size(translations) < 200000);

alter table public.stats add column if not exists translations jsonb not null default '{}'::jsonb;
alter table public.stats drop constraint if exists stats_translations_chk;
alter table public.stats add constraint stats_translations_chk
  check (jsonb_typeof(translations) = 'object' and pg_column_size(translations) < 200000);
