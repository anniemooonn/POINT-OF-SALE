-- Ciclo de servicio completo: apertura de mesa → comanda → cocina → cuenta →
-- cobro (backlog Fase 1).
--
-- Dos tablas:
--
--   1. `orders`       → la cuenta de una mesa. Nace al sentar comensales y
--      muere al cobrarse. El índice parcial único garantiza que una mesa no
--      pueda tener dos cuentas abiertas a la vez (dos meseros en dos tablets).
--   2. `order_items`  → cada línea de la comanda, con su propio ciclo de vida
--      (pendiente → enviado → listo → servido). El estado vive en la línea y
--      no en la orden porque el KDS marca platillos sueltos, no comandas.
--
-- Los importes del cobro se congelan en la orden al pagar (subtotal, impuesto,
-- propina, total) en vez de recalcularse al leer: un ticket cobrado es un
-- documento, y editar el precio de un producto mañana no debe cambiar lo que
-- se cobró ayer. Por el mismo motivo cada línea guarda `name` y `unit_price`
-- copiados del producto en el momento de capturarla.
--
-- Las transiciones de estado de la mesa las hacen las funciones de abajo, en
-- la misma transacción que el cambio que las provoca. El cambio manual desde
-- el mapa sigue existiendo para excepciones.
--
-- Todo el archivo es idempotente: puedes pegarlo en el SQL Editor de Supabase
-- y correrlo las veces que haga falta sin romper nada.

-- ─────────────────────────────────────────────────────────────
-- 1. Cuentas (orders)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id) on delete cascade,

  -- La mesa puede borrarse del layout después de cobrar; el ticket sobrevive
  -- con el nombre copiado, que es lo que se lee en el historial.
  table_id uuid references public.restaurant_tables (id) on delete set null,
  table_name text not null,

  status text not null default 'abierta' check (status in ('abierta', 'cobrada', 'cancelada')),
  guests integer not null default 1 check (guests between 1 and 50),

  opened_by uuid references public.employees (id) on delete set null,
  opened_by_name text not null,
  opened_at timestamptz not null default now(),

  -- Cobro. Todo nulo mientras la cuenta esté abierta.
  closed_by uuid references public.employees (id) on delete set null,
  closed_by_name text,
  closed_at timestamptz,
  subtotal numeric(12, 2) check (subtotal >= 0),
  tax numeric(12, 2) check (tax >= 0),
  tip numeric(12, 2) check (tip >= 0),
  total numeric(12, 2) check (total >= 0),
  payment_method text check (payment_method in ('efectivo', 'tarjeta')),
  cash_received numeric(12, 2) check (cash_received >= 0),
  change_due numeric(12, 2) check (change_due >= 0),
  -- A qué corte de caja entró este cobro. Es el enlace de auditoría entre el
  -- ticket y el turno de dinero.
  cash_session_id uuid references public.cash_sessions (id) on delete set null,

  constraint orders_closes_after_open check (closed_at is null or closed_at >= opened_at),
  -- O la cuenta está abierta y no tiene ningún dato de cobro, o está cobrada y
  -- los tiene todos. No hay estado intermedio.
  constraint orders_payment_is_complete check (
    (status <> 'cobrada' and closed_at is null and total is null and payment_method is null)
    or (status = 'cobrada' and closed_at is not null and total is not null and payment_method is not null)
  )
);

create unique index if not exists orders_one_open_per_table
  on public.orders (table_id)
  where status = 'abierta';

create index if not exists orders_location_opened_idx
  on public.orders (location_id, opened_at desc);

alter table public.orders enable row level security;

drop policy if exists "orders_select_own_location" on public.orders;
create policy "orders_select_own_location" on public.orders
  for select using (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
  );

-- Sin insert/update/delete desde el cliente: abrir, cobrar y cancelar pasan por
-- las funciones security definer de abajo, que validan la transición completa.


-- ─────────────────────────────────────────────────────────────
-- 2. Líneas de la comanda (order_items)
--
-- `location_id` va desnormalizado para que la policy y el filtro de Realtime
-- del KDS no necesiten un join con orders en cada evento.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  location_id uuid not null references public.locations (id) on delete cascade,

  -- El producto puede borrarse del menú; el nombre y el precio copiados son
  -- los que valen para esta comanda.
  product_id uuid references public.products (id) on delete set null,
  name text not null check (btrim(name) <> ''),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  qty integer not null default 1 check (qty between 1 and 99),
  notes text,

  status text not null default 'pendiente' check (
    status in ('pendiente', 'enviado', 'listo', 'servido', 'cancelado')
  ),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  ready_at timestamptz,
  served_at timestamptz
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- El KDS lee las líneas enviadas del local ordenadas por hora de envío.
create index if not exists order_items_kds_idx
  on public.order_items (location_id, sent_at)
  where status in ('enviado', 'listo');

