import { useId } from 'react'
import { motion } from 'framer-motion'
import { layoutSpring } from '../lib/motion'

export type ListView = 'cards' | 'table'

interface ViewSwitchProps {
  view: ListView
  onChange: (view: ListView) => void
}

function ViewButton({
  active,
  onClick,
  icon,
  label,
  layoutId,
}: {
  active: boolean
  onClick: () => void
  icon: string
  label: string
  layoutId: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`relative flex h-10 w-10 items-center justify-center rounded-md transition-colors ${
        active ? 'text-primary' : 'text-secondary hover:text-primary'
      }`}
    >
      {active && (
        <motion.span
          layoutId={layoutId}
          transition={layoutSpring}
          className="absolute inset-0 rounded-md bg-surface-container-high"
          aria-hidden="true"
        />
      )}
      <span className="material-symbols-outlined relative">{icon}</span>
    </button>
  )
}

/** Alterna entre cuadrícula de tarjetas y vista de lista (tabla). */
export function ViewSwitch({ view, onChange }: ViewSwitchProps) {
  // El id del recuadro deslizante es propio de cada instancia: si dos
  // interruptores coincidieran en pantalla, un layoutId compartido haría que el
  // recuadro volara de uno al otro.
  const layoutId = `view-switch-${useId()}`

  return (
    <div className="flex items-center gap-1 rounded-lg border border-surface-variant p-1">
      <ViewButton
        active={view === 'cards'}
        onClick={() => onChange('cards')}
        icon="grid_view"
        label="Vista de tarjetas"
        layoutId={layoutId}
      />
      <ViewButton
        active={view === 'table'}
        onClick={() => onChange('table')}
        icon="table_rows"
        label="Vista de lista"
        layoutId={layoutId}
      />
    </div>
  )
}
