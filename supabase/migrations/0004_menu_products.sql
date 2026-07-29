-- Menú: catálogo de productos por local.
-- Categorías fijas para el MVP (Entradas/Platos Fuertes/Bebidas/Postres);
-- si más adelante se necesita que el dueño las edite libremente, esto
-- se separa a su propia tabla `categories`.

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,
  name text not null,
  category text not null check (category in ('Entradas', 'Platos Fuertes', 'Bebidas', 'Postres')),
  price numeric(10, 2) not null check (price >= 0),
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists products_location_id_idx on public.products (location_id);

alter table public.products enable row level security;

create policy "products_select_own_location" on public.products
  for select using (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
  );

create policy "products_insert_own_location" on public.products
  for insert with check (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
  );

create policy "products_update_own_location" on public.products
  for update using (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
  );

create policy "products_delete_own_location" on public.products
  for delete using (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
  );
