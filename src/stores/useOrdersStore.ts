import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Product } from '../types/menu'
import type { Order, OrderItem, OrderWithItems, PaymentMethod } from '../types/orders'

// En una sola línea a propósito: supabase-js infiere el tipo de la respuesta
// leyendo esta cadena, y una concatenación le deja un `string` sin analizar.
const ORDER_COLUMNS =
  'id, table_id, table_name, status, guests, opened_by_name, opened_at, closed_by_name, closed_at, subtotal, tax, tip, total, payment_method, cash_received, change_due'
const ITEM_COLUMNS =
  'id, order_id, product_id, name, unit_price, qty, notes, status, created_at, sent_at, ready_at, served_at'

export const MISSING_MIGRATION_MSG =
  'Las tablas de comandas todavía no existen en Supabase. Corre la migración ' +
  'supabase/migrations/20260802150000_orders_and_payments.sql en el SQL Editor.'

interface SupabaseError {
  code?: string
  message: string
}

function isMissingTable(error: SupabaseError | null): boolean {
  return error?.code === 'PGRST205' || error?.code === '42P01'
}

/**
 * Los mensajes de las funciones de Postgres ya están escritos para el mesero
 * ("No hay una caja abierta...", "El efectivo recibido no alcanza..."), así que
 * se muestran tal cual; solo se traduce lo que llegaría en jerga de base.
 */
function describeError(error: SupabaseError): string {
  if (isMissingTable(error)) return MISSING_MIGRATION_MSG
  if (error.code === '23505') {
    return 'Otro dispositivo abrió esta mesa primero. Recarga la pantalla para ver la cuenta real.'
  }
  return error.message
}

interface Result {
  error: string | null
}

interface OrdersState {
  locationId: string | null
  /** Cuentas abiertas del local, indexadas por mesa. */
  byTable: Record<string, OrderWithItems>
  loading: boolean
  missingMigration: boolean

  load: (locationId: string) => Promise<void>
  /** Vuelve a leer una sola cuenta; se usa después de cada RPC. */
  refreshOrder: (orderId: string) => Promise<void>
  orderForTable: (tableId: string) => OrderWithItems | null

  openTable: (
    tableId: string,
    guests: number,
    employeeId: string,
  ) => Promise<Result & { orderId?: string }>
  addItem: (orderId: string, product: Product) => Promise<Result>
  setItemQty: (orderId: string, itemId: string, qty: number) => Promise<Result>
  setItemNotes: (orderId: string, itemId: string, notes: string) => Promise<Result>
  removeItem: (orderId: string, itemId: string) => Promise<Result>
  sendToKitchen: (orderId: string) => Promise<Result>
  markServed: (orderId: string) => Promise<Result & { served?: number }>
  payOrder: (params: {
    orderId: string
    method: PaymentMethod
    tip: number
    cashReceived: number | null
    employeeId: string
  }) => Promise<Result & { order?: Order }>
  cancelOrder: (orderId: string) => Promise<Result>

  /** Realtime sobre cuentas y líneas del local; devuelve la limpieza. */
  subscribe: () => () => void
}

/** Respuesta del select anidado: las líneas llegan como `items`. */
interface OrderRow extends Order {
  items: OrderItem[] | null
}

function indexByTable(rows: OrderRow[]): Record<string, OrderWithItems> {
  const map: Record<string, OrderWithItems> = {}
  for (const row of rows) {
    if (!row.table_id) continue
    map[row.table_id] = { ...row, items: sortItems(row.items ?? []) }
  }
  return map
}

