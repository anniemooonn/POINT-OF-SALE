import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { formatMoney } from '../../../lib/format'
import type { ClosedCashSession } from '../../../types/cash'
import { describeDifference, parseAmount } from './cash'
import { MoneyField } from './MoneyField'

interface CloseCashFormProps {
  /** Devuelve el corte ya cerrado, o el mensaje de error si no se pudo. */
  onSubmit: (
    countedCash: number,
    notes: string,
  ) => Promise<{ session?: ClosedCashSession; error?: string }>
  onDone: () => void
  onCancel: () => void
}

/**
 * Corte ciego: la pantalla nunca muestra el efectivo esperado antes de
 * capturar. Quien cierra cuenta el cajón a mano y escribe el total; recién
 * después de guardar aparece la comparación. Enseñar el esperado antes invita
 * a "cuadrar" la captura y el corte deja de servir como control.
 */
export function CloseCashForm({ onSubmit, onDone, onCancel }: CloseCashFormProps) {
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<ClosedCashSession | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const value = parseAmount(amount)
    if (value === null) {
      setError('Captura el efectivo contado como un importe válido (0 o más).')
      return
    }

    setError(null)
    setSaving(true)
    const outcome = await onSubmit(value, notes)
    setSaving(false)

    if (outcome.error || !outcome.session) {
      setError(outcome.error ?? 'No se pudo cerrar la caja.')
      return
    }
    setResult(outcome.session)
  }

  if (result) {
    const tone = describeDifference(result.difference)
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-full space-y-4 rounded-2xl border border-surface-variant bg-surface-container-lowest p-8 shadow-[0px_12px_32px_rgba(0,0,0,0.08)]"
      >
        <div>
          <h2 className="text-headline-md text-on-surface">Caja cerrada</h2>
          <p className="text-body-md text-secondary">
            El corte quedó registrado en el historial y ya no puede editarse.
          </p>
        </div>

        <dl className="space-y-2 rounded-lg bg-surface-container-low px-4 py-3">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-body-md text-secondary">Esperado</dt>
            <dd className="text-body-lg tabular-nums text-on-surface">
              {formatMoney(result.expected_cash)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-body-md text-secondary">Contado</dt>
            <dd className="text-body-lg tabular-nums text-on-surface">
              {formatMoney(result.counted_cash)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 border-t border-surface-variant pt-2">
            <dt className="text-body-md text-secondary">{tone.label}</dt>
            <dd>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 font-label text-label-caps tabular-nums ${tone.chip}`}
              >
                <span className="material-symbols-outlined text-base">{tone.icon}</span>
                {tone.amount}
              </span>
            </dd>
          </div>
        </dl>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg bg-primary px-6 py-2 text-button text-on-primary shadow-sm transition-transform active:scale-95"
          >
            Listo
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full space-y-4 rounded-2xl border border-surface-variant bg-surface-container-lowest p-8 shadow-[0px_12px_32px_rgba(0,0,0,0.08)]"
    >
      <div>
        <h2 className="text-headline-md text-on-surface">Cerrar caja</h2>
        <p className="text-body-md text-secondary">
          Cuenta el efectivo del cajón y captura el total. El monto esperado se muestra hasta
          después de guardar.
        </p>
      </div>

      <MoneyField label="Efectivo contado" value={amount} onChange={setAmount} autoFocus />

      <label className="block">
        <span className="mb-1 block font-label text-label-caps text-secondary uppercase">
          Notas (opcional)
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="input resize-none"
          placeholder="Se pagó al proveedor de pan, se rompió un billete…"
        />
      </label>

      {error && (
        <p className="rounded-lg bg-error-container px-4 py-2 text-body-md text-on-error-container">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-button text-secondary hover:bg-surface-container-high"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary px-6 py-2 text-button text-on-primary shadow-sm transition-transform active:scale-95 disabled:opacity-50"
        >
          {saving ? 'Cerrando...' : 'Cerrar caja'}
        </button>
      </div>
    </form>
  )
}
