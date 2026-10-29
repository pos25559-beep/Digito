alter table public.listings add column if not exists needs text[] not null default '{}'
  check (needs <@ array['tremor','dor','forca']::text[]);
create or replace function private.listing_review_gate() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.seller_id is null or (select auth.uid()) is null then return new; end if;
  if new.status = 'ativo' then
    if tg_op = 'INSERT' then new.status := 'em_revisao';
    elsif old.status is distinct from 'ativo'
       or new.title is distinct from old.title or new.summary is distinct from old.summary
       or new.description is distinct from old.description or new.images is distinct from old.images
       or new.material is distinct from old.material or new.process is distinct from old.process then
      new.status := 'em_revisao';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.listing_review_gate() from public, anon, authenticated;
create trigger listings_review_ins before insert on public.listings for each row execute function private.listing_review_gate();
create trigger listings_review_upd before update on public.listings for each row execute function private.listing_review_gate();
-- (textos dos produtos oficiais atualizados por UPDATE no projeto)
