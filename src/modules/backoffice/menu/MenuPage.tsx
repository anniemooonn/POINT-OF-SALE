import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/useAuthStore'
import { Modal } from '../../../components/Modal'
import { ToggleSwitch } from '../../../components/ToggleSwitch'
import { MENU_CATEGORIES, type MenuCategory, type Product } from '../../../types/menu'
import { NewProductForm } from './NewProductForm'

export function MenuPage() {
  const location = useAuthStore((s) => s.location)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<MenuCategory>(MENU_CATEGORIES[0])
  const [formOpen, setFormOpen] = useState(false)

  async function reload() {
    if (!location) return
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('id, name, category, price, photo_url, active')
      .eq('location_id', location.id)
      .order('name')
    setProducts(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  async function toggleActive(product: Product) {
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, active: !p.active } : p)),
    )
    await supabase.from('products').update({ active: !product.active }).eq('id', product.id)
  }

  const visibleProducts = products.filter((p) => p.category === activeCategory)

  return (
    <div>
      <div className="mb-gutter flex items-end justify-between">
        <div>
          <h2 className="text-headline-lg text-on-surface">Gestión de Menú</h2>
          <p className="mt-1 text-secondary">Administra los productos disponibles para la venta.</p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex min-h-12 items-center gap-2 rounded-lg bg-primary px-6 py-3 text-button text-on-primary shadow-sm transition-transform active:scale-95"
        >
          <span className="material-symbols-outlined">add</span>
          Nuevo producto
        </button>
      </div>

      <div className="mb-margin-page flex space-x-2 overflow-x-auto border-b border-outline-variant pb-1">
        {MENU_CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`shrink-0 border-b-2 px-6 py-3 text-button whitespace-nowrap transition-colors ${
              activeCategory === category
                ? 'border-primary text-primary'
                : 'border-transparent text-secondary hover:bg-surface-container-lowest hover:text-primary'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {loading && <p className="text-secondary">Cargando menú...</p>}

      {!loading && visibleProducts.length === 0 && (
        <p className="text-secondary">Aún no hay productos en "{activeCategory}".</p>
      )}

      <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleProducts.map((product) => (
          <div
            key={product.id}
            className={`group flex flex-col overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.04)] transition-shadow duration-200 ${
              product.active ? 'hover:shadow-[0px_12px_32px_rgba(0,0,0,0.08)]' : 'opacity-75'
            }`}
          >
            <div className={`h-48 w-full bg-surface-container-high ${product.active ? '' : 'grayscale'}`}>
              {product.photo_url ? (
                <img src={product.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-4xl">restaurant</span>
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col p-4">
              <h3
                className={`mb-1 text-body-lg font-bold ${product.active ? 'text-on-surface' : 'text-tertiary'}`}
              >
                {product.name}
              </h3>
              <p className="mb-4 font-label text-label-caps text-secondary uppercase tracking-wider">
                {product.category}
              </p>
              <div className="mt-auto flex items-center justify-between border-t border-surface-variant pt-4">
                <span
                  className={`text-headline-md ${product.active ? 'text-primary' : 'text-tertiary'}`}
                >
                  ${product.price.toFixed(2)}
                </span>
                <ToggleSwitch
                  checked={product.active}
                  onChange={() => toggleActive(product)}
                  label={`Activar ${product.name}`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)}>
        {location && (
          <NewProductForm
            locationId={location.id}
            defaultCategory={activeCategory}
            onCancel={() => setFormOpen(false)}
            onCreated={() => {
              setFormOpen(false)
              reload()
            }}
          />
        )}
      </Modal>
    </div>
  )
}
