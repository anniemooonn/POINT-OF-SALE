-- Auth y roles básicos: locations (dispositivo/local) + employees (PIN por empleado)

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- locations: un registro por restaurante/local. owner_auth_id es
-- el dueño/gerente que hace el login del dispositivo (Supabase Auth).
-- ─────────────────────────────────────────────────────────────
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_auth_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists locations_owner_auth_id_key
  on public.locations (owner_auth_id);

alter table public.locations enable row level security;

create policy "locations_select_own" on public.locations
  for select using (owner_auth_id = auth.uid());

create policy "locations_insert_own" on public.locations
  for insert with check (owner_auth_id = auth.uid());

create policy "locations_update_own" on public.locations
  for update using (owner_auth_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- employees: personal de un local, identificado por nombre + PIN
-- (no tienen su propia sesión de Supabase Auth).
-- ─────────────────────────────────────────────────────────────
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,
  name text not null,
  role text not null check (role in ('admin', 'mesero', 'cocina', 'caja')),
  pin_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists employees_location_id_idx
  on public.employees (location_id);

alter table public.employees enable row level security;

create policy "employees_select_own_location" on public.employees
  for select using (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
  );

create policy "employees_update_own_location" on public.employees
  for update using (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
  );

-- No hay policy de insert directa: los empleados se crean únicamente vía
-- create_employee(...) para forzar el hash del PIN del lado del servidor.

-- ─────────────────────────────────────────────────────────────
-- create_employee: crea un empleado hasheando el PIN en el servidor.
-- Verifica que el location_id pertenezca al dueño autenticado.
-- ─────────────────────────────────────────────────────────────
create or replace function public.create_employee(
  p_location_id uuid,
  p_name text,
  p_role text,
  p_pin text
)
returns table (id uuid, name text, role text, active boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee public.employees%rowtype;
begin
  if p_role not in ('admin', 'mesero', 'cocina', 'caja') then
    raise exception 'Rol inválido: %', p_role;
  end if;

  if p_pin !~ '^[0-9]{4,6}$' then
    raise exception 'El PIN debe tener entre 4 y 6 dígitos';
  end if;

  if not exists (
    select 1 from public.locations
    where id = p_location_id and owner_auth_id = auth.uid()
  ) then
    raise exception 'No autorizado para crear empleados en este local';
  end if;

  insert into public.employees (location_id, name, role, pin_hash)
  values (p_location_id, p_name, p_role, crypt(p_pin, gen_salt('bf')))
  returning * into v_employee;

  return query select v_employee.id, v_employee.name, v_employee.role, v_employee.active;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- verify_employee_pin: valida el PIN de un empleado sin exponer el hash.
-- Restringido a empleados del local del dueño autenticado en el dispositivo.
-- ─────────────────────────────────────────────────────────────
create or replace function public.verify_employee_pin(
  p_employee_id uuid,
  p_pin text
)
returns table (success boolean, employee_id uuid, name text, role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee public.employees%rowtype;
begin
  select * into v_employee
  from public.employees e
  where e.id = p_employee_id
    and e.active = true
    and e.location_id in (
      select l.id from public.locations l where l.owner_auth_id = auth.uid()
    );

  if not found then
    return query select false, null::uuid, null::text, null::text;
    return;
  end if;

  if v_employee.pin_hash = crypt(p_pin, v_employee.pin_hash) then
    return query select true, v_employee.id, v_employee.name, v_employee.role;
  else
    return query select false, null::uuid, null::text, null::text;
  end if;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- requireManagerPin (backoffice): mismo verify_employee_pin pero validando
-- contra CUALQUIER admin activo del local, no un empleado puntual.
-- ─────────────────────────────────────────────────────────────
create or replace function public.verify_manager_pin(
  p_pin text
)
returns table (success boolean, employee_id uuid, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee public.employees%rowtype;
begin
  for v_employee in
    select * from public.employees e
    where e.role = 'admin'
      and e.active = true
      and e.location_id in (
        select l.id from public.locations l where l.owner_auth_id = auth.uid()
      )
  loop
    if v_employee.pin_hash = crypt(p_pin, v_employee.pin_hash) then
      return query select true, v_employee.id, v_employee.name;
      return;
    end if;
  end loop;

  return query select false, null::uuid, null::text;
end;
$$;
