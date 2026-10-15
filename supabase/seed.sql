-- =============================================================================
-- Initial singleton rows. Safe to run more than once (does not overwrite edits).
--
-- Everything in [square brackets] is a clearly labelled placeholder. Replace it
-- from the admin dashboard (/admin/profile and /admin/settings). No projects,
-- achievements, statistics or history are invented here.
-- =============================================================================

insert into public.profiles (id, full_name, headline, short_intro, bio, avatar_alt)
values (
  1,
  'Behruz Ziyodullayev',
  '[Kasbiy unvoningiz — admin paneldan tahrirlang]',
  '[Qisqa tanishtiruv: o‘zingiz haqingizda 1–2 gap. Admin → Profil bo‘limidan tahrirlang.]',
  '[Biografiya: admin paneldan to‘ldiring.]',
  ''
)
on conflict (id) do nothing;

insert into public.site_settings (
  id, site_name, hero_eyebrow, hero_title, hero_description,
  seo_title, seo_description, footer_text, nav_items, footer_links, privacy_policy
)
values (
  1,
  'Behruz Ziyodullayev',
  'Portfolio',
  '',
  '[Hero tavsifi: nima bilan shug‘ullanishingizni qisqacha yozing. Admin → Sozlamalar → Hero.]',
  '',
  '',
  '',
  '[
    {"label":"Men haqimda","href":"/about","visible":true},
    {"label":"Loyihalar","href":"/projects","visible":true},
    {"label":"Yutuqlar","href":"/achievements","visible":true},
    {"label":"Ko‘nikmalar","href":"/skills","visible":true},
    {"label":"Tajriba","href":"/experience","visible":true},
    {"label":"Galereya","href":"/gallery","visible":true},
    {"label":"Aloqa","href":"/contact","visible":true}
  ]'::jsonb,
  '[{"label":"Maxfiylik siyosati","href":"/privacy","visible":true}]'::jsonb,
  'Ushbu sayt aloqa formasi orqali yuborilgan ism, elektron pochta va xabar matnini faqat sizga javob berish uchun saqlaydi. Spamdan himoyalanish maqsadida IP-manzilingizning bir tomonlama xeshi (asl manzil emas) va brauzer turi qisqa muddat saqlanadi. Ma’lumotlar uchinchi shaxslarga sotilmaydi yoki berilmaydi. Ma’lumotlaringizni o‘chirishni so‘rash uchun aloqa sahifasi orqali murojaat qiling.

[Bu matnni admin → Sozlamalar → Maxfiylik siyosati bo‘limidan o‘zingizga moslab tahrirlang.]'
)
on conflict (id) do nothing;
