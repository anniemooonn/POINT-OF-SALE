/**
 * Comanda y cuenta de una mesa. El ciclo de vida real vive en las líneas
 * (`OrderItem.status`), no en la orden: el KDS marca platillos sueltos, así que
 * una comanda puede tener a la vez algo listo y algo todavía en preparación.
 */

export type OrderStatus = 'abierta' | 'cobrada' | 'cancelada'

export const ORDER_ITEM_STATUSES = [
  'pendiente',
  'enviado',
  'listo',
  'servido',
  'cancelado',
] as const

export type OrderItemStatus = (typeof ORDER_ITEM_STATUSES)[number]

export type PaymentMethod = 'efectivo' | 'tarjeta'

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  /** Copia del nombre del producto al capturar: el menú puede cambiar después. */
  name: string
  unit_price: number
  qty: number
  notes: string | null
  status: OrderItemStatus
  created_at: string
  sent_at: string | null
  ready_at: string | null
  served_at: string | null
}

export interface Order {
  id: string
  table_id: string | null
  table_name: string
  status: OrderStatus
  guests: number
  opened_by_name: string
  opened_at: string
  closed_by_name: string | null
  closed_at: string | null
  subtotal: number | null
  tax: number | null
  tip: number | null
  total: number | null
  payment_method: PaymentMethod | null
  cash_received: number | null
  change_due: number | null
}

/** Una cuenta con sus líneas, que es como la usa toda la UI. */
export interface OrderWithItems extends Order {
  items: OrderItem[]
}

interface ItemStatusMeta {
  label: string
  icon: string
  chip: string
}

export const ITEM_STATUS_META: Record<OrderItemStatus, ItemStatusMeta> = {
  pendiente: {
    label: 'Sin enviar',
    icon: 'edit_note',
    chip: 'bg-blue-100 text-blue-800',
  },
  enviado: {
    label: 'En cocina',
    icon: 'hourglass_top',
    chip: 'bg-amber-100 text-amber-800',
  },
  listo: {
    label: 'Listo',
    icon: 'room_service',
    chip: 'bg-teal-100 text-teal-800',
  },
  servido: {
    label: 'Servido',
    icon: 'check_circle',
    chip: 'bg-slate-100 text-slate-600',
  },
  cancelado: {
    label: 'Cancelado',
    icon: 'cancel',
    chip: 'bg-slate-100 text-slate-400 line-through',
  },
}

/** Las líneas que suman a la cuenta: todo menos lo cancelado. */
export function billableItems(items: OrderItem[]): OrderItem[] {
  return items.filter((i) => i.status !== 'cancelado')
}

export function orderSubtotal(items: OrderItem[]): number {
  return billableItems(items).reduce((sum, i) => sum + i.qty * i.unit_price, 0)
}

/**
 * Desglose de la cuenta tal como lo calcula `pay_order` en el servidor. Se
 * repite aquí para poder mostrar el total antes de cobrar; el importe que se
 * guarda siempre es el que devuelve la base.
 */
export interface BillBreakdown {
  subtotal: number
  tax: number
  /** Subtotal + impuesto, sin propina. Es la venta. */
  sale: number
  tip: number
  total: number
}

export function computeBill(
  items: OrderItem[],
  taxRate: number,
  pricesIncludeTax: boolean,
  tip = 0,
): BillBreakdown {
  const subtotal = round2(orderSubtotal(items))
  const tax = pricesIncludeTax
    ? round2(subtotal - subtotal / (1 + taxRate / 100))
    : round2((subtotal * taxRate) / 100)
  const sale = pricesIncludeTax ? subtotal : round2(subtotal + tax)
  const safeTip = round2(Math.max(0, tip))
  return { subtotal, tax, sale, tip: safeTip, total: round2(sale + safeTip) }
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** Porcentajes sugeridos en el cobro; el mesero siempre puede escribir otro. */
export const TIP_PRESETS = [0, 10, 15, 20] as const
