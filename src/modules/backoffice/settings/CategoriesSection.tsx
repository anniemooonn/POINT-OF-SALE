import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { fadeUp, layoutSpring } from '../../../lib/motion'
import { Modal } from '../../../components/Modal'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { ToggleSwitch } from '../../../components/ToggleSwitch'
import { useSettingsStore } from '../../../stores/useSettingsStore'
import type { MenuCategoryRow } from '../../../types/settings'
import { EditableCell } from '../menu/EditableCell'
import { SettingsCard } from './SettingsCard'

export function CategoriesSection() {
  const categories = useSettingsStore((s) => s.categories)
  const addCategory = useSettingsStore((s) => s.addCategory)
  const renameCategory = useSettingsStore((s) => s.renameCategory)
  const setCategoryActive = useSettingsStore((s) => s.setCategoryActive)
  const moveCategory = useSettingsStore((s) => s.moveCategory)
  const deleteCategory = useSettingsStore((s) => s.deleteCategory)

  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [deleting, setDeleting] = useState<MenuCategoryRow | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  async function run(action: Promise<{ error: string | null }>) {
    const result = await action
    setError(result.error)
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    setAdding(true)
    const result = await addCategory(newName)
    setAdding(false)
    setError(result.error)
    if (!result.error) setNewName('')
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    const result = await deleteCategory(deleting.id)
    setDeleteBusy(false)
    setDeleting(null)
    // El servidor rechaza la categoría que todavía tiene productos y explica
    // cuántos son; ese mensaje se muestra arriba de la lista.
    setError(result.error)
  }

  return (
    <>
      <SettingsCard
        title="Categorías del menú"
        description="Ordenan los productos en la toma de orden. Renombrar una categoría mueve automáticamente sus productos."
      >
        <AnimatePresence>
          {error && (
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="show"
              exit="exit"
              className="mb-stack-md rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {categories.length === 0 ? (
          <p className="rounded-xl border border-dashed border-surface-variant px-6 py-10 text-center text-secondary">
            Todavía no hay categorías. Agrega la primera abajo.
          </p>
        ) : (
          <ul className="divide-y divide-outline-variant border-y border-outline-variant">
            {/* Subir y bajar una categoría es la interacción central de esta
                lista: con `layout`, las filas intercambian sitio a la vista en
                vez de aparecer ya reordenadas. */}
            <AnimatePresence initial={false}>
              {categories.map((category, index) => (
                <motion.li
                  key={category.id}
                  layout
                  transition={layoutSpring}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-4 overflow-hidden py-3"
                >
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => run(moveCategory(category.id, -1))}
                      disabled={index === 0}
                      aria-label={`Subir ${category.name}`}
                      className="rounded text-secondary transition-colors hover:text-primary disabled:opacity-25 disabled:hover:text-secondary"
                    >
                      <span className="material-symbols-outlined text-[20px]">keyboard_arrow_up</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => run(moveCategory(category.id, 1))}
                      disabled={index === categories.length - 1}
                      aria-label={`Bajar ${category.name}`}
                      className="rounded text-secondary transition-colors hover:text-primary disabled:opacity-25 disabled:hover:text-secondary"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        keyboard_arrow_down
                      </span>
                    </button>
                  </div>

                  <div className={`flex-1 ${category.active ? '' : 'opacity-50'}`}>
                    <EditableCell
                      value={category.name}
                      display={category.name}
                      ariaLabel={`Nombre de la categoría ${category.name}`}
                      onCommit={(raw) => run(renameCategory(category.id, raw))}
                    />
                  </div>

                  <span className="w-24 font-label text-label-caps text-secondary uppercase">
                    {category.active ? 'Visible' : 'Oculta'}
                  </span>

                  <ToggleSwitch
                    checked={category.active}
                    onChange={(v) => run(setCategoryActive(category.id, v))}
                    label={`Mostrar la categoría ${category.name}`}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setError(null)
                      setDeleting(category)
                    }}
                    aria-label={`Eliminar ${category.name}`}
                    className="rounded-lg p-2 text-secondary transition-colors hover:bg-error-container hover:text-on-error-container"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}

        <form onSubmit={handleAdd} className="mt-gutter flex gap-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="input"
            placeholder="Nueva categoría (ej. Cafés, Cocteles)"
            aria-label="Nombre de la nueva categoría"
          />
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-6 py-2 text-button text-on-primary shadow-sm transition-transform active:scale-95 disabled:opacity-40"
          >
            <span className="material-symbols-outlined">add</span>
            {adding ? 'Agregando...' : 'Agregar'}
          </button>
        </form>

        <p className="mt-stack-sm text-body-md text-secondary">
          Ocultar una categoría la quita de la toma de orden sin borrar sus productos. Para
          eliminarla, primero mueve sus productos a otra.
        </p>
      </SettingsCard>

      <Modal open={deleting !== null} onClose={() => setDeleting(null)}>
        {deleting && (
          <ConfirmDialog
            title="Eliminar categoría"
            message={`¿Seguro que quieres eliminar "${deleting.name}"? Solo se puede si ya no tiene productos.`}
            loading={deleteBusy}
            onCancel={() => setDeleting(null)}
            onConfirm={confirmDelete}
          />
        )}
      </Modal>
    </>
  )
}
