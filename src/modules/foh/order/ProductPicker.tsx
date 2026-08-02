import { useMemo, useState } from 'react'
import { formatMoney } from '../../../lib/format'
import { ALL_CATEGORIES, type Product } from '../../../types/menu'

interface ProductPickerProps {
  products: Product[]
  /** Cuántas unidades de cada producto lleva ya la comanda, para el badge. */
  countsByProduct: Record<string, number>
  onPick: (product: Product) => void
}

/**
 * Catálogo de captura. Solo entra lo que se puede vender: producto activo y con
 * existencia. Un platillo agotado no debe poder capturarse aunque el mesero lo
 * recuerde de memoria — es el poka-yoke más barato del flujo.
 */
export function ProductPicker({ products, countsByProduct, onPick }: ProductPickerProps) {
  const [category, setCategory] = useState<string>(ALL_CATEGORIES)
  const [search, setSearch] = useState('')

  const sellable = useMemo(
    () => products.filter((p) => p.active && p.in_stock),
    [products],
  )

  const categories = useMemo(() => {
    const names = [...new Set(sellable.map((p) => p.category))].sort((a, b) =>
      a.localeCompare(b),
    )
    return [ALL_CATEGORIES, ...names]
  }, [sellable])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return sellable
      .filter((p) => category === ALL_CATEGORIES || p.category === category)
      .filter((p) => term === '' || p.name.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [sellable, category, search])

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="relative">
        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          search
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar platillo"
          className="input h-12 pl-11"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((name) => {
          const active = category === name
          return (
            <button
              key={name}
              type="button"
              onClick={() => setCategory(name)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                active
                  ? 'bg-primary text-on-primary'
                  : 'border border-slate-300 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {name}
            </button>
          )
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            {sellable.length === 0
              ? 'No hay productos disponibles. Revísalo en Backoffice → Menú.'
              : 'Ningún platillo coincide con la búsqueda.'}
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {visible.map((product) => {
              const count = countsByProduct[product.id] ?? 0
              return (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => onPick(product)}
                    className="relative flex h-full w-full flex-col items-start gap-1 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-transform active:scale-95 hover:border-primary/40"
                  >
                    {count > 0 && (
                      <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-on-primary">
                        {count}
                      </span>
                    )}
                    <span className="pr-8 text-sm font-semibold leading-tight text-slate-900">
                      {product.name}
                    </span>
                    <span className="mt-auto text-sm tabular-nums text-slate-500">
                      {formatMoney(product.price)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
