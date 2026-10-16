-- Optional soft click sounds on buttons and links. (The feature was later removed;
-- the column is kept so the database matches its migration history.)
alter table public.site_settings add column if not exists ui_sounds boolean not null default false;
