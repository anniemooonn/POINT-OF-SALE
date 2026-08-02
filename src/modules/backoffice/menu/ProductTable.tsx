import { AnimatePresence, motion } from 'framer-motion'
import { ToggleSwitch } from '../../../components/ToggleSwitch'
import { formatMoney } from '../../../lib/format'
import { rowItem } from '../../../lib/motion'
import type { Product } from '../../../types/menu'
import { EditableCell } from './EditableCell'

interface ProductTableProps {
  products: Product[]
  /** Categorías visibles para el select inline de la columna Categoría. */
  categoryOptions: string[]
  /** true cuando la tabla muestra archivados: cambian las acciones por fila. */
  archivedView: boolean
  onUpdate: (id: string, patch: Partial<Product>) => void
  onEdit: (product: Product) => void
  onDuplicate: (product: Product) => void
  onArchive: (product: Product) => void
  onRestore: (product: Product) => void
  onDelete: (product: Product) => void
}

/** Devuelve el número si el texto es un monto válido (>= 0), o `undefined` si no lo es. */
function parseAmount(raw: string): number | undefined {
  const value = Number(raw)
  if (raw === '' || !Number.isFinite(value) || value < 0) return undefined
  return value
}

export function ProductTable({
  products,
  categoryOptions,
  archivedView,
  onUpdate,
  onEdit,
  onDuplicate,
  onArchive,
  onRestore,
  onDelete,
}: ProductTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-surface-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
      <table className="w-full min-w-[1000px] border-collapse text-left">
        <thead>
          <tr className="border-b border-surface-variant bg-surface-container-high">
            <th scope="col" className="w-16 px-4 py-3">
              <span className="sr-only">Foto</span>
            </th>
            <th scope="col" className="px-4 py-3 font-label text-label-caps text-secondary uppercase">
              Nombre
            </th>
            <th scope="col" className="w-40 px-4 py-3 font-label text-label-caps text-secondary uppercase">
              Categoría
            </th>
            <th scope="col" className="w-32 px-4 py-3 text-right font-label text-label-caps text-secondary uppercase">
              Precio
            </th>
            <th scope="col" className="w-32 px-4 py-3 text-right font-label text-label-caps text-secondary uppercase">
              Costo
            </th>
            <th scope="col" className="w-32 px-4 py-3 text-right font-label text-label-caps text-secondary uppercase">
              Margen
            </th>
            <th scope="col" className="w-56 px-4 py-3 font-label text-label-caps text-secondary uppercase">
              Estado
            </th>
            <th scope="col" className="w-24 px-4 py-3 text-right font-label text-label-caps text-secondary uppercase">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence initial={false}>
            {products.map((product) => (
              <motion.tr
                key={product.id}
                layout
                variants={rowItem}
                initial="hidden"
                animate="show"
                exit="exit"
                className={`border-b border-surface-variant last:border-b-0 transition-colors hover:bg-surface-container-low ${
                  product.active ? '' : 'opacity-60'
                }`}
              >
                <td className="px-4 py-2">
                  {product.photo_url ? (
                    <img
                      src={product.photo_url}
                      alt=""
                      className={`h-10 w-10 rounded-lg object-cover ${product.active ? '' : 'grayscale'}`}
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-high text-secondary">
                      <span className="material-symbols-outlined text-lg">restaurant</span>
                    </div>
                  )}
                </td>

                <td className="px-2 py-2">
                  <EditableCell
                    value={product.name}
                    display={product.name}
                    ariaLabel="Nombre"
                    onCommit={(raw) => {
                      if (!raw) return
                      onUpdate(product.id, { name: raw })
                    }}
                  />
                </td>

                <td className="px-4 py-2">
                  <select
                    value={product.category}
                    onChange={(e) => onUpdate(product.id, { category: e.target.value })}
                    aria-label={`Categoría de ${product.name}`}
                    className="w-full cursor-pointer rounded-md border border-transparent bg-transparent px-1 py-1.5 text-body-md text-secondary transition-colors hover:border-surface-variant hover:bg-surface-container-low"
                  >
                    {/* La del producto siempre está en la lista, aunque esté oculta:
                        abrir el select no debe reasignarla sola. */}
                    {(categoryOptions.includes(product.category)
                      ? categoryOptions
                      : [product.category, ...categoryOptions]
                    ).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </td>

                <td className="px-2 py-2">
                  <EditableCell
                    type="number"
                    align="right"
                    value={String(product.price)}
                    display={formatMoney(product.price)}
                    ariaLabel={`Precio de ${product.name}`}
                    onCommit={(raw) => {
                      const price = parseAmount(raw)
                      if (price === undefined) return
                      onUpdate(product.id, { price })
                    }}
                  />
                </td>

                <td className="px-2 py-2">
                  <EditableCell
                    type="number"
                    align="right"
                    value={product.cost === null ? '' : String(product.cost)}
                    display={formatMoney(product.cost)}
                    ariaLabel={`Costo de ${product.name}`}
                    onCommit={(raw) => {
                      // Vaciar la celda limpia el costo; cualquier otro texto debe ser un monto válido.
                      if (raw === '') {
                        onUpdate(product.id, { cost: null })
                        return
                      }
                      const cost = parseAmount(raw)
                      if (cost === undefined) return
                      onUpdate(product.id, { cost })
                    }}
                  />
                </td>

                <td className="px-4 py-2 text-right">
                  {product.cost === null ? (
                    <span className="text-body-md text-secondary">—</span>
                  ) : (
                    <>
                      <p className="text-body-md text-on-surface">
                        {formatMoney(product.price - product.cost)}
                      </p>
                      <p className="font-label text-label-caps text-secondary">
                        {product.price > 0
                          ? `${Math.round(((product.price - product.cost) / product.price) * 100)}%`
                          : '—'}
                      </p>
                    </>
                  )}
                </td>

                <td className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <ToggleSwitch
                      checked={product.active}
                      onChange={() => onUpdate(product.id, { active: !product.active })}
                      label={`Activar ${product.name}`}
                    />
                    <button
                      type="button"
                      onClick={() => onUpdate(product.id, { in_stock: !product.in_stock })}
                      aria-pressed={!product.in_stock}
                      className={`rounded-full px-3 py-1 font-label text-label-caps uppercase transition-colors ${
                        product.in_stock
                          ? 'bg-surface-container-high text-secondary hover:text-primary'
                          : 'bg-error-container text-on-error-container'
                      }`}
                    >
                      {product.in_stock ? 'Disponible' : 'Agotado'}
                    </button>
                  </div>
                </td>

                <td className="px-4 py-2">
                  <div className="flex justify-end gap-1">
                    {archivedView ? (
                      <>
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onRestore(product)}
                          aria-label={`Restaurar ${product.name}`}
                          className="rounded-full p-1.5 text-secondary transition-colors hover:bg-surface-container-high hover:text-primary"
                        >
                          <span className="material-symbols-outlined text-lg">unarchive</span>
                        </motion.button>
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onDelete(product)}
                          aria-label={`Eliminar definitivamente ${product.name}`}
                          className="rounded-full p-1.5 text-secondary transition-colors hover:bg-surface-container-high hover:text-error"
                        >
                          <span className="material-symbols-outlined text-lg">delete_forever</span>
                        </motion.button>
                      </>
                    ) : (
                      <>
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onEdit(product)}
                          aria-label={`Editar ${product.name}`}
                          className="rounded-full p-1.5 text-secondary transition-colors hover:bg-surface-container-high hover:text-primary"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </motion.button>
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onDuplicate(product)}
                          aria-label={`Duplicar ${product.name}`}
                          className="rounded-full p-1.5 text-secondary transition-colors hover:bg-surface-container-high hover:text-primary"
                        >
                          <span className="material-symbols-outlined text-lg">content_copy</span>
                        </motion.button>
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.9 }}
                          onClick={() => onArchive(product)}
                          aria-label={`Archivar ${product.name}`}
                          className="rounded-full p-1.5 text-secondary transition-colors hover:bg-surface-container-high hover:text-error"
                        >
                          <span className="material-symbols-outlined text-lg">archive</span>
                        </motion.button>
                      </>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  )
}
