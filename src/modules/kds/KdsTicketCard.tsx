import { motion } from 'framer-motion'
import { formatElapsed, formatTime } from '../../lib/format'
import { ticketUrgency, type KdsLine, type KdsTicketGroup } from './kds'

interface KdsTicketCardProps {
  ticket: KdsTicketGroup
  now: number
  busy: boolean
  onLineReady: (line: KdsLine) => void
  onTicketReady: (ticket: KdsTicketGroup) => void
}

const URGENCY_STYLES = {
  normal: { border: 'border-slate-700', header: 'bg-slate-700', timer: 'text-slate-100' },
  atencion: { border: 'border-amber-500', header: 'bg-amber-600', timer: 'text-white' },
  urgente: { border: 'border-red-500', header: 'bg-red-600', timer: 'text-white' },
} as const

/**
 * Tarjeta de comanda. Está pensada para leerse de pie, a un metro de distancia
 * y con las manos ocupadas: fondo oscuro, texto grande, y un solo botón grande
 * por línea. Nada de menús ni acciones escondidas.
 */
export function KdsTicketCard({
  ticket,
  now,
  busy,
  onLineReady,
  onTicketReady,
}: KdsTicketCardProps) {
  const urgency = ticket.allReady ? 'normal' : ticketUrgency(ticket.sentAt, now)
  const style = URGENCY_STYLES[urgency]

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col overflow-hidden rounded-xl border-2 bg-slate-800 shadow-lg ${
        ticket.allReady ? 'border-teal-500' : style.border
      }`}
    >
      <header
        className={`flex items-baseline justify-between px-3 py-2 ${
          ticket.allReady ? 'bg-teal-600' : style.header
        }`}
      >
        <div>
          <h3 className="text-lg font-bold leading-tight text-white">{ticket.tableName}</h3>
          <p className="text-xs text-white/70">
            {ticket.guests} pax · {formatTime(ticket.sentAt)}
          </p>
        </div>
        <span className={`text-xl font-bold tabular-nums ${style.timer}`}>
          {formatElapsed(ticket.sentAt, now)}
        </span>
      </header>

      <ul className="flex-1 divide-y divide-slate-700">
        {ticket.lines.map((line) => {
          const ready = line.status === 'listo'
          return (
            <li key={line.id} className="flex items-start gap-2 p-3">
              <span className="min-w-8 text-xl font-bold tabular-nums text-white">{line.qty}×</span>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-base font-semibold leading-tight ${
                    ready ? 'text-slate-400 line-through' : 'text-white'
                  }`}
                >
                  {line.name}
                </p>
                {line.notes && (
                  <p className="mt-1 flex items-start gap-1 text-sm font-medium text-amber-300">
                    <span className="material-symbols-outlined text-[16px]">priority_high</span>
                    {line.notes}
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={busy || ready}
                onClick={() => onLineReady(line)}
                aria-label={`Marcar ${line.name} como listo`}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-transform active:scale-90 ${
                  ready
                    ? 'bg-teal-700/40 text-teal-300'
                    : 'bg-slate-700 text-white hover:bg-teal-600 disabled:opacity-40'
                }`}
              >
                <span className="material-symbols-outlined">{ready ? 'check' : 'done'}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {ticket.allReady ? (
        <p className="flex items-center justify-center gap-2 bg-teal-700/30 px-3 py-2.5 text-sm font-semibold text-teal-200">
          <span className="material-symbols-outlined text-[18px]">room_service</span>
          Listo — esperando al mesero
        </p>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => onTicketReady(ticket)}
          className="bg-slate-700 px-3 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-600 disabled:opacity-40"
        >
          Comanda completa lista
        </button>
      )}
    </motion.article>
  )
}
