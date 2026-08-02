import { useState, type FormEvent } from 'react'
import type { TableRow } from '../../../types/tables'

interface OpenTableDialogProps {
  table: TableRow
  /** Comensales de una cuenta ya abierta; en mesa nueva arranca en la capacidad. */
  initialGuests?: number
  /** Devuelve el mensaje de error, o `null` si la mesa quedó abierta. */
  onSubmit: (guests: number) => Promise<string | null>
  onCancel: () => void
}

const MAX_GUESTS = 50

/**
 * Apertura de mesa: lo único que se captura es cuántos comensales llegaron. La
 * hora de llegada la pone el servidor, y el mesero no tiene por qué escribirla.
 *
 * El stepper es de botones grandes y no un input numérico porque esto se toca
 * en una tablet, de pie y con una mano ocupada.
 */
export function OpenTableDialog({
  table,
  initialGuests,
  onSubmit,
  onCancel,
}: OpenTableDialogProps) {
  const [guests, setGuests] = useState(initialGuests ?? table.capacity)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const editing = initialGuests !== undefined

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const message = await onSubmit(guests)
    setSaving(false)
    if (message) setError(message)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full space-y-5 rounded-2xl border border-surface-variant bg-surface-container-lowest p-8 shadow-[0px_12px_32px_rgba(0,0,0,0.08)]"
    >
      <div>
        <h2 className="text-headline-md text-on-surface">
          {editing ? `Comensales en ${table.name}` : `Abrir ${table.name}`}
        </h2>
        <p className="text-body-md text-secondary">
          {editing
            ? 'Corrige cuánta gente hay en la mesa.'
            : `Capacidad ${table.capacity}. ¿Cuántos comensales se sentaron?`}
        </p>
      </div>

      <div className="flex items-center justify-center gap-6">
        <StepperButton
          icon="remove"
          label="Un comensal menos"
          disabled={guests <= 1}
          onClick={() => setGuests((g) => Math.max(1, g - 1))}
        />
        <div className="text-center">
          <span className="block text-display tabular-nums text-primary">{guests}</span>
          <span className="font-label text-label-caps text-secondary uppercase">
            {guests === 1 ? 'comensal' : 'comensales'}
          </span>
        </div>
        <StepperButton
          icon="add"
          label="Un comensal más"
          disabled={guests >= MAX_GUESTS}
          onClick={() => setGuests((g) => Math.min(MAX_GUESTS, g + 1))}
        />
      </div>

      {guests > table.capacity && (
        <p className="rounded-lg bg-surface-container px-4 py-2 text-body-md text-secondary">
          Son más comensales que la capacidad de la mesa ({table.capacity}). Se puede abrir igual.
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-error-container px-4 py-2 text-body-md text-on-error-container">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
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
          {saving ? 'Abriendo...' : editing ? 'Guardar' : 'Abrir mesa'}
        </button>
      </div>
    </form>
  )
}

function StepperButton({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: string
  label: string
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-touch-target-min w-touch-target-min items-center justify-center rounded-full border-2 border-surface-variant text-on-surface transition-transform active:scale-90 disabled:opacity-30"
    >
      <span className="material-symbols-outlined text-[32px]">{icon}</span>
    </button>
  )
}
