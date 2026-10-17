-- Interactive demo for a project: an embeddable URL (own app, Figma prototype,
-- YouTube / Vimeo, CodeSandbox …) shown in a phone or browser frame.
alter table public.projects add column if not exists demo_url  text check (demo_url is null or (demo_url ~* '^https://' and char_length(demo_url) <= 2048));
alter table public.projects add column if not exists demo_kind text not null default 'browser' check (demo_kind in ('browser', 'phone'));
