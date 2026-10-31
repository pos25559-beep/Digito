-- Opções do design: cor da capa, cor das pegas, modelo (acabamento das costas) e vincos laterais.
alter table public.designs add column if not exists options jsonb not null default '{}'::jsonb;
alter table public.designs add constraint designs_options_obj check (jsonb_typeof(options) = 'object' and pg_column_size(options) < 2000);
