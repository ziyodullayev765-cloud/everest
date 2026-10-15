-- v5: the brief's bronze (#c5a059) as the default accent. Safe to run more than once.
update public.site_settings set accent_color = '#c5a059' where accent_color = '#c4a574';
alter table public.site_settings alter column accent_color set default '#c5a059';
