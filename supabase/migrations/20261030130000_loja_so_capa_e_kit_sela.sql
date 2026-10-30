-- A loja passa a ter só a Capa DÍGITO e o Kit Sela padrão.
-- O anel volta a rascunho (ainda em desenho); titânio, ímanes e tampas ficam arquivados (não apagados).
update public.listings set status = 'rascunho' where slug = 'anel-pa12';
update public.listings set status = 'arquivado' where slug in ('sela-titanio', 'imanes-n42', 'tampas-cegas');
