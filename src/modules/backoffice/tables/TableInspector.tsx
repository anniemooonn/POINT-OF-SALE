import { useEffect, useState } from 'react'
import type { TableRow, TableShape } from '../../../types/tables'

interface TableInspectorProps {
  table: TableRow
  onSave: (patch: {
    name: string
    capacity: number
    shape: TableShape
    width: number
    height: number
  }) => Promise<{ error: string | null }>
  onDelete: () => void
  onClose: () => void
}

/** Panel lateral para editar la mesa seleccionada en el editor de layout. */
export function TableInspector({ table, onSave, onDelete, onClose }: TableInspectorProps) {
  const [name, setName] = useState(table.name)
  const [capacity, setCapacity] = useState(String(table.capacity))
  const [shape, setShape] = useState<TableShape>(table.shape)
  const [width, setWidth] = useState(String(Math.round(table.width)))
  const [height, setHeight] = useState(String(Math.round(table.height)))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(table.name)
    setCapacity(String(table.capacity))
    setShape(table.shape)
    setWidth(String(Math.round(table.width)))
    setHeight(String(Math.round(table.height)))
    setError(null)
  }, [table])

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) return setError('El nombre no puede quedar vacío')

    const cap = Number(capacity)
    if (!Number.isInteger(cap) || cap < 1 || cap > 50)
      return setError('La capacidad debe ser un entero entre 1 y 50')

    const w = Number(width)
    const h = Number(height)
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 40 || h < 40 || w > 400 || h > 400)
      return setError('El tamaño debe estar entre 40 y 400 unidades')

    setSaving(true)
    setError(null)
    const result = await onSave({ name: trimmed, capacity: cap, shape, width: w, height: h })
    setSaving(false)
    if (result.error) setError(result.error)
  }

  return (
    <aside className="w-72 shrink-0 space-y-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <h3 className="text-headline-md text-on-surface">{table.name}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar panel"
          className="rounded-full p-1 text-secondary hover:bg-surface-container-high"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
            close
          </span>
        </button>
      </div>

      <label className="block space-y-1">
        <span className="font-label text-label-caps text-secondary">Nombre</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <label className="block space-y-1">
        <span className="font-label text-label-caps text-secondary">Comensales</span>
        <input
          className="input"
          type="number"
          min={1}
          max={50}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />
      </label>

      <label className="block space-y-1">
        <span className="font-label text-label-caps text-secondary">Forma</span>
        <select
          className="input"
          value={shape}
          onChange={(e) => setShape(e.target.value as TableShape)}
        >
          <option value="rect">Rectangular</option>
          <option value="circle">Redonda</option>
        </select>
      </label>

      <div className="flex gap-3">
        <label className="block flex-1 space-y-1">
          <span className="font-label text-label-caps text-secondary">Ancho</span>
          <input
            className="input"
            type="number"
            min={40}
            max={400}
            value={width}
            onChange={(e) => setWidth(e.target.value)}
          />
        </label>
        <label className="block flex-1 space-y-1">
          <span className="font-label text-label-caps text-secondary">Alto</span>
          <input
            className="input"
            type="number"
            min={40}
            max={400}
            value={height}
            onChange={(e) => setHeight(e.target.value)}
          />
        </label>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-lg bg-primary px-4 py-2 text-button text-on-primary shadow-sm disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="w-full rounded-lg border border-error/40 px-4 py-2 text-button text-error hover:bg-error-container/40"
        >
          Eliminar mesa
        </button>
      </div>
    </aside>
  )
}
