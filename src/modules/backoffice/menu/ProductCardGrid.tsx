import { AnimatePresence, motion } from 'framer-motion'
import { ToggleSwitch } from '../../../components/ToggleSwitch'
import { formatMoney } from '../../../lib/format'
import { cardHover, layoutSpring, listContainer, listItem } from '../../../lib/motion'
import type { Product } from '../../../types/menu'

interface ProductCardGridProps {
  products: Product[]
  onUpdate: (id: string, patch: Partial<Product>) => void
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

export function ProductCardGrid({ products, onUpdate, onEdit, onDelete }: ProductCardGridProps) {
  return (
    <motion.div
      className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      variants={listContainer}
      initial="hidden"
      animate="show"
    >
      {/* `layout` en cada tarjeta hace que al filtrar o buscar las que quedan se
          deslicen a su nueva casilla en lugar de saltar. */}
      <AnimatePresence>
        {products.map((product) => (
          <motion.div
            key={product.id}
            layout
            variants={listItem}
            exit="exit"
            transition={layoutSpring}
            whileHover={product.active ? cardHover : undefined}
            className={`group flex flex-col overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.04)] transition-shadow duration-200 ${
              product.active ? 'hover:shadow-[0px_12px_32px_rgba(0,0,0,0.08)]' : 'opacity-75'
            }`}
          >
            <div
              className={`relative h-48 w-full bg-surface-container-high ${product.active ? '' : 'grayscale'}`}
            >
              {product.photo_url ? (
                <img src={product.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-4xl">restaurant</span>
                </div>
              )}

              <AnimatePresence>
                {!product.in_stock && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="absolute top-2 left-2 rounded-full bg-error-container px-3 py-1 font-label text-label-caps text-on-error-container uppercase"
                  >
                    Agotado
                  </motion.span>
                )}
              </AnimatePresence>

              <div className="absolute top-2 right-2 flex gap-1">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onEdit(product)}
                  aria-label={`Editar ${product.name}`}
                  className="rounded-full bg-surface-container-lowest/90 p-1.5 text-secondary shadow-sm transition-colors hover:bg-surface-container-lowest hover:text-primary"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onDelete(product)}
                  aria-label={`Eliminar ${product.name}`}
                  className="rounded-full bg-surface-container-lowest/90 p-1.5 text-secondary shadow-sm transition-colors hover:bg-surface-container-lowest hover:text-error"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </motion.button>
              </div>
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
                  {formatMoney(product.price)}
                </span>
                <ToggleSwitch
                  checked={product.active}
                  onChange={() => onUpdate(product.id, { active: !product.active })}
                  label={`Activar ${product.name}`}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
