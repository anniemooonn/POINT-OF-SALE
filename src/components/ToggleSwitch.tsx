import { motion } from 'framer-motion'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
}

/**
 * El recorrido del botón lo mueve Framer con un muelle en lugar de una
 * transición CSS: es el control que más se toca en Menú y Empleados, y el
 * rebote al soltar comunica que el cambio se registró.
 */
export function ToggleSwitch({ checked, onChange, label }: ToggleSwitchProps) {
  return (
    <label className="relative inline-flex h-6 w-12 shrink-0 cursor-pointer items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
        aria-label={label}
      />
      <span className="absolute inset-0 rounded-full bg-surface-variant transition-colors peer-checked:bg-primary" />
      <motion.span
        className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow"
        animate={{ x: checked ? 24 : 0 }}
        transition={{ type: 'spring', stiffness: 700, damping: 32 }}
      />
    </label>
  )
}
