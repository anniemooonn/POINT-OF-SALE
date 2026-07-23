-- Fix: "function gen_salt(unknown) does not exist" / "function crypt(...) does not exist"
-- pgcrypto vive en el esquema "extensions" en Supabase, pero las funciones
-- SECURITY DEFINER fijan search_path = public, así que crypt()/gen_salt()
-- sin calificar no se resuelven. Se referencian explícitamente como
-- extensions.crypt(...) / extensions.gen_salt(...).

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
    select 1 from public.locations loc
    where loc.id = p_location_id and loc.owner_auth_id = auth.uid()
  ) then
    raise exception 'No autorizado para crear empleados en este local';
  end if;

  insert into public.employees (location_id, name, role, pin_hash)
  values (p_location_id, p_name, p_role, extensions.crypt(p_pin, extensions.gen_salt('bf')))
  returning * into v_employee;

  return query select v_employee.id, v_employee.name, v_employee.role, v_employee.active;
end;
$$;

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

  if v_employee.pin_hash = extensions.crypt(p_pin, v_employee.pin_hash) then
    return query select true, v_employee.id, v_employee.name, v_employee.role;
  else
    return query select false, null::uuid, null::text, null::text;
  end if;
end;
$$;

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
    if v_employee.pin_hash = extensions.crypt(p_pin, v_employee.pin_hash) then
      return query select true, v_employee.id, v_employee.name;
      return;
    end if;
  end loop;

  return query select false, null::uuid, null::text;
end;
$$;
