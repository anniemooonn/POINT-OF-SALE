import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/useAuthStore'
import { fadeUp } from '../../../lib/motion'
import { Modal } from '../../../components/Modal'
import { Spinner } from '../../../components/Spinner'
import { isClosed, type CashSession, type ClosedCashSession } from '../../../types/cash'
import { CASH_SESSION_COLUMNS, describeCashError } from './cash'
import { CashSessionsTable } from './CashSessionsTable'
import { CloseCashForm } from './CloseCashForm'
import { CurrentSessionCard } from './CurrentSessionCard'
import { OpenCashForm } from './OpenCashForm'

/** Cuántos cortes anteriores se traen. Suficiente para un mes de operación. */
const HISTORY_LIMIT = 60

type Dialog = 'open' | 'close' | null

export function CashRegisterPage() {
  const location = useAuthStore((s) => s.location)
  const employee = useAuthStore((s) => s.activeEmployee)

  const [current, setCurrent] = useState<CashSession | null>(null)
  const [history, setHistory] = useState<ClosedCashSession[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog>(null)

  async function reload() {
    if (!location) return
    setLoading(true)

    const { data, error } = await supabase
      .from('cash_sessions')
      .select(CASH_SESSION_COLUMNS)
      .eq('location_id', location.id)
      .order('opened_at', { ascending: false })
      .limit(HISTORY_LIMIT)

    const sessions = (data ?? []) as CashSession[]
    // La caja abierta (si la hay) sale de la misma consulta: el índice único
    // garantiza que no puede haber más de una por local.
    setCurrent(sessions.find((s) => !isClosed(s)) ?? null)
    setHistory(sessions.filter(isClosed))
    setErrorMsg(error ? describeCashError(error) : null)
    setLoading(false)
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  /** Abre la caja del turno. Devuelve el mensaje de error, o `null` si se abrió. */
  async function openCash(openingFloat: number): Promise<string | null> {
    if (!location || !employee) return 'No hay un local o un empleado activo.'

    const { data, error } = await supabase
      .from('cash_sessions')
      .insert({
        location_id: location.id,
        opened_by: employee.id,
        opened_by_name: employee.name,
        opening_float: openingFloat,
      })
      .select(CASH_SESSION_COLUMNS)
      .single()

    if (error || !data) {
      return error ? describeCashError(error) : 'La base no devolvió la caja recién abierta.'
    }

    setCurrent(data as CashSession)
    setErrorMsg(null)
    setDialog(null)
    return null
  }

  /**
   * Cierra la caja abierta. El esperado y la diferencia los calcula
   * `close_cash_session` en el servidor; aquí solo se refleja el resultado.
   */
  async function closeCash(
    countedCash: number,
    notes: string,
  ): Promise<{ session?: ClosedCashSession; error?: string }> {
    if (!current) return { error: 'No hay una caja abierta que cerrar.' }
    if (!employee) return { error: 'No hay un empleado activo.' }

    const { data, error } = await supabase.rpc('close_cash_session', {
      p_session_id: current.id,
      p_counted_cash: countedCash,
      p_closed_by: employee.id,
      p_notes: notes,
    })

    if (error || !data) {
      return { error: error ? describeCashError(error) : 'La base no devolvió el corte cerrado.' }
    }

    const session = data as ClosedCashSession
    setCurrent(null)
    setHistory((prev) => [session, ...prev])
    setErrorMsg(null)
    return { session }
  }

  return (
    <div>
      <div className="mb-gutter">
        <h2 className="text-headline-lg text-on-surface">Cortes de Caja</h2>
        <p className="mt-1 text-secondary">Gestiona los cierres de turno y verifica los fondos.</p>
      </div>

      <AnimatePresence>
        {errorMsg && (
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit="exit"
            className="mb-gutter rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container"
          >
            {errorMsg}
          </motion.p>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-16 text-secondary">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="space-y-gutter">
          <CurrentSessionCard
            session={current}
            busy={dialog !== null}
            onOpen={() => setDialog('open')}
            onClose={() => setDialog('close')}
          />
          <CashSessionsTable sessions={history} />
        </div>
      )}

      <Modal open={dialog !== null} onClose={() => setDialog(null)}>
        {dialog === 'open' && (
          <OpenCashForm onSubmit={openCash} onCancel={() => setDialog(null)} />
        )}
        {dialog === 'close' && (
          <CloseCashForm
            onSubmit={closeCash}
            onDone={() => setDialog(null)}
            onCancel={() => setDialog(null)}
          />
        )}
      </Modal>
    </div>
  )
}
