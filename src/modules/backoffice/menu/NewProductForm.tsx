import { useState, type FormEvent } from 'react'
import { supabase } from '../../../lib/supabase'
import { MENU_CATEGORIES, type MenuCategory } from '../../../types/menu'

interface NewProductFormProps {
  locationId: string
  defaultCategory: MenuCategory
  onCreated: () => void
  onCancel: () => void
}

export function NewProductForm({ locationId, defaultCategory, onCreated, onCancel }: NewProductFormProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<MenuCategory>(defaultCategory)
  const [price, setPrice] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const priceValue = Number(price)
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      setError('El precio debe ser un número válido')
      return
    }
    setLoading(true)
    const { error } = await supabase.from('products').insert({
      location_id: locationId,
      name,
      category,
      price: priceValue,
      photo_url: photoUrl.trim() || null,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    onCreated()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-4 rounded-2xl border border-surface-variant bg-surface-container-lowest p-8 shadow-[0px_12px_32px_rgba(0,0,0,0.08)]"
    >
      <div>
        <h2 className="text-headline-md text-on-surface">Nuevo producto</h2>
        <p className="text-body-md text-secondary">Agrega un platillo o bebida al menú.</p>
      </div>

      <label className="block">
        <span className="mb-1 block font-label text-label-caps text-secondary uppercase">Nombre</span>
        <input required value={name} onChange={(e) => setName(e.target.value)} className="input" />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="mb-1 block font-label text-label-caps text-secondary uppercase">Categoría</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as MenuCategory)}
            className="input"
          >
            {MENU_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block font-label text-label-caps text-secondary uppercase">Precio</span>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="input"
            placeholder="0.00"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block font-label text-label-caps text-secondary uppercase">
          Foto (URL, opcional)
        </span>
        <input
          type="url"
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          className="input"
          placeholder="https://..."
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
          disabled={loading}
          className="rounded-lg bg-primary px-6 py-2 text-button text-on-primary shadow-sm transition-transform active:scale-95 disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Crear producto'}
        </button>
      </div>
    </form>
  )
}
