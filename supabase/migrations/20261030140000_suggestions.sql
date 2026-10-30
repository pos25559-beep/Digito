-- Caixa de sugestões ("Mais modelos a caminho"): qualquer pessoa pode enviar; ninguém lê pelo site.
create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  topic text not null check (topic in ('capa','pega','cor','telemovel','outro')),
  message text not null check (char_length(message) between 5 and 1500),
  email text check (email is null or (char_length(email) between 5 and 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  page text check (page is null or char_length(page) <= 64),
  handled boolean not null default false
);
alter table public.suggestions enable row level security;
create policy "qualquer pessoa envia sugestao" on public.suggestions
  for insert to anon, authenticated
  with check (handled = false and (user_id is null or user_id = (select auth.uid())));
revoke all on public.suggestions from anon, authenticated;
grant insert (topic, message, email, page, user_id) on public.suggestions to anon, authenticated;
create index suggestions_created_idx on public.suggestions (created_at desc);
