import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'

interface NavItem {
  to: string
  label: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { to: '/backoffice', label: 'Resumen', icon: 'dashboard' },
  { to: '/backoffice/menu', label: 'Menú', icon: 'restaurant_menu' },
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

export function BackofficeLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const clearActiveEmployee = useAuthStore((s) => s.clearActiveEmployee)
  const signOutLocation = useAuthStore((s) => s.signOutLocation)

  function handleSwitchEmployee() {
    clearActiveEmployee()
    navigate('/select-employee', { replace: true })
  }

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
                `flex items-center gap-3 rounded-lg px-4 py-3 text-button transition-colors duration-200 ${
                  isActive
                    ? 'bg-primary-container font-bold text-on-primary-container'
                    : 'text-secondary hover:bg-surface-container-high'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}` }}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
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
        <div className="flex h-full items-center border-b-2 border-primary font-bold text-headline-md text-primary">
          {getActiveLabel(location.pathname)}
        </div>
        <div className="flex items-center gap-stack-md">
          <button
            onClick={handleSwitchEmployee}
            className="flex items-center gap-2 text-button text-secondary transition-all hover:text-primary"
          >
            Cambiar Usuario
          </button>
          <div className="flex items-center gap-2">
            <button className="rounded-full p-2 text-secondary transition-all hover:bg-surface-container-high hover:text-primary">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="rounded-full p-2 text-secondary transition-all hover:bg-surface-container-high hover:text-primary">
              <span className="material-symbols-outlined">account_circle</span>
            </button>
          </div>
        </div>
      </header>

      <main className="ml-64 mt-[64px] flex-1 bg-background p-margin-page">
        <Outlet />
      </main>
    </div>
  )
}
