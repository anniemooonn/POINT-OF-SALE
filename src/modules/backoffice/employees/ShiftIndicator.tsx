import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { ShiftStatus } from './shift'

interface ShiftIndicatorProps {
  status: ShiftStatus
}

export function ShiftIndicator({ status }: ShiftIndicatorProps) {
  // Este es el único bucle infinito de la app. `MotionConfig` filtra escalas y
  // desplazamientos, pero dejaría el parpadeo de opacidad corriendo para
  // siempre, así que aquí lo quitamos entero.
  const shouldReduceMotion = useReducedMotion()

  return (
    <div>
      <span className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center">
          {/* Turno abierto: un halo que late marca que el contador corre ahora
              mismo. Los turnos cerrados se quedan con el punto quieto. */}
          {status.onShift && !shouldReduceMotion && (
            <motion.span
              className="absolute inset-0 rounded-full bg-success"
              animate={{ scale: [1, 2, 2], opacity: [0.5, 0.1, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
              aria-hidden="true"
            />
          )}
          <span
            className={`relative h-2.5 w-2.5 rounded-full ${
              status.onShift ? 'bg-success' : 'bg-tertiary-fixed-dim'
            }`}
          />
        </span>
        <span
          className={`font-label text-label-caps uppercase ${
            status.onShift ? 'text-success' : 'text-secondary'
          }`}
        >
          {status.label}
        </span>
      </span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={status.detail}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="mt-0.5 pl-4.5 text-body-md text-secondary"
        >
          {status.detail}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}
