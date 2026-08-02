import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '../../../lib/supabase'
import { removeProductPhotoIfUnused } from '../../../lib/productPhotos'
import { fadeUp, layoutSpring, viewSwap } from '../../../lib/motion'
import { useAuthStore } from '../../../stores/useAuthStore'
import { useSettingsStore } from '../../../stores/useSettingsStore'
import { Modal } from '../../../components/Modal'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { ALL_CATEGORIES, type Product } from '../../../types/menu'
import { ProductForm } from './ProductForm'
import { ProductCardGrid } from './ProductCardGrid'
import { ProductTable } from './ProductTable'
import { MenuToolbar, type MenuView } from './MenuToolbar'

const VIEW_STORAGE_KEY = 'menu:view'

/** Minúsculas y sin acentos, para que "cafe" encuentre "Café". */
function normalize(text: string) {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
}

export function MenuPage() {
  const location = useAuthStore((s) => s.location)
  const categories = useSettingsStore((s) => s.categories)
  const settings = useSettingsStore((s) => s.settings)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORIES)
  const [search, setSearch] = useState('')
  const [onlyInactive, setOnlyInactive] = useState(false)
  const [onlyOutOfStock, setOnlyOutOfStock] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [view, setView] = useState<MenuView>(() =>
    localStorage.getItem(VIEW_STORAGE_KEY) === 'table' ? 'table' : 'cards',
  )

  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [duplicateSource, setDuplicateSource] = useState<Product | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function reload() {
    if (!location) return
    setLoading(true)
    const { data } = await supabase
      .from('products')
      .select('id, name, category, price, cost, photo_url, active, in_stock, archived_at')
      .eq('location_id', location.id)
      .order('name')
    setProducts(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  function changeView(next: MenuView) {
    setView(next)
    localStorage.setItem(VIEW_STORAGE_KEY, next)
  }

  /**
   * Guarda un cambio puntual sobre un producto. Actualiza la UI de inmediato y,
   * si Supabase rechaza el update, deja la fila como estaba y avisa del error.
   */
  async function updateProduct(id: string, patch: Partial<Product>) {
    const previous = products.find((p) => p.id === id)
    if (!previous) return

    setErrorMsg(null)
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))

    const { error } = await supabase.from('products').update(patch).eq('id', id)
    if (error) {
      setProducts((prev) => prev.map((p) => (p.id === id ? previous : p)))
      setErrorMsg(`No se pudo guardar "${previous.name}": ${error.message}`)
    }
  }

  function openCreate() {
    setEditingProduct(null)
    setDuplicateSource(null)
    setFormOpen(true)
  }

  function openEdit(product: Product) {
    setEditingProduct(product)
    setDuplicateSource(null)
    setFormOpen(true)
  }

  function openDuplicate(product: Product) {
    setEditingProduct(null)
    setDuplicateSource(product)
    setFormOpen(true)
  }

  /** Archivar es el camino normal de "quitar del menú": reversible y no rompe historial. */
  function archiveProduct(product: Product) {
    void updateProduct(product.id, { archived_at: new Date().toISOString() })
  }

  function restoreProduct(product: Product) {
    void updateProduct(product.id, { archived_at: null })
  }

  function openDelete(product: Product) {
    setDeletingProduct(product)
    setDeleteOpen(true)
  }

  async function confirmDelete() {
    if (!deletingProduct) return
    setDeleting(true)
    const { error } = await supabase.from('products').delete().eq('id', deletingProduct.id)
    setDeleting(false)
    setDeleteOpen(false)
    if (error) {
      // Cuando existan órdenes que referencien el producto, el FK va a
      // rechazar este delete: el mensaje debe verse, no perderse en silencio.
      setErrorMsg(`No se pudo eliminar "${deletingProduct.name}": ${error.message}`)
      return
    }
    await removeProductPhotoIfUnused(deletingProduct.photo_url, products, deletingProduct.id)
    reload()
  }

  function clearFilters() {
    setActiveCategory(ALL_CATEGORIES)
    setSearch('')
    setOnlyInactive(false)
    setOnlyOutOfStock(false)
    setShowArchived(false)
  }

  // Las categorías configuradas, más cualquiera que algún producto siga usando
  // (por ejemplo si se ocultó y quedaron productos dentro): ninguna debe
  // volverse inalcanzable desde los filtros.
  const categoryNames = categories.map((c) => c.name)
  const orphanCategories = [...new Set(products.map((p) => p.category))].filter(
    (name) => !categoryNames.includes(name),
  )
  const categoryFilters = [ALL_CATEGORIES, ...categoryNames, ...orphanCategories]

  const query = normalize(search.trim())
  const visibleProducts = products.filter((p) => {
    // La vista normal y la de archivados son mundos separados.
    if (Boolean(p.archived_at) !== showArchived) return false
    if (activeCategory !== ALL_CATEGORIES && p.category !== activeCategory) return false
    if (query && !normalize(p.name).includes(query)) return false
    if (onlyInactive && p.active) return false
    if (onlyOutOfStock && p.in_stock) return false
    return true
  })

  const filtersApplied =
    activeCategory !== ALL_CATEGORIES ||
    query !== '' ||
    onlyInactive ||
    onlyOutOfStock ||
    showArchived

  return (
    <div>
      <div className="mb-gutter flex items-end justify-between">
        <div>
          <h2 className="text-headline-lg text-on-surface">Gestión de Menú</h2>
          <p className="mt-1 text-secondary">
            Administra los productos disponibles para la venta. Los precios{' '}
            {settings.prices_include_tax ? 'incluyen' : 'no incluyen'} impuesto (
            {settings.tax_rate}%).
          </p>
        </div>
        <motion.button
          onClick={openCreate}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="flex min-h-12 items-center gap-2 rounded-lg bg-primary px-6 py-3 text-button text-on-primary shadow-sm"
        >
          <span className="material-symbols-outlined">add</span>
          Nuevo producto
        </motion.button>
      </div>

      <MenuToolbar
        search={search}
        onSearchChange={setSearch}
        onlyInactive={onlyInactive}
        onToggleOnlyInactive={() => setOnlyInactive((v) => !v)}
        onlyOutOfStock={onlyOutOfStock}
        onToggleOnlyOutOfStock={() => setOnlyOutOfStock((v) => !v)}
        showArchived={showArchived}
        onToggleArchived={() => setShowArchived((v) => !v)}
        view={view}
        onViewChange={changeView}
      />

      <div className="mb-stack-md flex space-x-2 overflow-x-auto border-b border-outline-variant pb-1">
        {categoryFilters.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`relative shrink-0 px-6 py-3 pb-[14px] text-button whitespace-nowrap transition-colors ${
              activeCategory === category
                ? 'text-primary'
                : 'text-secondary hover:bg-surface-container-lowest hover:text-primary'
            }`}
          >
            {category}
            {/* Un único subrayado compartido entre todas las pestañas: se
                desplaza de una a otra en vez de parpadear. */}
            {activeCategory === category && (
              <motion.span
                layoutId="menu-category-underline"
                transition={layoutSpring}
                className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary"
                aria-hidden="true"
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {errorMsg && (
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit="exit"
            className="mb-stack-md rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container"
          >
            {errorMsg}
          </motion.p>
        )}
      </AnimatePresence>

      {loading && <p className="text-secondary">Cargando menú...</p>}

      {!loading && visibleProducts.length === 0 && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="rounded-xl border border-dashed border-surface-variant px-6 py-12 text-center"
        >
          <p className="text-secondary">
            {showArchived && products.every((p) => !p.archived_at)
              ? 'No hay productos archivados.'
              : products.length === 0
                ? 'Aún no hay productos en el menú.'
                : 'Ningún producto coincide con la búsqueda o los filtros.'}
          </p>
          {filtersApplied && products.length > 0 && (
            <button
              onClick={clearFilters}
              className="mt-stack-sm rounded-lg px-4 py-2 text-button text-primary hover:bg-surface-container-low"
            >
              Limpiar filtros
            </button>
          )}
        </motion.div>
      )}

      {!loading && visibleProducts.length > 0 && (
        <>
          <p className="mb-stack-sm font-label text-label-caps text-secondary uppercase">
            {visibleProducts.length}{' '}
            {visibleProducts.length === 1 ? 'producto' : 'productos'}
          </p>
          {/* La cuadrícula y la tabla se relevan con un fundido corto; sin esto
              el cambio de vista es un salto seco entre dos maquetados distintos. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              variants={viewSwap}
              initial="hidden"
              animate="show"
              exit="exit"
            >
              {view === 'cards' ? (
                <ProductCardGrid
                  products={visibleProducts}
                  archivedView={showArchived}
                  onUpdate={updateProduct}
                  onEdit={openEdit}
                  onDuplicate={openDuplicate}
                  onArchive={archiveProduct}
                  onRestore={restoreProduct}
                  onDelete={openDelete}
                />
              ) : (
                <ProductTable
                  products={visibleProducts}
                  categoryOptions={categories.filter((c) => c.active).map((c) => c.name)}
                  archivedView={showArchived}
                  onUpdate={updateProduct}
                  onEdit={openEdit}
                  onDuplicate={openDuplicate}
                  onArchive={archiveProduct}
                  onRestore={restoreProduct}
                  onDelete={openDelete}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)}>
        {location && (
          <ProductForm
            locationId={location.id}
            product={editingProduct}
            duplicateFrom={duplicateSource}
            defaultCategory={
              activeCategory === ALL_CATEGORIES
                ? (categories.find((c) => c.active)?.name ?? '')
                : activeCategory
            }
            onCancel={() => setFormOpen(false)}
            onSaved={() => {
              setFormOpen(false)
              reload()
            }}
            onPhotoReplaced={(oldUrl) => {
              // La foto reemplazada se limpia del bucket salvo que otro
              // producto (un duplicado) la siga usando.
              void removeProductPhotoIfUnused(oldUrl, products, editingProduct?.id)
            }}
          />
        )}
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        {deletingProduct && (
          <ConfirmDialog
            title="Eliminar definitivamente"
            message={`"${deletingProduct.name}" se borrará para siempre, junto con su foto. Si podría volver al menú, déjalo archivado.`}
            loading={deleting}
            onCancel={() => setDeleteOpen(false)}
            onConfirm={confirmDelete}
          />
        )}
      </Modal>
    </div>
  )
}
