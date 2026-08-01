import { AnimatePresence, motion } from 'framer-motion'

interface ShiftButtonProps {
  onShift: boolean
  employeeName: string
  /** Empleado inactivo: no puede abrir turno. */
  disabled?: boolean
  busy?: boolean
  onClick: () => void
}

export function ShiftButton({ onShift, employeeName, disabled, busy, onClick }: ShiftButtonProps) {
  const text = busy ? 'Guardando...' : onShift ? 'Terminar turno' : 'Iniciar turno'

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      whileTap={disabled || busy ? undefined : { scale: 0.95 }}
      layout
      transition={{ duration: 0.15, ease: 'easeOut' }}
      title={disabled ? 'Actívalo para poder registrar su turno' : undefined}
      aria-label={`${onShift ? 'Terminar' : 'Iniciar'} turno de ${employeeName}`}
      className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 font-label text-label-caps uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        onShift
          ? 'border-surface-variant text-secondary hover:bg-surface-container-high hover:text-primary'
          : 'border-success/40 text-success hover:bg-success-container'
      }`}
    >
      {/* El icono gira media vuelta al cambiar de sentido: entrar y salir del
          turno son la misma acción invertida y el giro lo hace explícito. */}
      <motion.span
        className="material-symbols-outlined text-lg"
        animate={{ rotate: onShift ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        {onShift ? 'logout' : 'login'}
      </motion.span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={text}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  )
}
