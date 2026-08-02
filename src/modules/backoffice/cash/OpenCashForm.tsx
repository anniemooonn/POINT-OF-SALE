import { useState, type FormEvent } from 'react'
import { parseAmount } from '../../../lib/format'
import { MoneyField } from './MoneyField'

interface OpenCashFormProps {
  /** Devuelve el mensaje de error, o `null` si la caja quedó abierta. */
  onSubmit: (openingFloat: number) => Promise<string | null>
  onCancel: () => void
}

export function OpenCashForm({ onSubmit, onCancel }: OpenCashFormProps) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const value = parseAmount(amount)
    if (value === null) {
      setError('Captura el fondo inicial como un importe válido (0 o más).')
      return
    }

    setError(null)
    setSaving(true)
    const message = await onSubmit(value)
    setSaving(false)
    if (message) setError(message)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full space-y-4 rounded-2xl border border-surface-variant bg-surface-container-lowest p-8 shadow-[0px_12px_32px_rgba(0,0,0,0.08)]"
    >
      <div>
        <h2 className="text-headline-md text-on-surface">Abrir caja</h2>
        <p className="text-body-md text-secondary">
          Cuenta el efectivo con el que arranca el turno y declara el fondo inicial.
        </p>
      </div>

      <MoneyField
        label="Fondo inicial"
        hint="Es contra este monto —más las ventas en efectivo— que se comparará el corte."
        value={amount}
        onChange={setAmount}
        autoFocus
      />

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
          {saving ? 'Abriendo...' : 'Abrir caja'}
        </button>
      </div>
    </form>
  )
}
