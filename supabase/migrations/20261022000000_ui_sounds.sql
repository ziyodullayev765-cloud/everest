-- Optional soft click sounds on buttons and links (Admin → Settings → Appearance).
alter table public.site_settings add column if not exists ui_sounds boolean not null default false;
