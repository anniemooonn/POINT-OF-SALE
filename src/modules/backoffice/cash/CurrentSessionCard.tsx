import { motion } from 'framer-motion'
import { formatMoney, formatTime } from '../../../lib/format'
import type { CashSession } from '../../../types/cash'

interface CurrentSessionCardProps {
  /** Caja abierta ahora mismo, o `null` si el local no tiene ninguna. */
  session: CashSession | null
  busy: boolean
  onOpen: () => void
  onClose: () => void
}

export function CurrentSessionCard({ session, busy, onOpen, onClose }: CurrentSessionCardProps) {
  const open = session !== null

  return (
    <section className="flex flex-col items-start justify-between gap-gutter rounded-xl border border-surface-variant bg-surface-container-lowest p-gutter shadow-sm md:flex-row md:items-center">
      <div className="flex items-center gap-gutter">
        <div
          className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full ${
            open ? 'bg-primary-container text-on-primary-container' : 'bg-surface-variant text-tertiary'
          }`}
        >
          <span className="material-symbols-outlined text-[32px]">
            {open ? 'point_of_sale' : 'lock'}
          </span>
        </div>

        <div>
          <p className="mb-1 font-label text-label-caps text-secondary uppercase">
            {open ? 'Turno actual en curso' : 'Caja cerrada'}
          </p>

          {session ? (
            <>
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-headline-md text-on-surface">Fondo inicial:</span>
                <span className="text-display tabular-nums text-primary">
                  {formatMoney(session.opening_float)}
                </span>
              </div>
              <p className="mt-1 text-body-md text-secondary">
                Abrió {session.opened_by_name} a las {formatTime(session.opened_at)}
                <span className="mx-2 text-tertiary-fixed-dim">·</span>
                Ventas en efectivo: {formatMoney(session.cash_sales)}
              </p>
            </>
          ) : (
            <p className="text-body-lg text-on-surface">
              No hay una caja abierta. Declara el fondo inicial para empezar el turno.
            </p>
          )}
        </div>
      </div>

      <motion.button
        type="button"
        onClick={open ? onClose : onOpen}
        disabled={busy}
        whileHover={busy ? undefined : { scale: 1.03 }}
        whileTap={busy ? undefined : { scale: 0.96 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="flex h-touch-target-min shrink-0 items-center gap-2 rounded-lg bg-primary px-8 text-button text-on-primary shadow-[0_4px_20px_rgba(0,0,0,0.04)] disabled:opacity-50"
      >
        <span className="material-symbols-outlined">{open ? 'lock' : 'lock_open'}</span>
        {open ? 'Cerrar caja' : 'Abrir caja'}
      </motion.button>
    </section>
  )
}
