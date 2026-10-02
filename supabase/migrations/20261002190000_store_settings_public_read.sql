-- As configurações da loja (WhatsApp, Instagram, textos da home e do Sobre) são
-- públicas: o site lê esta linha para todo visitante. Sem esta regra o visitante
-- recebia uma lista vazia e o site caía nos valores fixos do código, ignorando o
-- que o painel salva.
-- Idempotente: pode ser executado mais de uma vez sem efeito colateral.

insert into public.store_settings (id) values (true) on conflict (id) do nothing;

grant select on public.store_settings to anon, authenticated;

drop policy if exists "store settings public read" on public.store_settings;
create policy "store settings public read"
on public.store_settings for select to anon, authenticated
using (true);
