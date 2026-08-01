-- Configuración del local. Cubre los tres bloques que hoy están quemados en
-- el código o son inaccesibles desde la app:
--
--   1. Datos del local  → columnas nuevas en `locations` (dirección, teléfono,
--      RFC). El nombre ya vivía ahí, pero solo se capturaba en el signup.
--   2. Categorías de menú → tabla `menu_categories`, en vez del CHECK fijo con
--      las cuatro categorías de la 0004.
--   3. Moneda e impuestos → tabla `location_settings` (una fila por local).
--
-- `products.category` sigue siendo texto (no un FK): cambiar a category_id
-- obligaría a reescribir todo el módulo de menú. En su lugar el rename se hace
-- de forma atómica con `rename_menu_category`, que arrastra los productos.
--
-- Todo el archivo es idempotente: puedes correrlo varias veces sin romper nada.

-- ─────────────────────────────────────────────────────────────
-- 1. Datos fiscales/de contacto del local (van en el ticket impreso)
-- ─────────────────────────────────────────────────────────────
alter table public.locations
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists tax_id text;


-- ─────────────────────────────────────────────────────────────
-- 2. Ajustes de venta: moneda, formato e impuesto
--
-- `prices_include_tax` decide si el precio capturado en el menú ya trae el
-- impuesto dentro (uso común en México) o si se suma al cobrar. Cambia el
-- cálculo de toda la cuenta, por eso se define antes de construir el cobro.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.location_settings (
  location_id uuid primary key references public.locations (id) on delete cascade,
  currency_code text not null default 'MXN' check (currency_code ~ '^[A-Z]{3}$'),
  locale text not null default 'es-MX',
  timezone text not null default 'America/Mexico_City',
  tax_rate numeric(5, 2) not null default 16.00 check (tax_rate >= 0 and tax_rate <= 100),
  prices_include_tax boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.location_settings enable row level security;

drop policy if exists "location_settings_select_own" on public.location_settings;
create policy "location_settings_select_own" on public.location_settings
  for select using (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
  );

drop policy if exists "location_settings_insert_own" on public.location_settings;
create policy "location_settings_insert_own" on public.location_settings
  for insert with check (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
  );

drop policy if exists "location_settings_update_own" on public.location_settings;
create policy "location_settings_update_own" on public.location_settings
  for update using (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
  );


-- ─────────────────────────────────────────────────────────────
-- 3. Categorías de menú editables por el dueño
--
-- El índice único es sobre lower(name) para que "Bebidas" y "bebidas" no
-- convivan: los productos se relacionan por nombre y dos variantes de
-- mayúsculas partirían el menú en dos categorías que se ven iguales.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists menu_categories_location_name_key
  on public.menu_categories (location_id, lower(name));

create index if not exists menu_categories_location_order_idx
  on public.menu_categories (location_id, sort_order);

alter table public.menu_categories enable row level security;

drop policy if exists "menu_categories_select_own_location" on public.menu_categories;
create policy "menu_categories_select_own_location" on public.menu_categories
  for select using (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
  );

drop policy if exists "menu_categories_insert_own_location" on public.menu_categories;
create policy "menu_categories_insert_own_location" on public.menu_categories
  for insert with check (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
  );

drop policy if exists "menu_categories_update_own_location" on public.menu_categories;
create policy "menu_categories_update_own_location" on public.menu_categories
  for update using (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
  );

-- Sin policy de delete: borrar pasa por `delete_menu_category`, que primero
-- verifica que ninguna categoría quede con productos huérfanos.


-- ─────────────────────────────────────────────────────────────
-- 4. Liberar `products.category` del CHECK fijo de la 0004
--
-- El CHECK se declaró en línea, así que su nombre lo puso Postgres. En vez de
-- adivinarlo se busca por definición: cualquier CHECK de `products` que
-- mencione las categorías viejas. Si ya se quitó, el bucle no hace nada.
-- ─────────────────────────────────────────────────────────────
do $$
declare
  v_constraint text;
begin
  for v_constraint in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public'
      and rel.relname = 'products'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) like '%Platos Fuertes%'
  loop
    execute format('alter table public.products drop constraint %I', v_constraint);
  end loop;
