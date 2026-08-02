import { useState } from 'react'
import { NavLink, useLocation, useNavigate, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthStore } from '../../stores/useAuthStore'
import { EmployeeMenu } from '../../components/EmployeeMenu'
import { layoutSpring, pageTransition } from '../../lib/motion'

interface NavItem {
  to: string
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/backoffice', label: 'Resumen', icon: 'dashboard' },
  { to: '/backoffice/menu', label: 'Menú', icon: 'restaurant_menu' },
  { to: '/backoffice/mesas', label: 'Mesas', icon: 'table_restaurant' },
  { to: '/backoffice/cortes-de-caja', label: 'Cortes de Caja', icon: 'point_of_sale' },
  { to: '/backoffice/propinas', label: 'Propinas', icon: 'payments' },
  { to: '/backoffice/empleados', label: 'Empleados', icon: 'group' },
  { to: '/backoffice/configuracion', label: 'Configuración', icon: 'settings' },
]

function getActiveLabel(pathname: string): string {
  const match = [...NAV_ITEMS]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))
  return match?.label ?? ''
}

/**
 * Deja fija la pantalla que le tocó al montarse.
 *
 * `<Outlet>` siempre resuelve la ruta *actual*, así que la copia que se está
 * desvaneciendo mostraría ya el contenido de la pantalla entrante. Al quedarnos
 * con el elemento del primer render, la que sale sigue siendo la que salía.
 * Cada ruta monta su propia instancia gracias al `key` del contenedor.
 */
function FrozenOutlet() {
  const outlet = useOutlet()
  const [frozen] = useState(outlet)
  return frozen
}

export function BackofficeLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const signOutLocation = useAuthStore((s) => s.signOutLocation)

  // Cambiar de empleado ya no vive aquí: se hace desde el avatar de la barra
  // superior (<EmployeeMenu />), junto al resto de acciones de sesión.
  async function handleCloseDevice() {
    await signOutLocation()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen w-full bg-background font-sans text-on-background antialiased">
      <nav className="fixed top-0 left-0 z-20 flex h-full w-64 flex-col border-r border-outline-variant bg-surface px-stack-sm py-8 shadow-sm">
        <div className="mb-gutter px-stack-sm">
          <h1 className="text-headline-md leading-none font-extrabold tracking-tight text-primary">
            BistroFlow
          </h1>
          <p className="mt-1 font-label text-label-caps text-secondary">POS System</p>
        </div>

        <div className="flex-1 space-y-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/backoffice'}
              className={({ isActive }) =>
                `relative flex items-center gap-3 rounded-lg px-4 py-3 text-button transition-colors duration-200 ${
                  isActive
                    ? 'font-bold text-on-primary-container'
                    : 'text-secondary hover:bg-surface-container-high'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* El fondo del ítem activo es un solo elemento compartido: al
                      cambiar de sección se desliza hasta el nuevo destino en vez
                      de encenderse y apagarse. */}
                  {isActive && (
                    <motion.span
                      layoutId="backoffice-nav-active"
                      transition={layoutSpring}
                      className="absolute inset-0 rounded-lg bg-primary-container"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className="material-symbols-outlined relative"
                    style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}` }}
                  >
                    {item.icon}
                  </span>
                  <span className="relative">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="mt-auto border-t border-outline-variant pt-4">
          <button
            onClick={handleCloseDevice}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-button text-secondary transition-colors duration-200 hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined">power_settings_new</span>
            <span>Cerrar Dispositivo</span>
          </button>
        </div>
      </nav>

      <header className="fixed top-0 right-0 z-10 flex h-touch-target-min w-[calc(100%-16rem)] items-center justify-between bg-surface-bright px-margin-page shadow-sm">
        <div className="flex h-full items-center overflow-hidden border-b-2 border-primary font-bold text-headline-md text-primary">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {getActiveLabel(location.pathname)}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-stack-md">
          <button className="rounded-full p-2 text-secondary transition-all hover:bg-surface-container-high hover:text-primary">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          {/* Sustituye al par "Cambiar Usuario" + icono de cuenta: las dos
              acciones de sesión viven ahora dentro del propio avatar. */}
          <EmployeeMenu />
        </div>
      </header>

      <main className="ml-64 mt-[64px] flex-1 bg-background p-margin-page">
        {/* mode="wait": la pantalla saliente termina antes de que entre la
            siguiente, para que no se solapen dos contenidos distintos. */}
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageTransition}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            <FrozenOutlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
