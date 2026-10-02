-- Bucket das fotos de produto enviadas pelo painel (admin.produtos.$id.tsx).
-- Idempotente: pode ser executado mais de uma vez sem efeito colateral.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Qualquer visitante pode ver as fotos (o catálogo é público e usa URL assinada).
drop policy if exists "product images public read" on storage.objects;
create policy "product images public read"
on storage.objects for select to anon, authenticated
using (bucket_id = 'product-images');

-- Só administradores enviam, trocam ou apagam fotos.
drop policy if exists "product images admin insert" on storage.objects;
create policy "product images admin insert"
on storage.objects for insert to authenticated
with check (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "product images admin update" on storage.objects;
create policy "product images admin update"
on storage.objects for update to authenticated
using (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'))
with check (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "product images admin delete" on storage.objects;
create policy "product images admin delete"
on storage.objects for delete to authenticated
using (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));
