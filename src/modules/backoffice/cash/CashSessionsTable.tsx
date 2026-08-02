import { AnimatePresence, motion } from 'framer-motion'
import { formatDayTime, formatMoney } from '../../../lib/format'
import { listContainer, rowItem } from '../../../lib/motion'
import type { ClosedCashSession } from '../../../types/cash'
import { describeDifference } from './cash'

interface CashSessionsTableProps {
  sessions: ClosedCashSession[]
}

export function CashSessionsTable({ sessions }: CashSessionsTableProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest shadow-[0px_12px_32px_rgba(0,0,0,0.04)]">
      <div className="border-b border-surface-variant bg-surface-container-high px-gutter py-4">
        <h3 className="text-headline-md text-on-surface">Historial de cortes</h3>
      </div>

      {sessions.length === 0 ? (
        <p className="px-gutter py-12 text-center text-secondary">
          Todavía no hay cortes cerrados. El primero aparecerá aquí en cuanto cierres la caja.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-surface-variant bg-surface-container-low font-label text-label-caps text-secondary uppercase">
                <th scope="col" className="px-gutter py-4">
                  Fecha / Hora
                </th>
                <th scope="col" className="px-gutter py-4">
                  Usuario
                </th>
                <th scope="col" className="px-gutter py-4 text-right">
                  Esperado
                </th>
                <th scope="col" className="px-gutter py-4 text-right">
                  Contado
                </th>
                <th scope="col" className="px-gutter py-4 text-right">
                  Diferencia
                </th>
              </tr>
            </thead>
            <motion.tbody variants={listContainer} initial="hidden" animate="show">
              <AnimatePresence initial={false}>
                {sessions.map((session) => {
                  const tone = describeDifference(session.difference)
                  return (
                    <motion.tr
                      key={session.id}
                      variants={rowItem}
                      exit="exit"
                      className="border-b border-surface-variant transition-colors last:border-b-0 hover:bg-surface-container-low"
                    >
                      <td className="px-gutter py-4 whitespace-nowrap">
                        <div className="text-button text-on-surface">
                          {formatDayTime(session.closed_at)}
                        </div>
                        <div className="text-body-md text-secondary">
                          Abrió {formatDayTime(session.opened_at)}
                        </div>
                      </td>

                      <td className="px-gutter py-4">
                        <div className="flex items-center gap-2 text-on-surface">
                          <span className="material-symbols-outlined text-[20px] text-secondary">
                            person
                          </span>
                          {session.closed_by_name}
                        </div>
                        {session.notes && (
                          // El título completo va en `title`: las notas de un
                          // corte suelen ser largas y no deben ensanchar la tabla.
                          <p
                            title={session.notes}
                            className="mt-1 max-w-60 truncate text-body-md text-secondary"
                          >
                            {session.notes}
                          </p>
                        )}
                      </td>

                      <td className="px-gutter py-4 text-right text-button tabular-nums text-on-surface">
                        {formatMoney(session.expected_cash)}
                      </td>
                      <td className="px-gutter py-4 text-right text-button tabular-nums text-on-surface">
                        {formatMoney(session.counted_cash)}
                      </td>
                      <td className="px-gutter py-4 text-right">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-label text-label-caps tabular-nums ${tone.chip}`}
                        >
                          <span className="material-symbols-outlined text-base">{tone.icon}</span>
                          {tone.amount}
                        </span>
                      </td>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            </motion.tbody>
          </table>
        </div>
      )}
    </section>
  )
}
