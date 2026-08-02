-- Cortes de caja: una fila por sesión de caja (turno de dinero), desde que se
-- declara el fondo inicial hasta que se cuenta el efectivo al cerrar.
--
-- Una caja abierta es la que tiene `closed_at` nulo. El índice parcial único de
-- abajo garantiza que un local no pueda tener dos cajas abiertas a la vez (dos
-- dispositivos abriendo turno al mismo tiempo, por ejemplo).
--
-- El nombre de quien abre y de quien cierra se guarda además del id: el
-- historial es un documento de auditoría y debe seguir diciendo quién hizo el
-- corte aunque después se dé de baja al empleado.
--
-- Todo el archivo es idempotente: puedes pegarlo en el SQL Editor de Supabase
-- y correrlo las veces que haga falta sin romper nada.

create table if not exists public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,

  opened_by uuid references public.employees (id) on delete set null,
  opened_by_name text not null,
  opened_at timestamptz not null default now(),
  opening_float numeric(12, 2) not null check (opening_float >= 0),

  -- Efectivo cobrado durante el turno. Hoy siempre es 0: lo irá sumando el
  -- módulo de cobro cuando exista. El esperado del corte sale de aquí, así que
  -- el día que se conecte el cobro esta pantalla no cambia.
  cash_sales numeric(12, 2) not null default 0 check (cash_sales >= 0),

  closed_by uuid references public.employees (id) on delete set null,
  closed_by_name text,
  closed_at timestamptz,
  -- Lo que debería haber en el cajón. Se congela al cerrar (no se recalcula al
  -- leer) para que el corte sea auditable aunque después cambie algo.
  expected_cash numeric(12, 2),
  counted_cash numeric(12, 2) check (counted_cash >= 0),
  difference numeric(12, 2) generated always as (counted_cash - expected_cash) stored,
  notes text,

  constraint cash_sessions_closes_after_open check (closed_at is null or closed_at >= opened_at),
  -- O la caja está abierta y no tiene ningún dato de cierre, o está cerrada y
  -- los tiene todos. No hay estado intermedio.
  constraint cash_sessions_close_is_complete check (
    (closed_at is null and counted_cash is null and expected_cash is null and closed_by_name is null)
    or (closed_at is not null and counted_cash is not null and expected_cash is not null and closed_by_name is not null)
  )
);

create index if not exists cash_sessions_location_opened_idx
  on public.cash_sessions (location_id, opened_at desc);

create unique index if not exists cash_sessions_one_open_per_location
  on public.cash_sessions (location_id)
  where closed_at is null;

alter table public.cash_sessions enable row level security;

drop policy if exists "cash_sessions_select_own_location" on public.cash_sessions;
create policy "cash_sessions_select_own_location" on public.cash_sessions
  for select using (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
  );

-- El insert además exige que el empleado que abre pertenezca a ese mismo local.
drop policy if exists "cash_sessions_insert_own_location" on public.cash_sessions;
create policy "cash_sessions_insert_own_location" on public.cash_sessions
  for insert with check (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
    and (
      opened_by is null
      or exists (
        select 1 from public.employees e
        where e.id = cash_sessions.opened_by
          and e.location_id = cash_sessions.location_id
      )
    )
  );

-- Sin policy de update ni de delete: un corte cerrado no se edita ni se borra,
-- que es justamente lo que lo hace servir como auditoría. El cierre pasa por
-- `close_cash_session`, que es security definer.


-- ─────────────────────────────────────────────────────────────
-- Cerrar la caja (corte ciego)
--
-- Va del lado del servidor por dos motivos:
--   1. El esperado se calcula aquí dentro, en la misma transacción que el
--      cierre. Si lo mandara el cliente, una venta cobrada mientras el cajero
--      contaba el efectivo dejaría un esperado viejo guardado como definitivo.
--   2. Deja cerrar solo lo que está abierto, sin exponer un update general de
--      la tabla que también permitiría reescribir cortes ya firmados.
-- ─────────────────────────────────────────────────────────────
create or replace function public.close_cash_session(
  p_session_id uuid,
  p_counted_cash numeric,
  p_closed_by uuid,
  p_notes text default null
)
returns public.cash_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.cash_sessions%rowtype;
  v_name text;
begin
  if p_counted_cash is null or p_counted_cash < 0 then
    raise exception 'El efectivo contado no puede ser negativo';
  end if;

  select * into v_session
  from public.cash_sessions s
  where s.id = p_session_id
    and s.location_id in (
      select l.id from public.locations l where l.owner_auth_id = auth.uid()
    )
  for update;

  if not found then
    raise exception 'Corte de caja no encontrado';
  end if;

  if v_session.closed_at is not null then
    raise exception 'Esta caja ya fue cerrada';
  end if;

  select e.name into v_name
  from public.employees e
  where e.id = p_closed_by
    and e.location_id = v_session.location_id;

  if v_name is null then
    raise exception 'El empleado que cierra la caja no pertenece a este local';
  end if;

  update public.cash_sessions
  set closed_at = now(),
      closed_by = p_closed_by,
      closed_by_name = v_name,
      counted_cash = p_counted_cash,
      expected_cash = opening_float + cash_sales,
      notes = nullif(btrim(coalesce(p_notes, '')), '')
  where id = v_session.id
  returning * into v_session;

  return v_session;
end;
$$;
