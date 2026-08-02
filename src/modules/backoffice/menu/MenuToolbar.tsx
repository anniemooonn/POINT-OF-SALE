import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ViewSwitch, type ListView } from '../../../components/ViewSwitch'

export type MenuView = ListView

interface MenuToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  onlyInactive: boolean
  onToggleOnlyInactive: () => void
  onlyOutOfStock: boolean
  onToggleOnlyOutOfStock: () => void
  showArchived: boolean
  onToggleArchived: () => void
  view: MenuView
  onViewChange: (view: MenuView) => void
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      whileTap={{ scale: 0.94 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      className={`shrink-0 rounded-full px-4 py-2 font-label text-label-caps uppercase transition-colors ${
        active
          ? 'bg-primary text-on-primary'
          : 'border border-surface-variant text-secondary hover:bg-surface-container-low hover:text-primary'
      }`}
    >
      {children}
    </motion.button>
  )
}

export function MenuToolbar({
  search,
  onSearchChange,
  onlyInactive,
  onToggleOnlyInactive,
  onlyOutOfStock,
  onToggleOnlyOutOfStock,
  showArchived,
  onToggleArchived,
  view,
  onViewChange,
}: MenuToolbarProps) {
  return (
    <div className="mb-stack-md flex flex-wrap items-center gap-stack-sm">
      <div className="relative min-w-64 flex-1">
        <span className="material-symbols-outlined pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-secondary">
          search
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Buscar producto por nombre"
          placeholder="Buscar producto..."
          className="w-full rounded-lg border border-surface-variant bg-surface-container-lowest py-2.5 pr-10 pl-11 text-body-md text-on-surface outline-none placeholder:text-secondary focus:border-primary focus:ring-2 focus:ring-primary/20 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {/* El centrado vertical vive en este contenedor y no en el botón:
            Framer escribe `transform` para animar la escala y se llevaría por
            delante cualquier `-translate-y-1/2` puesto en el mismo elemento. */}
        <span className="absolute inset-y-0 right-2 flex items-center">
          <AnimatePresence>
            {search && (
              <motion.button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Limpiar búsqueda"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="flex rounded-full p-1 text-secondary transition-colors hover:bg-surface-container-high hover:text-primary"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </motion.button>
            )}
          </AnimatePresence>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <FilterChip active={onlyInactive} onClick={onToggleOnlyInactive}>
          Solo inactivos
        </FilterChip>
        <FilterChip active={onlyOutOfStock} onClick={onToggleOnlyOutOfStock}>
          Solo agotados
        </FilterChip>
        <FilterChip active={showArchived} onClick={onToggleArchived}>
          Archivados
        </FilterChip>
      </div>

      <ViewSwitch view={view} onChange={onViewChange} />
    </div>
  )
}
