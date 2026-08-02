import { useState, type FormEvent } from 'react'
import type { OrderItem } from '../../../types/orders'

interface NoteDialogProps {
  item: OrderItem
  onSubmit: (notes: string) => Promise<string | null>
  onCancel: () => void
}

/**
 * Atajos de nota más frecuentes del piso. Son sugerencias, no un catálogo: los
 * modificadores de verdad (término, extras, obligatorios) son de Fase 2.
 */
const QUICK_NOTES = ['Sin cebolla', 'Sin picante', 'Término medio', 'Para llevar', 'Sin hielo']

export function NoteDialog({ item, onSubmit, onCancel }: NoteDialogProps) {
  const [notes, setNotes] = useState(item.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function addQuickNote(text: string) {
    setNotes((current) => (current.trim() === '' ? text : `${current.trim()}, ${text}`))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    const message = await onSubmit(notes)
    setSaving(false)
    if (message) setError(message)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full space-y-4 rounded-2xl border border-surface-variant bg-surface-container-lowest p-6 shadow-[0px_12px_32px_rgba(0,0,0,0.08)]"
    >
      <div>
        <h2 className="text-headline-md text-on-surface">Nota para cocina</h2>
        <p className="text-body-md text-secondary">{item.name}</p>
      </div>

      <textarea
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        rows={3}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Ej. sin cebolla, término medio"
        className="input resize-none"
      />

      <div className="flex flex-wrap gap-2">
        {QUICK_NOTES.map((text) => (
          <button
            key={text}
            type="button"
            onClick={() => addQuickNote(text)}
            className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
          >
            + {text}
          </button>
        ))}
      </div>

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
          {saving ? 'Guardando...' : 'Guardar nota'}
        </button>
      </div>
    </form>
  )
}
