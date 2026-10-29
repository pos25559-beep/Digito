-- Pedidos "Feito contigo": formulário público, só-inserção; dados de saúde exigem consentimento explícito (RGPD art. 9.º, n.º 2, al. a))
create table public.custom_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) between 5 and 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (phone is null or char_length(phone) <= 40),
  requester text not null check (requester in ('proprio','familiar','terapeuta','outro')),
  phone_model text check (phone_model is null or char_length(phone_model) <= 80),
  difficulties text[] not null default '{}' check (difficulties <@ array['tremor','dor','forca','dedos','uma_mao','outra']::text[]),
  description text not null check (char_length(description) between 20 and 4000),
  contact_pref text not null check (contact_pref in ('email','telefone','video','presencial')),
  health_consent boolean not null default false,
  status text not null default 'novo' check (status in ('novo','em_contacto','orcamentado','em_producao','entregue','fechado')),
  notes text
);
alter table public.custom_requests add constraint health_needs_consent check (cardinality(difficulties) = 0 or health_consent);
alter table public.custom_requests enable row level security;
create policy "qualquer pessoa envia pedido" on public.custom_requests
  for insert to anon, authenticated
  with check (status = 'novo' and notes is null and (user_id is null or user_id = (select auth.uid())));
revoke all on public.custom_requests from anon, authenticated;
grant insert (user_id, name, email, phone, requester, phone_model, difficulties, description, contact_pref, health_consent) on public.custom_requests to anon, authenticated;
create index custom_requests_created_idx on public.custom_requests (created_at desc);
