-- Turnos de empleado: permite ver quién está operando el sistema en este
-- momento y a qué hora entró o salió.
--
-- Un turno abierto es el que tiene `ended_at` nulo. El índice parcial único
-- de abajo garantiza que un empleado no pueda tener dos turnos abiertos a la
-- vez (dos tablets marcando entrada al mismo tiempo, por ejemplo).
--
-- Todo el archivo es idempotente: puedes pegarlo en el SQL Editor de Supabase
-- y correrlo las veces que haga falta sin romper nada.

create table if not exists public.employee_shifts (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,
  employee_id uuid not null references public.employees (id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint employee_shifts_ends_after_start check (ended_at is null or ended_at >= started_at)
);

create index if not exists employee_shifts_location_started_idx
  on public.employee_shifts (location_id, started_at desc);

create unique index if not exists employee_shifts_one_open_per_employee
  on public.employee_shifts (employee_id)
  where ended_at is null;

alter table public.employee_shifts enable row level security;

drop policy if exists "employee_shifts_select_own_location" on public.employee_shifts;
create policy "employee_shifts_select_own_location" on public.employee_shifts
  for select using (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
  );

-- El insert además exige que el empleado pertenezca a ese mismo local, para
-- que no se pueda abrir un turno "prestando" el id de un empleado ajeno.
drop policy if exists "employee_shifts_insert_own_location" on public.employee_shifts;
create policy "employee_shifts_insert_own_location" on public.employee_shifts
  for insert with check (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
    and exists (
      select 1 from public.employees e
      where e.id = employee_shifts.employee_id
        and e.location_id = employee_shifts.location_id
    )
  );

drop policy if exists "employee_shifts_update_own_location" on public.employee_shifts;
create policy "employee_shifts_update_own_location" on public.employee_shifts
  for update using (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
  );
