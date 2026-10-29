-- DÍGITO — esquema completo (estado final consolidado das migrações aplicadas ao projeto utfvcricxfkyiqxaxeci)

-- ============ PERFIS ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{3,24}$'),
  display_name text check (char_length(display_name) <= 60),
  bio text check (char_length(bio) <= 400),
  avatar_url text,
  location text check (char_length(location) <= 60),
  is_seller boolean not null default false,
  hand jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "perfis visíveis a todos" on public.profiles for select using (true);
create policy "cada um edita o seu perfil" on public.profiles for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "cada um cria o seu perfil" on public.profiles for insert with check ((select auth.uid()) = id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
declare base text; candidate text; n int := 0;
begin
  base := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g'));
  if char_length(base) < 3 then base := base || 'user'; end if;
  base := left(base, 20); candidate := base;
  while exists (select 1 from public.profiles where username = candidate) loop n := n + 1; candidate := left(base, 20) || n::text; end loop;
  insert into public.profiles (id, username, display_name) values (new.id, candidate, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ============ MARKETPLACE ============
create type public.listing_category as enum ('capa', 'pega', 'kit', 'acessorio');
create type public.listing_status as enum ('rascunho', 'ativo', 'arquivado');
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.profiles(id) on delete cascade, -- null = loja oficial
  title text not null check (char_length(title) between 3 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,90}$'),
  summary text check (char_length(summary) <= 160),
  description text check (char_length(description) <= 4000),
  category public.listing_category not null,
  price_cents integer not null check (price_cents between 100 and 100000),
  currency text not null default 'eur',
  material text, process text,
  phone_models text[] not null default '{}',
  images text[] not null default '{}',
  params jsonb,
  status public.listing_status not null default 'ativo',
  rating_avg numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  sales_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index listings_seller_idx on public.listings(seller_id);
create index listings_cat_idx on public.listings(category, status);
alter table public.listings enable row level security;
create policy "anúncios ativos são públicos; o vendedor vê os seus" on public.listings for select using (status = 'ativo' or seller_id = (select auth.uid()));
create policy "vendedores criam anúncios" on public.listings for insert with check (seller_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_seller));
create policy "vendedor edita os seus" on public.listings for update using (seller_id = (select auth.uid())) with check (seller_id = (select auth.uid()));
create policy "vendedor apaga os seus" on public.listings for delete using (seller_id = (select auth.uid()));

-- ============ DESIGNS ============
create table public.designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  phone_model text not null, grip_style text not null,
  hand jsonb not null, grips jsonb not null, grip_material text not null,
  drop_height numeric(3,1) not null default 1.2,
  price_cents integer not null check (price_cents > 0),
  created_at timestamptz not null default now()
);
create index designs_user_idx on public.designs(user_id);
alter table public.designs enable row level security;
create policy "designs privados" on public.designs for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ============ ENCOMENDAS ============
create type public.order_status as enum ('pendente', 'paga', 'em_impressao', 'enviada', 'entregue', 'cancelada');
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  status public.order_status not null default 'pendente',
  total_cents integer not null check (total_cents >= 0),
  shipping_cents integer not null default 0,
  currency text not null default 'eur',
  stripe_session_id text unique,
  shipping jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index orders_buyer_idx on public.orders(buyer_id);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  design_id uuid references public.designs(id) on delete set null,
  seller_id uuid references public.profiles(id) on delete set null,
  title text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity between 1 and 20),
  config jsonb
);
create index order_items_order_idx on public.order_items(order_id);
create index order_items_seller_idx on public.order_items(seller_id);
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create schema if not exists private;
grant usage on schema private to authenticated;
create function private.is_order_buyer(oid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.orders where id = oid and buyer_id = (select auth.uid())) $$;
create function private.is_order_seller(oid uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.order_items where order_id = oid and seller_id = (select auth.uid())) $$;
revoke all on function private.is_order_buyer(uuid) from public, anon;
revoke all on function private.is_order_seller(uuid) from public, anon;
grant execute on function private.is_order_buyer(uuid) to authenticated;
grant execute on function private.is_order_seller(uuid) to authenticated;
-- só a Edge Function (service role) cria encomendas; comprador e vendedores só leem
create policy "comprador vê as suas encomendas" on public.orders for select using (buyer_id = (select auth.uid()));
create policy "vendedor vê encomendas com artigos seus" on public.orders for select to authenticated using (private.is_order_seller(id));
create policy "comprador vê os seus artigos" on public.order_items for select to authenticated using (private.is_order_buyer(order_id));
create policy "vendedor vê os artigos que vendeu" on public.order_items for select using (seller_id = (select auth.uid()));

-- ============ AVALIAÇÕES E FAVORITOS ============
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text check (char_length(body) <= 1000),
  created_at timestamptz not null default now(),
  unique (listing_id, author_id)
);
alter table public.reviews enable row level security;
create policy "avaliações públicas" on public.reviews for select using (true);
create policy "compradores avaliam" on public.reviews for insert with check (author_id = (select auth.uid()) and exists (
  select 1 from public.order_items oi join public.orders o on o.id = oi.order_id
  where oi.listing_id = reviews.listing_id and o.buyer_id = (select auth.uid()) and o.status in ('paga','em_impressao','enviada','entregue')));
create policy "autor edita" on public.reviews for update using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "autor apaga" on public.reviews for delete using (author_id = (select auth.uid()));

create function public.refresh_listing_rating() returns trigger language plpgsql security definer set search_path = '' as $$
declare lid uuid := coalesce(new.listing_id, old.listing_id);
begin
  update public.listings l set rating_avg = coalesce((select round(avg(rating)::numeric, 2) from public.reviews where listing_id = lid), 0),
    rating_count = (select count(*) from public.reviews where listing_id = lid) where l.id = lid;
  return null;
end $$;
create trigger reviews_rating after insert or update or delete on public.reviews for each row execute function public.refresh_listing_rating();

create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);
alter table public.favorites enable row level security;
create policy "favoritos privados" on public.favorites for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ============ TRIGGERS DE PROTEÇÃO ============
create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at := now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger listings_touch before update on public.listings for each row execute function public.touch_updated_at();
create function public.protect_listing_counters() returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.role()) in ('authenticated', 'anon') then
    new.rating_avg := old.rating_avg; new.rating_count := old.rating_count; new.sales_count := old.sales_count; new.seller_id := old.seller_id;
  end if;
  return new;
end $$;
create trigger listings_protect before update on public.listings for each row execute function public.protect_listing_counters();
create function public.increment_sales(lid uuid, n int) returns void language sql security definer set search_path = '' as $$
  update public.listings set sales_count = sales_count + greatest(1, least(n, 20)) where id = lid $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.refresh_listing_rating() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.protect_listing_counters() from public, anon, authenticated;
revoke execute on function public.increment_sales(uuid, int) from public, anon, authenticated;
grant execute on function public.increment_sales(uuid, int) to service_role;

-- ============ STORAGE ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('listing-images', 'listing-images', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "imagens públicas" on storage.objects for select using (bucket_id in ('listing-images','avatars'));
create policy "upload na própria pasta" on storage.objects for insert to authenticated with check (bucket_id in ('listing-images','avatars') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "editar a própria pasta" on storage.objects for update to authenticated using (bucket_id in ('listing-images','avatars') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "apagar da própria pasta" on storage.objects for delete to authenticated using (bucket_id in ('listing-images','avatars') and (storage.foldername(name))[1] = (select auth.uid())::text);
