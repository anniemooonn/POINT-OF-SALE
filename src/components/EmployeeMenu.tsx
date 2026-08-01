import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from '../stores/useAuthStore'
import { blurIn, morphSpring } from '../lib/motion'
import { ROLE_AVATAR_CLASSES, ROLE_LABEL } from '../lib/roles'
import type { ActiveEmployee } from '../types/auth'

/**
 * Menú de la sesión abierta: quién está usando el POS y cómo salir.
 *
 * El botón cerrado y el menú abierto son dos maquetados fijos; Motion pasa de
 * uno al otro con un `layoutId` compartido en el contenedor (y otro en el
 * avatar), así que no hay alto ni ancho que animar a mano. Ambos se anclan
 * arriba a la derecha, que es donde vive el botón en la barra superior: la
 * tarjeta crece hacia abajo y hacia la izquierda saliendo del propio botón.
 */

const AVATAR_LAYOUT_ID = 'employee-menu-avatar'
const CONTAINER_LAYOUT_ID = 'employee-menu'

function Avatar({ employee }: { employee: ActiveEmployee }) {
  return (
    <motion.div
      layoutId={AVATAR_LAYOUT_ID}
      transition={morphSpring}
      // Mismo tamaño en los dos estados a propósito: al morfear, Motion escala
      // la caja y con ella su contenido, y una inicial que se estira mientras
      // viaja se nota. Manteniendo el tamaño, el avatar solo se desplaza.
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-body-lg font-bold ${ROLE_AVATAR_CLASSES[employee.role]}`}
    >
      {employee.name[0]?.toUpperCase()}
    </motion.div>
  )
}

function MenuItem({
  icon,
  children,
  onClick,
}: {
  icon: string
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-body-md text-on-surface transition-colors hover:bg-surface-container-high focus-visible:bg-surface-container-high focus-visible:outline-none"
    >
      <span className="material-symbols-outlined text-xl text-secondary">{icon}</span>
      {children}
    </button>
  )
}

function MenuContent({
  employee,
  locationName,
  onSwitchEmployee,
  onCloseDevice,
}: {
  employee: ActiveEmployee
  locationName?: string
  onSwitchEmployee: () => void
  onCloseDevice: () => void
}) {
  return (
    <motion.div
      layoutId={CONTAINER_LAYOUT_ID}
      transition={morphSpring}
      role="menu"
      aria-label="Sesión activa"
      // El radio va inline porque Motion lo interpola entre los dos estados
      // (99 → 16); en una clase de Tailwind saltaría de golpe.
      style={{ borderRadius: 16 }}
      className="absolute top-0 right-0 z-50 w-64 overflow-hidden border border-surface-variant bg-surface-container-lowest p-2 shadow-[0px_12px_32px_rgba(0,0,0,0.12)]"
    >
      <motion.div
        variants={blurIn}
        initial="hidden"
        animate="show"
        exit="exit"
        className="flex items-center gap-3 px-2 py-2"
      >
        <Avatar employee={employee} />
        <div className="min-w-0">
          <p className="truncate text-body-md font-semibold text-on-surface" title={employee.name}>
            {employee.name}
          </p>
          <p className="truncate font-label text-label-caps text-secondary uppercase">
            {ROLE_LABEL[employee.role]}
          </p>
        </div>
      </motion.div>

      <motion.div
        variants={blurIn}
        initial="hidden"
        animate="show"
        exit="exit"
        className="mt-1 border-t border-outline-variant pt-1"
      >
        <MenuItem icon="swap_horiz" onClick={onSwitchEmployee}>
          Cambiar usuario
        </MenuItem>
        <MenuItem icon="power_settings_new" onClick={onCloseDevice}>
          Cerrar dispositivo
        </MenuItem>
        {locationName && (
          <p className="mt-1 truncate px-3 py-1 font-label text-label-caps text-tertiary uppercase">
            {locationName}
          </p>
        )}
      </motion.div>
    </motion.div>
  )
}

export function EmployeeMenu() {
  const navigate = useNavigate()
  const activeEmployee = useAuthStore((s) => s.activeEmployee)
  const locationName = useAuthStore((s) => s.location?.name)
  const clearActiveEmployee = useAuthStore((s) => s.clearActiveEmployee)
  const signOutLocation = useAuthStore((s) => s.signOutLocation)

  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  /** Sin esto, al cerrar el menú el foco se va al `<body>` y se pierde el hilo. */
  const shouldRestoreFocus = useRef(false)

  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        shouldRestoreFocus.current = true
        setOpen(false)
      }
    }
    function handlePointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handlePointerDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [open])

  useEffect(() => {
    if (open || !shouldRestoreFocus.current) return
    shouldRestoreFocus.current = false
    buttonRef.current?.focus()
  }, [open])

  async function handleSwitchEmployee() {
    setOpen(false)
    await clearActiveEmployee()
    navigate('/select-employee', { replace: true })
  }

  async function handleCloseDevice() {
    setOpen(false)
    await signOutLocation()
    navigate('/login', { replace: true })
  }

  if (!activeEmployee) return null

  return (
    <div ref={rootRef} className="relative h-10 w-10">
      <AnimatePresence>
        {open ? (
          <MenuContent
            key="open"
            employee={activeEmployee}
            locationName={locationName}
            onSwitchEmployee={handleSwitchEmployee}
            onCloseDevice={handleCloseDevice}
          />
        ) : (
          <motion.button
            key="closed"
            ref={buttonRef}
            layoutId={CONTAINER_LAYOUT_ID}
            transition={morphSpring}
            style={{ borderRadius: 99 }}
            onClick={() => setOpen(true)}
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label={`Sesión de ${activeEmployee.name}. Abrir menú de cuenta`}
            className="absolute top-0 right-0 z-50 flex h-10 w-10 items-center justify-center overflow-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <Avatar employee={activeEmployee} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