alter table public.order_items enable row level security;

drop policy if exists "order_items_select_own_location" on public.order_items;
create policy "order_items_select_own_location" on public.order_items
  for select using (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
  );

-- Capturar la comanda sí es un insert/update/delete directo: mientras la línea
-- está en 'pendiente' es un borrador del mesero, y pedirle una función al
-- servidor por cada toque al botón de cantidad haría la captura lenta. Las
-- policies impiden tocar lo que ya salió a cocina.
drop policy if exists "order_items_insert_own_location" on public.order_items;
create policy "order_items_insert_own_location" on public.order_items
  for insert with check (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
    and status = 'pendiente'
    and exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.location_id = order_items.location_id
        and o.status = 'abierta'
    )
  );

-- El `with check` es tan importante como el `using`: sin él, el cliente podría
-- actualizar una línea pendiente poniéndole status 'listo' y saltarse la cocina.
-- Cambiar de estado solo pasa por las funciones de abajo.
drop policy if exists "order_items_update_pending" on public.order_items;
create policy "order_items_update_pending" on public.order_items
  for update using (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
    and status = 'pendiente'
  )
  with check (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
    and status = 'pendiente'
  );

drop policy if exists "order_items_delete_pending" on public.order_items;
create policy "order_items_delete_pending" on public.order_items
  for delete using (
    location_id in (select id from public.locations where owner_auth_id = auth.uid())
    and status = 'pendiente'
  );


-- ─────────────────────────────────────────────────────────────
-- 3. Propinas en efectivo dentro del corte de caja
--
-- La propina cobrada en efectivo entra físicamente al cajón, así que tiene que
-- contar en el esperado del corte; pero no es venta y no puede ensuciar
-- `cash_sales`. Va en su propia columna y se suma al esperado.
-- ─────────────────────────────────────────────────────────────
alter table public.cash_sessions
  add column if not exists cash_tips numeric(12, 2) not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cash_sessions_cash_tips_non_negative'
  ) then
    alter table public.cash_sessions
      add constraint cash_sessions_cash_tips_non_negative check (cash_tips >= 0);
  end if;
end;
$$;

-- Se reescribe el cierre para que el esperado incluya las propinas en efectivo.
-- El resto de la función es idéntico al de la migración de cortes de caja.
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
      expected_cash = opening_float + cash_sales + cash_tips,
      notes = nullif(btrim(coalesce(p_notes, '')), '')
  where id = v_session.id
  returning * into v_session;

  return v_session;
end;
$$;


-- ─────────────────────────────────────────────────────────────
-- 4. Helpers internos
-- ─────────────────────────────────────────────────────────────

/**
 * Mueve el estado operativo de una mesa. No falla si la mesa ya no existe (una
 * cuenta puede cobrarse después de que el admin borró la mesa del layout).
 *
 * Es security definer, así que PostgREST la expone como RPC: por eso filtra por
 * el local del usuario autenticado y no solo por `table_id`. Sin ese filtro,
 * cualquiera podría mover el estado de las mesas de otro restaurante.
 */
