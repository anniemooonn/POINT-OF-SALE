-- Archivado de productos (paquete "pulir menú").
--
-- La 0009 queda reservada para el esquema de órdenes (equipo de meseros);
-- el hueco en la numeración es intencional.
--
-- `archived_at` sustituye al borrado duro como camino normal: un producto
-- archivado desaparece del menú y de la venta pero conserva su fila, para
-- que las órdenes históricas que lo referencien (cuando existan) no se
-- rompan. El borrado definitivo sigue disponible solo desde la vista de
-- archivados, pensado para productos que nunca se vendieron.
--
-- Idempotente: puede correrse varias veces sin romper nada.

alter table public.products
  add column if not exists archived_at timestamptz;

create index if not exists products_location_archived_idx
  on public.products (location_id, archived_at);
