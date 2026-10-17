-- When the admin last answered a contact message from the admin panel.
alter table public.contact_messages add column if not exists replied_at timestamptz;
