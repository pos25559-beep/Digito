-- (aplicado em duas migrações no projeto: o valor do enum tem de existir antes de ser usado)
alter type public.listing_status add value if not exists 'em_revisao' before 'arquivado';
-- ver 20261029230100_listings_needs_review_b.sql
