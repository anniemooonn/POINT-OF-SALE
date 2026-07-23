-- Fix: "column reference \"id\" is ambiguous" en create_employee.
-- RETURNS TABLE (id uuid, ...) crea una variable "id" en el scope de la
-- función; la referencia sin calificar a locations.id chocaba con ella.

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
  values (p_location_id, p_name, p_role, crypt(p_pin, gen_salt('bf')))
  returning * into v_employee;

  return query select v_employee.id, v_employee.name, v_employee.role, v_employee.active;
end;
$$;
