-- =============================================================================
-- v4: editable home-page ticker and free-text experience periods.
-- Safe to run more than once.
-- =============================================================================

-- Words in the thin ticker under the hero (Admin → Settings → Hero).
alter table public.site_settings add column if not exists ticker_items text[] not null default '{}';

-- Optional display text for an experience period ("2026", "Summer 2025"),
-- used instead of the formatted start/end dates when set.
alter table public.experience add column if not exists period_label text not null default ''
  check (char_length(period_label) <= 60);
