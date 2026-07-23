import { NavLink, Outlet } from 'react-router-dom'
import { AppHeader } from '../../components/AppHeader'

const NAV_ITEMS = [
  { to: '/backoffice', label: 'Resumen', end: true },
  { to: '/backoffice/empleados', label: 'Empleados', end: false },
]

export function BackofficeLayout() {
  return (
    <div className="min-h-full bg-slate-50">
      <AppHeader title="Backoffice" />
      <div className="flex">
        <nav className="w-48 shrink-0 space-y-1 border-r border-slate-200 bg-white p-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
