-- =============================================================================
-- v3: editorial monochrome design with a muted bronze accent.
-- Moves the accent to bronze only if it is still one of the earlier defaults.
-- Safe to run more than once.
-- =============================================================================
update public.site_settings set accent_color = '#c4a574' where accent_color in ('#8b5cf6', '#10b981');
alter table public.site_settings alter column accent_color set default '#c4a574';