end;
$$;


-- ─────────────────────────────────────────────────────────────
-- 5. Sembrar los locales que ya existen
-- ─────────────────────────────────────────────────────────────
insert into public.location_settings (location_id)
select l.id from public.locations l
on conflict (location_id) do nothing;

-- Las cuatro categorías por defecto (las mismas que estaban quemadas).
insert into public.menu_categories (location_id, name, sort_order)
select l.id, d.name, d.ord
from public.locations l
cross join (values ('Entradas', 1), ('Platos Fuertes', 2), ('Bebidas', 3), ('Postres', 4))
  as d(name, ord)
on conflict (location_id, lower(name)) do nothing;

-- Y cualquier categoría que algún producto ya esté usando, para que ningún
-- producto quede apuntando a una categoría inexistente.
insert into public.menu_categories (location_id, name, sort_order)
select distinct p.location_id, p.category, 99
from public.products p
on conflict (location_id, lower(name)) do nothing;


-- ─────────────────────────────────────────────────────────────
-- 6. Locales nuevos: sembrar ajustes y categorías al crearse
-- ─────────────────────────────────────────────────────────────
create or replace function public.seed_location_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.location_settings (location_id)
  values (new.id)
  on conflict do nothing;

  insert into public.menu_categories (location_id, name, sort_order)
  values
    (new.id, 'Entradas', 1),
    (new.id, 'Platos Fuertes', 2),
    (new.id, 'Bebidas', 3),
    (new.id, 'Postres', 4)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists locations_seed_defaults on public.locations;
create trigger locations_seed_defaults
  after insert on public.locations
  for each row execute function public.seed_location_defaults();


-- ─────────────────────────────────────────────────────────────
-- 7. Renombrar una categoría, arrastrando sus productos
--
-- Va del lado del servidor para que el rename y la actualización de productos
-- ocurran en la misma transacción: si se hicieran como dos llamadas desde el
-- cliente, una falla intermedia dejaría productos en una categoría fantasma.
-- ─────────────────────────────────────────────────────────────
create or replace function public.rename_menu_category(
  p_category_id uuid,
  p_new_name text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category public.menu_categories%rowtype;
  v_new_name text := btrim(p_new_name);
begin
  if v_new_name = '' then
    raise exception 'El nombre de la categoría no puede estar vacío';
  end if;

  select * into v_category
  from public.menu_categories c
  where c.id = p_category_id
    and c.location_id in (
      select l.id from public.locations l where l.owner_auth_id = auth.uid()
    );

  if not found then
    raise exception 'Categoría no encontrada';
  end if;

  if v_new_name = v_category.name then
    return;
  end if;

  if exists (
    select 1 from public.menu_categories c
    where c.location_id = v_category.location_id
      and lower(c.name) = lower(v_new_name)
      and c.id <> v_category.id
  ) then
    raise exception 'Ya existe una categoría llamada "%"', v_new_name;
  end if;

  update public.menu_categories
  set name = v_new_name
  where id = v_category.id;

  update public.products
  set category = v_new_name
  where location_id = v_category.location_id
    and category = v_category.name;
end;
$$;


-- ─────────────────────────────────────────────────────────────
-- 8. Eliminar una categoría solo si está vacía
-- ─────────────────────────────────────────────────────────────
create or replace function public.delete_menu_category(p_category_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category public.menu_categories%rowtype;
  v_products integer;
begin
  select * into v_category
  from public.menu_categories c
  where c.id = p_category_id
    and c.location_id in (
      select l.id from public.locations l where l.owner_auth_id = auth.uid()
    );

  if not found then
    raise exception 'Categoría no encontrada';
  end if;

  select count(*) into v_products
  from public.products p
  where p.location_id = v_category.location_id
    and p.category = v_category.name;

  if v_products > 0 then
    raise exception 'No se puede eliminar "%": tiene % producto(s). Muévelos a otra categoría primero.',
      v_category.name, v_products;
  end if;

  delete from public.menu_categories where id = v_category.id;
end;
$$;
