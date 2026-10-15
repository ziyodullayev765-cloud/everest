-- =============================================================================
-- v2: background music + single source of truth for the owner's name.
-- Safe to run more than once.
-- =============================================================================

-- Background music chosen in Admin → Settings → Sound.
alter table public.site_settings add column if not exists music_url text;
alter table public.site_settings add column if not exists music_title text not null default '';

-- Audio uploads in the media library.
alter table public.media drop constraint if exists media_kind_check;
alter table public.media add constraint media_kind_check check (kind in ('image', 'document', 'audio'));

update storage.buckets
set file_size_limit = 15728640,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp','image/avif','image/gif',
      'image/x-icon','image/vnd.microsoft.icon','application/pdf',
      'audio/mpeg','audio/mp4','audio/x-m4a','audio/ogg','audio/wav','audio/webm','audio/aac'
    ]
where id = 'media';

-- The name now comes only from the profile. Clear the seeded copies of the old
-- default name so the site falls back to the profile name everywhere.
update public.site_settings set hero_title = ''        where hero_title = 'Shahruz Ziyodullayev';
update public.site_settings set site_name = coalesce((select full_name from public.profiles where id = 1), site_name)
  where site_name = 'Shahruz Ziyodullayev';
update public.site_settings set seo_title = ''         where seo_title = 'Shahruz Ziyodullayev — Portfolio';
update public.site_settings set seo_description = ''   where seo_description = 'Shahruz Ziyodullayevning shaxsiy portfoliosi: loyihalar, yutuqlar va tajriba.';
update public.site_settings set footer_text = ''       where footer_text = '© Shahruz Ziyodullayev. Barcha huquqlar himoyalangan.';
update public.profiles      set avatar_alt = ''        where avatar_alt = 'Shahruz Ziyodullayev portreti';

-- New colourful default accent (only if still on the original default).
update public.site_settings set accent_color = '#8b5cf6' where accent_color = '#10b981';
alter table public.site_settings alter column accent_color set default '#8b5cf6';
