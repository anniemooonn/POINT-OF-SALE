import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence } from 'framer-motion'
import { AppHeader } from '../../components/AppHeader'
import { Spinner } from '../../components/Spinner'
import { supabase } from '../../lib/supabase'
import { useNow } from '../../lib/useNow'
import { useAuthStore } from '../../stores/useAuthStore'
import { MISSING_MIGRATION_MSG } from '../../stores/useOrdersStore'
import { groupIntoTickets, type KdsLine, type KdsTicketGroup } from './kds'
import { KdsTicketCard } from './KdsTicketCard'

/** Respuesta del select anidado: la mesa viene de la cuenta. */
interface KdsRow {
  id: string
  order_id: string
  name: string
  qty: number
  notes: string | null
  status: KdsLine['status']
  sent_at: string
  order: { table_name: string; guests: number } | null
}

/**
 * Pantalla de cocina. Muestra los envíos pendientes ordenados por hora, con lo
 * que lleva más tiempo esperando arriba. El KDS no sabe de dinero ni de mesas
 * libres: su única pregunta es qué falta por salir.
 *
 * El reloj corre cada 15 segundos (y no cada 30 como en FOH) porque aquí el
 * cronómetro es la información principal de la pantalla.
 */
export function KdsPage() {
  const locationId = useAuthStore((s) => s.location?.id)

  const [lines, setLines] = useState<KdsLine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const now = useNow(15_000)

  const load = useCallback(async () => {
    if (!locationId) return

    const { data, error: queryError } = await supabase
      .from('order_items')
      .select('id, order_id, name, qty, notes, status, sent_at, order:orders(table_name, guests)')
      .eq('location_id', locationId)
      .in('status', ['enviado', 'listo'])
      .order('sent_at')

    if (queryError) {
      setError(
        queryError.code === 'PGRST205' || queryError.code === '42P01'
          ? MISSING_MIGRATION_MSG
          : queryError.message,
      )
      setLoading(false)
      return
    }

    const rows = (data ?? []) as unknown as KdsRow[]
    setLines(
      rows
        // Sin cuenta o sin hora de envío no hay nada que cocinar: es una fila
        // a medio escribir que no debe romper la pantalla.
        .filter((row): row is KdsRow & { sent_at: string } => Boolean(row.sent_at && row.order))
        .map((row) => ({
          id: row.id,
          order_id: row.order_id,
          name: row.name,
          qty: row.qty,
          notes: row.notes,
          status: row.status,
          sent_at: row.sent_at,
          table_name: row.order?.table_name ?? 'Mesa',
          guests: row.order?.guests ?? 0,
        })),
    )
    setError(null)
    setLoading(false)
  }, [locationId])

  useEffect(() => {
    if (!locationId) return
    void load()

    // Enviar una comanda de seis platillos son seis eventos seguidos: se
    // recarga una sola vez al final de la ráfaga.
    let timer: ReturnType<typeof setTimeout> | null = null
    const reload = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => void load(), 150)
    }

    const channel = supabase
      .channel(`kds-${locationId}`)
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
      .subscribe()

    return () => {
      if (timer) clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [locationId, load])

  const tickets = useMemo(() => groupIntoTickets(lines), [lines])
  const cooking = tickets.filter((t) => !t.allReady)
  const ready = tickets.filter((t) => t.allReady)

  async function markLineReady(line: KdsLine) {
    setBusy(true)
    // Optimista: el cocinero ve el tachado en el momento del toque.
    setLines((prev) => prev.map((l) => (l.id === line.id ? { ...l, status: 'listo' } : l)))
    const { error: rpcError } = await supabase.rpc('mark_item_ready', { p_item_id: line.id })
    setBusy(false)
    if (rpcError) {
      setError(rpcError.message)
      void load()
    }
  }

  async function markTicketReady(ticket: KdsTicketGroup) {
    setBusy(true)
    const ids = new Set(ticket.lines.map((l) => l.id))
    setLines((prev) => prev.map((l) => (ids.has(l.id) ? { ...l, status: 'listo' } : l)))
    const { error: rpcError } = await supabase.rpc('mark_order_ready', {
      p_order_id: ticket.orderId,
    })
    setBusy(false)
    if (rpcError) {
      setError(rpcError.message)
      void load()
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-slate-900">
      <AppHeader title="Cocina (KDS)" />

      <div className="flex-1 space-y-6 p-4">
        {error && (
          <p className="rounded-lg bg-red-950 px-4 py-3 text-sm text-red-200">{error}</p>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center text-slate-500">
            <Spinner className="h-8 w-8" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-slate-500">
            <span className="material-symbols-outlined text-[48px]">skillet</span>
            <p>No hay comandas en cocina.</p>
          </div>
        ) : (
          <>
            <Section
              title="En preparación"
              count={cooking.length}
              empty="Todo lo enviado ya está listo."
            >
              {cooking.map((ticket) => (
                <KdsTicketCard
                  key={ticket.key}
                  ticket={ticket}
                  now={now}
                  busy={busy}
                  onLineReady={(line) => void markLineReady(line)}
                  onTicketReady={(t) => void markTicketReady(t)}
                />
              ))}
            </Section>

            {ready.length > 0 && (
              <Section title="Listos para recoger" count={ready.length}>
                {ready.map((ticket) => (
                  <KdsTicketCard
                    key={ticket.key}
                    ticket={ticket}
                    now={now}
                    busy={busy}
                    onLineReady={(line) => void markLineReady(line)}
                    onTicketReady={(t) => void markTicketReady(t)}
                  />
                ))}
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string
  count: number
  empty?: string
  children: ReactNode
}) {
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 font-label text-label-caps uppercase text-slate-400">
        {title}
        <span className="rounded-full bg-slate-700 px-2 py-0.5 text-slate-200">{count}</span>
      </h2>
      {count === 0 && empty ? (
        <p className="text-sm text-slate-500">{empty}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">{children}</AnimatePresence>
        </div>
      )}
    </section>
  )
}
