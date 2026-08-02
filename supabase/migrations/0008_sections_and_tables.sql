-- Mapa de mesas dinámico (backlog Fase 1, decisión 2026-08-01).
--
-- Tres tablas:
--
--   1. `sections`          → secciones de la distribución del local (salón,
--      terraza, barra...). Cada una guarda el límite del espacio de trabajo
--      que dibuja el administrador como polígono en `boundary`.
--   2. `restaurant_tables` → solo el LAYOUT de cada mesa: forma, posición y
--      tamaño sobre el lienzo lógico. Nada de estado operativo aquí.
--   3. `table_states`      → el estado operativo (libre, ocupada...) separado
--      del layout, para que Realtime notifique únicamente cambios de estado
--      y mover una mesa en el editor no despierte a los mapas de FOH.
--
-- Coordenadas: lienzo lógico de 1000 × 620 unidades. `boundary` es una lista
-- de puntos [{"x":..,"y":..}] en ese espacio; `x`/`y` de una mesa son su
-- CENTRO (facilita drag y círculos). Se usan double precision y no numeric
-- porque PostgREST serializa numeric como string.
--
-- Todo el archivo es idempotente: puede correrse varias veces sin romper nada.

-- ─────────────────────────────────────────────────────────────
-- 1. Secciones del local
-- ─────────────────────────────────────────────────────────────
create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  sort_order integer not null default 0,
  -- null = todavía sin límite dibujado: toda el área del lienzo es válida.
  boundary jsonb check (boundary is null or jsonb_typeof(boundary) = 'array'),
  created_at timestamptz not null default now()
);

create unique index if not exists sections_location_name_key
  on public.sections (location_id, lower(name));

create index if not exists sections_location_order_idx
  on public.sections (location_id, sort_order);

alter table public.sections enable row level security;

drop policy if exists "sections_select_own" on public.sections;
create policy "sections_select_own" on public.sections
  for select using (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
  );

drop policy if exists "sections_insert_own" on public.sections;
create policy "sections_insert_own" on public.sections
  for insert with check (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
  );

drop policy if exists "sections_update_own" on public.sections;
create policy "sections_update_own" on public.sections
  for update using (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
  );

drop policy if exists "sections_delete_own" on public.sections;
create policy "sections_delete_own" on public.sections
  for delete using (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
  );


-- ─────────────────────────────────────────────────────────────
-- 2. Mesas (layout)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,
  section_id uuid not null references public.sections (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  capacity integer not null default 4 check (capacity between 1 and 50),
  shape text not null default 'rect' check (shape in ('rect', 'circle')),
  x double precision not null default 0,
  y double precision not null default 0,
  width double precision not null default 100 check (width > 0),
  height double precision not null default 100 check (height > 0),
  -- Reservada para cuando el editor soporte rotar; hoy siempre 0.
  rotation double precision not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists restaurant_tables_section_idx
  on public.restaurant_tables (section_id);

create index if not exists restaurant_tables_location_idx
  on public.restaurant_tables (location_id);

alter table public.restaurant_tables enable row level security;

drop policy if exists "restaurant_tables_select_own" on public.restaurant_tables;
create policy "restaurant_tables_select_own" on public.restaurant_tables
  for select using (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
  );

drop policy if exists "restaurant_tables_insert_own" on public.restaurant_tables;
create policy "restaurant_tables_insert_own" on public.restaurant_tables
  for insert with check (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
  );

drop policy if exists "restaurant_tables_update_own" on public.restaurant_tables;
create policy "restaurant_tables_update_own" on public.restaurant_tables
  for update using (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
  );

drop policy if exists "restaurant_tables_delete_own" on public.restaurant_tables;
create policy "restaurant_tables_delete_own" on public.restaurant_tables
  for delete using (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
  );


-- ─────────────────────────────────────────────────────────────
-- 3. Estado operativo de cada mesa
--
-- Los siete estados del backlog. `location_id` va desnormalizado para que la
-- policy no necesite un join con restaurant_tables en cada evento Realtime.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.table_states (
  table_id uuid primary key references public.restaurant_tables (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,
  status text not null default 'libre' check (
    status in ('libre', 'ocupada', 'en_captura', 'esperando', 'servida', 'por_pagar', 'sucia')
  ),
  updated_at timestamptz not null default now()
);

alter table public.table_states enable row level security;

drop policy if exists "table_states_select_own" on public.table_states;
create policy "table_states_select_own" on public.table_states
  for select using (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
  );

drop policy if exists "table_states_update_own" on public.table_states;
create policy "table_states_update_own" on public.table_states
  for update using (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
  );

-- Sin policy de insert/delete: la fila nace y muere con la mesa (trigger + FK
-- on delete cascade), nunca desde el cliente.

create or replace function public.seed_table_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.table_states (table_id, location_id)
  values (new.id, new.location_id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists restaurant_tables_seed_state on public.restaurant_tables;
create trigger restaurant_tables_seed_state
  after insert on public.restaurant_tables
  for each row execute function public.seed_table_state();

-- Mesas creadas antes de este trigger (por si la migración se corre a medias).
insert into public.table_states (table_id, location_id)
select t.id, t.location_id from public.restaurant_tables t
on conflict do nothing;


-- ─────────────────────────────────────────────────────────────
-- 4. Realtime: solo table_states entra a la publicación
-- ─────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'table_states'
  ) then
    alter publication supabase_realtime add table public.table_states;
  end if;
end;
$$;
