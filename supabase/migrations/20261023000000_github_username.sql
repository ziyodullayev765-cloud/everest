-- GitHub username for the activity graph on the home page (empty = hidden,
-- unless a GitHub profile is listed under social links).
alter table public.site_settings add column if not exists github_username text not null default ''
  check (github_username = '' or github_username ~* '^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}$');
