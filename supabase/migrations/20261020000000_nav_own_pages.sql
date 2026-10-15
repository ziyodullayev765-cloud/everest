-- Menu items that pointed at home-page sections now open their own pages.
update public.site_settings
set nav_items = (
  select coalesce(jsonb_agg(
    case item->>'href'
      when '/#highlights' then jsonb_set(item, '{href}', '"/highlights"')
      when '/#contact'    then jsonb_set(item, '{href}', '"/contact"')
      when '/#projects'   then jsonb_set(item, '{href}', '"/projects"')
      when '/#skills'     then jsonb_set(item, '{href}', '"/skills"')
      when '/#experience' then jsonb_set(item, '{href}', '"/experience"')
      else item
    end
    order by ord
  ), '[]'::jsonb)
  from jsonb_array_elements(nav_items) with ordinality as t(item, ord)
)
where id = 1;