create or replace function public.set_table_status(p_table_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_table_id is null then
    return;
  end if;

  update public.table_states ts
  set status = p_status, updated_at = now()
  where ts.table_id = p_table_id
    and ts.location_id in (
      select l.id from public.locations l where l.owner_auth_id = auth.uid()
    );
end;
$$;

/**
 * Trae la cuenta bloqueada para escritura, validando de paso que pertenezca a
 * un local del usuario autenticado. Todas las funciones de abajo arrancan igual.
 */
create or replace function public.lock_own_order(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order
  from public.orders o
  where o.id = p_order_id
    and o.location_id in (
      select l.id from public.locations l where l.owner_auth_id = auth.uid()
    )
  for update;

  if not found then
    raise exception 'Cuenta no encontrada';
  end if;

  return v_order;
end;
$$;


-- ─────────────────────────────────────────────────────────────
-- 5. Abrir mesa
--
-- Registra hora de llegada y comensales. Si la mesa ya tenía una cuenta abierta
-- (doble toque, o dos meseros a la vez) devuelve esa misma cuenta con el número
-- de comensales actualizado, en lugar de fallar: en el piso, insistir en abrir
-- una mesa ya abierta significa "corrige los comensales".
-- ─────────────────────────────────────────────────────────────
create or replace function public.open_table_order(
  p_table_id uuid,
  p_guests integer,
  p_employee_id uuid
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table public.restaurant_tables%rowtype;
  v_order public.orders%rowtype;
  v_name text;
begin
  select * into v_table
  from public.restaurant_tables t
  where t.id = p_table_id
    and t.location_id in (
      select l.id from public.locations l where l.owner_auth_id = auth.uid()
    );

  if not found then
    raise exception 'Mesa no encontrada';
  end if;

  if p_guests is null or p_guests < 1 or p_guests > 50 then
    raise exception 'El número de comensales debe estar entre 1 y 50';
  end if;

  select e.name into v_name
  from public.employees e
  where e.id = p_employee_id and e.location_id = v_table.location_id;

  if v_name is null then
    raise exception 'El empleado que abre la mesa no pertenece a este local';
  end if;

  select * into v_order
  from public.orders o
  where o.table_id = p_table_id and o.status = 'abierta'
  for update;

  if found then
    update public.orders set guests = p_guests
    where id = v_order.id
    returning * into v_order;
  else
    insert into public.orders (
      location_id, table_id, table_name, guests, opened_by, opened_by_name
    )
    values (
      v_table.location_id, v_table.id, v_table.name, p_guests, p_employee_id, v_name
    )
    returning * into v_order;
  end if;

  perform public.set_table_status(p_table_id, 'ocupada');
  return v_order;
end;
$$;


-- ─────────────────────────────────────────────────────────────
-- 6. Enviar a cocina
--
-- Sella las líneas pendientes: dejan de ser borrador (las policies ya no las
-- dejan editar) y aparecen en el KDS con su hora de envío.
-- ─────────────────────────────────────────────────────────────
create or replace function public.send_order_to_kitchen(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_sent integer;
begin
  v_order := public.lock_own_order(p_order_id);

  if v_order.status <> 'abierta' then
    raise exception 'Esta cuenta ya está cerrada';
  end if;

  update public.order_items
  set status = 'enviado', sent_at = now()
  where order_id = v_order.id and status = 'pendiente';

  get diagnostics v_sent = row_count;

  if v_sent = 0 then
    raise exception 'No hay platillos nuevos que enviar a cocina';
  end if;

  perform public.set_table_status(v_order.table_id, 'esperando');
  return v_sent;
end;
$$;


-- ─────────────────────────────────────────────────────────────
-- 7. KDS: marcar listo
--
-- Se marca por línea (el cocinero termina platillos sueltos) o la comanda
-- completa. La mesa no cambia de estado: sigue 'esperando' hasta que el mesero
-- confirme que ya la sirvió.
-- ─────────────────────────────────────────────────────────────
create or replace function public.mark_item_ready(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.order_items
  set status = 'listo', ready_at = now()
  where id = p_item_id
    and status = 'enviado'
    and location_id in (
      select l.id from public.locations l where l.owner_auth_id = auth.uid()
    );

  if not found then
    raise exception 'Este platillo ya no está en preparación';
  end if;
end;
$$;

create or replace function public.mark_order_ready(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_count integer;
begin
  v_order := public.lock_own_order(p_order_id);

  update public.order_items
  set status = 'listo', ready_at = now()
  where order_id = v_order.id and status = 'enviado';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;


-- ─────────────────────────────────────────────────────────────
-- 8. FOH: marcar servida
--
-- Solo mueve la mesa a 'servida' si ya no queda nada en cocina. Si el mesero
-- entrega una parte y el resto sigue preparándose, la mesa se queda en
-- 'esperando', que es justo lo que el resto del equipo necesita saber.
-- ─────────────────────────────────────────────────────────────
create or replace function public.mark_order_served(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_count integer;
  v_pending integer;
begin
  v_order := public.lock_own_order(p_order_id);

  if v_order.status <> 'abierta' then
    raise exception 'Esta cuenta ya está cerrada';
  end if;

  update public.order_items
  set status = 'servido', served_at = now()
  where order_id = v_order.id and status = 'listo';

  get diagnostics v_count = row_count;

  select count(*) into v_pending
  from public.order_items
  where order_id = v_order.id and status in ('pendiente', 'enviado');

  if v_pending = 0 then
    perform public.set_table_status(v_order.table_id, 'servida');
  end if;

  return v_count;
end;
$$;


-- ─────────────────────────────────────────────────────────────
-- 9. Cobrar
--
-- El cálculo va del lado del servidor por los mismos motivos que el corte de
-- caja: los importes se congelan en la misma transacción en que se cierra la
-- cuenta y se suma el efectivo al turno, así que no hay ventana para que un
-- producto capturado a destiempo cambie el total ya cobrado.
--
-- El impuesto sale de `location_settings`. Si los precios del menú ya lo traen
-- dentro, el impuesto se desglosa hacia atrás y el total es el subtotal; si no,
-- se suma encima. La propina siempre va por fuera del impuesto.
-- ─────────────────────────────────────────────────────────────
create or replace function public.pay_order(
  p_order_id uuid,
  p_payment_method text,
  p_tip numeric,
  p_cash_received numeric,
  p_employee_id uuid
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_name text;
  v_subtotal numeric(12, 2);
  v_tax numeric(12, 2);
  v_sale numeric(12, 2);
  v_tip numeric(12, 2);
  v_total numeric(12, 2);
  v_change numeric(12, 2);
  v_rate numeric;
  v_included boolean;
  v_session_id uuid;
  v_open_items integer;
begin
  v_order := public.lock_own_order(p_order_id);

  if v_order.status <> 'abierta' then
    raise exception 'Esta cuenta ya fue cobrada';
  end if;

  if p_payment_method not in ('efectivo', 'tarjeta') then
    raise exception 'Método de pago no válido';
  end if;

  select e.name into v_name
  from public.employees e
  where e.id = p_employee_id and e.location_id = v_order.location_id;

  if v_name is null then
    raise exception 'El empleado que cobra no pertenece a este local';
  end if;

  select count(*) into v_open_items
  from public.order_items
  where order_id = v_order.id and status = 'pendiente';

  if v_open_items > 0 then
    raise exception 'Hay platillos capturados que nunca se enviaron a cocina. Envíalos o quítalos antes de cobrar';
  end if;

  select coalesce(sum(qty * unit_price), 0) into v_subtotal
  from public.order_items
  where order_id = v_order.id and status <> 'cancelado';

  if v_subtotal <= 0 then
    raise exception 'No se puede cobrar una cuenta vacía';
  end if;

  select s.tax_rate, s.prices_include_tax into v_rate, v_included
  from public.location_settings s
  where s.location_id = v_order.location_id;

  v_rate := coalesce(v_rate, 16);
  v_included := coalesce(v_included, true);

  if v_included then
    v_tax := round(v_subtotal - (v_subtotal / (1 + v_rate / 100)), 2);
    v_sale := v_subtotal;
  else
    v_tax := round(v_subtotal * v_rate / 100, 2);
    v_sale := v_subtotal + v_tax;
  end if;

  v_tip := round(coalesce(p_tip, 0), 2);
  if v_tip < 0 then
    raise exception 'La propina no puede ser negativa';
  end if;

  v_total := v_sale + v_tip;

  -- El efectivo tiene que caer en una caja abierta: si no, el corte del turno
  -- nunca cuadraría contra el dinero que sí entró al cajón.
  select id into v_session_id
  from public.cash_sessions
  where location_id = v_order.location_id and closed_at is null
  for update;

  if p_payment_method = 'efectivo' then
    if v_session_id is null then
      raise exception 'No hay una caja abierta. Ábrela en Backoffice → Cortes de caja antes de cobrar en efectivo';
    end if;

    if p_cash_received is null or p_cash_received < v_total then
      raise exception 'El efectivo recibido no alcanza para cubrir el total';
    end if;

    v_change := round(p_cash_received - v_total, 2);

    update public.cash_sessions
    set cash_sales = cash_sales + v_sale,
        cash_tips = cash_tips + v_tip
    where id = v_session_id;
  else
    v_change := null;
  end if;

  update public.orders
  set status = 'cobrada',
      closed_at = now(),
      closed_by = p_employee_id,
      closed_by_name = v_name,
      subtotal = v_subtotal,
      tax = v_tax,
      tip = v_tip,
      total = v_total,
      payment_method = p_payment_method,
      cash_received = case when p_payment_method = 'efectivo' then p_cash_received else null end,
      change_due = v_change,
      cash_session_id = v_session_id
  where id = v_order.id
  returning * into v_order;

  perform public.set_table_status(v_order.table_id, 'sucia');
  return v_order;
end;
$$;


-- ─────────────────────────────────────────────────────────────
-- 10. Cancelar una cuenta sin cobrar
--
-- Para la mesa que se levanta sin consumir. No borra: deja el rastro con lo que
-- se hubiera capturado, que es lo que un dueño quiere poder revisar.
-- ─────────────────────────────────────────────────────────────
create or replace function public.cancel_order(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  v_order := public.lock_own_order(p_order_id);

  if v_order.status <> 'abierta' then
    raise exception 'Esta cuenta ya está cerrada';
  end if;

  update public.order_items
  set status = 'cancelado'
  where order_id = v_order.id and status <> 'cancelado';

  update public.orders set status = 'cancelada'
  where id = v_order.id
  returning * into v_order;

  perform public.set_table_status(v_order.table_id, 'sucia');
  return v_order;
end;
$$;


-- ─────────────────────────────────────────────────────────────
-- 11. Realtime: el KDS y el mapa escuchan las líneas y las cuentas
-- ─────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'order_items'
  ) then
    alter publication supabase_realtime add table public.order_items;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end;
$$;
