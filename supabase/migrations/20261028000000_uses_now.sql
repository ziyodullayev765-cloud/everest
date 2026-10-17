-- "/uses" page text and the "Now" line on the home page (both on the settings row).
alter table public.site_settings add column if not exists uses_text text not null default '' check (char_length(uses_text) <= 20000);
alter table public.site_settings add column if not exists now_text  text not null default '' check (char_length(now_text) <= 300);
