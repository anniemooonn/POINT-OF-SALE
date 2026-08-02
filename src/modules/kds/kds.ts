import type { OrderItemStatus } from '../../types/orders'

/** Línea tal como la lee el KDS: sin precios, con la mesa a la que pertenece. */
export interface KdsLine {
  id: string
  order_id: string
  name: string
  qty: number
  notes: string | null
  status: OrderItemStatus
  sent_at: string
  table_name: string
  guests: number
}

/**
 * Una comanda del KDS es un ENVÍO, no una cuenta: si la mesa 4 pide entradas y
 * veinte minutos después los fuertes, cocina ve dos tarjetas separadas. Es la
 * única agrupación que respeta el orden real de trabajo.
 */
export interface KdsTicketGroup {
  key: string
  orderId: string
  tableName: string
  guests: number
  sentAt: string
  lines: KdsLine[]
  /** true cuando ya no queda nada por preparar en este envío. */
  allReady: boolean
}

export function groupIntoTickets(lines: KdsLine[]): KdsTicketGroup[] {
  const groups = new Map<string, KdsTicketGroup>()

  for (const line of lines) {
    const key = `${line.order_id}|${line.sent_at}`
    const group = groups.get(key)
    if (group) {
      group.lines.push(line)
    } else {
      groups.set(key, {
        key,
        orderId: line.order_id,
        tableName: line.table_name,
        guests: line.guests,
        sentAt: line.sent_at,
        lines: [line],
        allReady: false,
      })
    }
  }

  const tickets = [...groups.values()]
  for (const ticket of tickets) {
    ticket.allReady = ticket.lines.every((l) => l.status === 'listo')
  }

  // Lo que lleva más tiempo esperando va primero: es el orden en el que cocina
  // tiene que trabajar, y el que evita que una mesa se quede olvidada.
  return tickets.sort((a, b) => a.sentAt.localeCompare(b.sentAt))
}

/**
 * Urgencia por tiempo de espera. Los cortes son deliberadamente generosos: el
 * timer configurable por platillo es de Fase 2, esto solo evita que una comanda
 * vieja se pierda entre las nuevas.
 */
export function ticketUrgency(sentAt: string, now: number): 'normal' | 'atencion' | 'urgente' {
  const minutes = (now - new Date(sentAt).getTime()) / 60000
  if (minutes >= 20) return 'urgente'
  if (minutes >= 12) return 'atencion'
  return 'normal'
}
