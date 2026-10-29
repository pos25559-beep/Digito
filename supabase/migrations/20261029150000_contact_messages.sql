create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null check (char_length(email) between 5 and 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  topic text not null check (topic in ('encomenda','devolucao','dados','vender','outro')),
  order_ref text check (order_ref is null or char_length(order_ref) <= 64),
  message text not null check (char_length(message) between 10 and 4000),
  handled boolean not null default false
);
alter table public.contact_messages enable row level security;
create policy "qualquer pessoa envia mensagem" on public.contact_messages
  for insert to anon, authenticated
  with check (handled = false and (user_id is null or user_id = (select auth.uid())));
revoke all on public.contact_messages from anon, authenticated;
grant insert (email, topic, order_ref, message, user_id) on public.contact_messages to anon, authenticated;
create index contact_messages_created_idx on public.contact_messages (created_at desc);