/** Orden de captura: es como el mesero recuerda haber levantado el pedido. */
function sortItems(items: OrderItem[]): OrderItem[] {
  return [...items].sort((a, b) => a.created_at.localeCompare(b.created_at))
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  locationId: null,
  byTable: {},
  loading: true,
  missingMigration: false,

  load: async (locationId) => {
    set({ loading: true, locationId })

    const { data, error } = await supabase
      .from('orders')
      .select(`${ORDER_COLUMNS}, items:order_items(${ITEM_COLUMNS})`)
      .eq('location_id', locationId)
      .eq('status', 'abierta')

    set({
      byTable: indexByTable((data ?? []) as OrderRow[]),
      loading: false,
      missingMigration: isMissingTable(error),
    })
  },

  refreshOrder: async (orderId) => {
    const { data } = await supabase
      .from('orders')
      .select(`${ORDER_COLUMNS}, items:order_items(${ITEM_COLUMNS})`)
      .eq('id', orderId)
      .maybeSingle()

    const row = data as OrderRow | null
    if (!row?.table_id) return

    const byTable = { ...get().byTable }
    if (row.status === 'abierta') {
      byTable[row.table_id] = { ...row, items: sortItems(row.items ?? []) }
    } else {
      // Cobrada o cancelada: deja de ser una cuenta viva y sale del mapa.
      delete byTable[row.table_id]
    }
    set({ byTable })
  },

  orderForTable: (tableId) => get().byTable[tableId] ?? null,

  openTable: async (tableId, guests, employeeId) => {
    const { data, error } = await supabase.rpc('open_table_order', {
      p_table_id: tableId,
      p_guests: guests,
      p_employee_id: employeeId,
    })

    if (error || !data) {
      return { error: error ? describeError(error) : 'No se pudo abrir la mesa' }
    }

    const order = data as Order
    await get().refreshOrder(order.id)
    return { error: null, orderId: order.id }
  },

  addItem: async (orderId, product) => {
    const { locationId } = get()
    if (!locationId) return { error: 'No hay un local activo' }

    // Si el producto ya está capturado y sin enviar ni notas, se sube la
    // cantidad en vez de crear otra línea: es lo que espera quien toca dos
    // veces el mismo platillo.
    const order = findOrder(get().byTable, orderId)
    const existing = order?.items.find(
      (i) => i.product_id === product.id && i.status === 'pendiente' && !i.notes,
    )
    if (existing) {
      return get().setItemQty(orderId, existing.id, existing.qty + 1)
    }

    const { error } = await supabase.from('order_items').insert({
      order_id: orderId,
      location_id: locationId,
      product_id: product.id,
      name: product.name,
      unit_price: product.price,
      qty: 1,
    })

    if (error) return { error: describeError(error) }

    await get().refreshOrder(orderId)
    return { error: null }
  },

  setItemQty: async (orderId, itemId, qty) => {
    if (qty < 1) return get().removeItem(orderId, itemId)
    if (qty > 99) return { error: 'Cantidad máxima por línea: 99' }

    const restore = patchItem(set, get, orderId, itemId, { qty })

    const { error } = await supabase.from('order_items').update({ qty }).eq('id', itemId)
    if (error) {
      restore()
      return { error: describeError(error) }
    }
    return { error: null }
  },

  setItemNotes: async (orderId, itemId, notes) => {
    const trimmed = notes.trim()
    const value = trimmed === '' ? null : trimmed
    const restore = patchItem(set, get, orderId, itemId, { notes: value })

    const { error } = await supabase.from('order_items').update({ notes: value }).eq('id', itemId)
    if (error) {
      restore()
      return { error: describeError(error) }
    }
    return { error: null }
  },

  removeItem: async (orderId, itemId) => {
    const previous = get().byTable
    const order = findOrder(previous, orderId)
    if (order?.table_id) {
      set({
        byTable: {
          ...previous,
          [order.table_id]: { ...order, items: order.items.filter((i) => i.id !== itemId) },
        },
      })
    }

    const { error } = await supabase.from('order_items').delete().eq('id', itemId)
    if (error) {
      set({ byTable: previous })
      return { error: describeError(error) }
    }
    return { error: null }
  },

  sendToKitchen: async (orderId) => {
    const { error } = await supabase.rpc('send_order_to_kitchen', { p_order_id: orderId })
    if (error) return { error: describeError(error) }

    await get().refreshOrder(orderId)
    return { error: null }
  },

  markServed: async (orderId) => {
    const { data, error } = await supabase.rpc('mark_order_served', { p_order_id: orderId })
    if (error) return { error: describeError(error) }

    await get().refreshOrder(orderId)
    return { error: null, served: (data as number | null) ?? 0 }
  },

  payOrder: async ({ orderId, method, tip, cashReceived, employeeId }) => {
    const { data, error } = await supabase.rpc('pay_order', {
      p_order_id: orderId,
      p_payment_method: method,
      p_tip: tip,
      p_cash_received: cashReceived,
      p_employee_id: employeeId,
    })

    if (error || !data) {
      return { error: error ? describeError(error) : 'La base no devolvió el ticket cobrado' }
    }

    const order = data as Order
    // La cuenta ya no está abierta: se saca del mapa sin releerla.
    const byTable = { ...get().byTable }
    if (order.table_id) delete byTable[order.table_id]
    set({ byTable })

    return { error: null, order }
  },

  cancelOrder: async (orderId) => {
    const { error } = await supabase.rpc('cancel_order', { p_order_id: orderId })
    if (error) return { error: describeError(error) }

    const byTable = { ...get().byTable }
    const order = findOrder(byTable, orderId)
    if (order?.table_id) delete byTable[order.table_id]
    set({ byTable })
    return { error: null }
  },

  subscribe: () => {
    const { locationId } = get()
    if (!locationId) return () => {}

    // Los eventos llegan en ráfaga (enviar una comanda de seis platillos son
    // seis updates), así que se recargan las cuentas una sola vez al final en
    // lugar de una por evento.
    let timer: ReturnType<typeof setTimeout> | null = null
    const reload = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        const current = get().locationId
        if (current) void get().load(current)
      }, 150)
    }

    const channel = supabase
      .channel(`orders-${locationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items',
          filter: `location_id=eq.${locationId}`,
        },
        reload,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `location_id=eq.${locationId}`,
        },
        reload,
      )
      .subscribe()

    return () => {
      if (timer) clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  },
}))

function findOrder(
  byTable: Record<string, OrderWithItems>,
  orderId: string,
): OrderWithItems | null {
  return Object.values(byTable).find((o) => o.id === orderId) ?? null
}

/**
 * Aplica un cambio optimista sobre una línea y devuelve la función que deshace
 * el cambio si Supabase lo rechaza. Los toques de cantidad tienen que verse
 * inmediatos: el mesero está capturando frente al comensal.
 */
function patchItem(
  set: (partial: Partial<OrdersState>) => void,
  get: () => OrdersState,
  orderId: string,
  itemId: string,
  patch: Partial<OrderItem>,
): () => void {
  const previous = get().byTable
  const order = findOrder(previous, orderId)
  if (!order?.table_id) return () => {}

  set({
    byTable: {
      ...previous,
      [order.table_id]: {
        ...order,
        items: order.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
      },
    },
  })

  return () => set({ byTable: previous })
}
