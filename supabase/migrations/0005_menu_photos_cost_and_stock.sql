-- Completa el módulo de menú sobre la tabla `products` de 0004:
--   1. Bucket de storage para las fotos de producto.
--   2. Columnas de costo y disponibilidad.
--
-- Todo es idempotente (if not exists / drop policy if exists), así que
-- puede ejecutarse varias veces sin romper nada.

-- ---------- Costo y disponibilidad ----------
-- `cost` es nullable: los productos ya existentes no tienen costo capturado y
-- guardar 0 mentiría sobre el margen. La UI muestra "—" mientras esté vacío.
-- `in_stock` distingue "agotado hoy" de "inactivo": un producto puede seguir en
-- el menú (active = true) pero no estar disponible para vender.

alter table public.products
  add column if not exists cost numeric(10, 2) check (cost >= 0),
  add column if not exists in_stock boolean not null default true;


-- ---------- Bucket público para fotos de producto ----------
-- Público porque las imágenes se muestran directamente con <img src> en el
-- menú (no necesitan URLs firmadas); lo que protege el acceso de escritura
-- son las policies de abajo, restringidas por location_id vía la carpeta del
-- archivo (product-photos/{location_id}/archivo.ext).

insert into storage.buckets (id, name, public)
values ('product-photos', 'product-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "product_photos_insert_own_location" on storage.objects;
create policy "product_photos_insert_own_location" on storage.objects
  for insert
  with check (
    bucket_id = 'product-photos'
    and (storage.foldername(name))[1] in (
      select id::text from public.locations where owner_auth_id = auth.uid()
    )
  );

drop policy if exists "product_photos_update_own_location" on storage.objects;
create policy "product_photos_update_own_location" on storage.objects
  for update
  using (
    bucket_id = 'product-photos'
    and (storage.foldername(name))[1] in (
      select id::text from public.locations where owner_auth_id = auth.uid()
    )
  );

drop policy if exists "product_photos_delete_own_location" on storage.objects;
create policy "product_photos_delete_own_location" on storage.objects
  for delete
  using (
    bucket_id = 'product-photos'
    and (storage.foldername(name))[1] in (
      select id::text from public.locations where owner_auth_id = auth.uid()
    )
  );

drop policy if exists "product_photos_public_read" on storage.objects;
create policy "product_photos_public_read" on storage.objects
  for select
  using (bucket_id = 'product-photos');
