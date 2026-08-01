import { useState, type FormEvent } from 'react'
import { supabase } from '../../../lib/supabase'
import { ToggleSwitch } from '../../../components/ToggleSwitch'
import { useSettingsStore } from '../../../stores/useSettingsStore'
import type { Product } from '../../../types/menu'
import { PhotoField } from './PhotoField'

interface ProductFormProps {
  locationId: string
  product?: Product | null
  defaultCategory: string
  onSaved: () => void
  onCancel: () => void
}

export function ProductForm({ locationId, product, defaultCategory, onSaved, onCancel }: ProductFormProps) {
  const isEditing = Boolean(product)
  const categories = useSettingsStore((s) => s.categories)

  const [name, setName] = useState(product?.name ?? '')
  const [category, setCategory] = useState(product?.category ?? defaultCategory)

  // Solo se ofrecen las categorías visibles, más la del producto que se está
  // editando aunque esté oculta: guardar no debe reasignarlo por su cuenta.
  const options = categories.filter((c) => c.active).map((c) => c.name)
  if (category && !options.includes(category)) options.unshift(category)
  const [price, setPrice] = useState(product ? String(product.price) : '')
  const [cost, setCost] = useState(product?.cost != null ? String(product.cost) : '')
  const [inStock, setInStock] = useState(product?.in_stock ?? true)
  const [photoUrl, setPhotoUrl] = useState(product?.photo_url ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!category) {
      setError('Crea una categoría en Configuración → Menú antes de agregar productos')
      return
    }
    const priceValue = Number(price)
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      setError('El precio debe ser un número válido')
      return
    }
    // El costo es opcional: vacío significa "sin capturar", no cero.
    const trimmedCost = cost.trim()
    const costValue = trimmedCost === '' ? null : Number(trimmedCost)
    if (costValue !== null && (!Number.isFinite(costValue) || costValue < 0)) {
      setError('El costo debe ser un número válido')
      return
    }
    setLoading(true)

    const payload = {
      name,
      category,
      price: priceValue,
      cost: costValue,
      in_stock: inStock,
      photo_url: photoUrl.trim() || null,
    }

    const { error } = product
      ? await supabase.from('products').update(payload).eq('id', product.id)
      : await supabase.from('products').insert({ ...payload, location_id: locationId })

    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    onSaved()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-4 rounded-2xl border border-surface-variant bg-surface-container-lowest p-8 shadow-[0px_12px_32px_rgba(0,0,0,0.08)]"
    >
      <div>
        <h2 className="text-headline-md text-on-surface">
          {isEditing ? 'Editar producto' : 'Nuevo producto'}
        </h2>
        <p className="text-body-md text-secondary">
          {isEditing ? 'Actualiza los datos del producto.' : 'Agrega un platillo o bebida al menú.'}
        </p>
      </div>

      <label className="block">
        <span className="mb-1 block font-label text-label-caps text-secondary uppercase">Nombre</span>
        <input required value={name} onChange={(e) => setName(e.target.value)} className="input" />
      </label>

      <label className="block">
        <span className="mb-1 block font-label text-label-caps text-secondary uppercase">Categoría</span>
        <select
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="input"
        >
          {options.length === 0 && <option value="">Sin categorías</option>}
          {options.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {options.length === 0 && (
          <span className="mt-1 block text-body-md text-secondary">
            Crea al menos una categoría en Configuración → Menú.
          </span>
        )}
      </label>

      <div className="grid grid-cols-2 gap-4">
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

        <label className="block">
          <span className="mb-1 block font-label text-label-caps text-secondary uppercase">
            Costo (opcional)
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            className="input"
            placeholder="0.00"
          />
        </label>
      </div>

      <PhotoField locationId={locationId} value={photoUrl} onChange={setPhotoUrl} />

      <div className="flex items-center justify-between rounded-lg border border-surface-variant px-4 py-3">
        <div>
          <p className="text-body-md text-on-surface">Disponible</p>
          <p className="text-body-md text-secondary">Desactívalo si el producto está agotado hoy.</p>
        </div>
        <ToggleSwitch checked={inStock} onChange={setInStock} label="Producto disponible" />
      </div>

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
          {loading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear producto'}
        </button>
      </div>
    </form>
  )
}
