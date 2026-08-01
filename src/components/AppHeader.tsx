import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'

export function AppHeader({ title }: { title: string }) {
  const navigate = useNavigate()
  const location = useAuthStore((s) => s.location)
  const activeEmployee = useAuthStore((s) => s.activeEmployee)
  const clearActiveEmployee = useAuthStore((s) => s.clearActiveEmployee)
  const signOutLocation = useAuthStore((s) => s.signOutLocation)

  async function handleSwitchEmployee() {
    await clearActiveEmployee()
    navigate('/select-employee', { replace: true })
  }

  async function handleSignOutLocation() {
    await signOutLocation()
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <div>
        <p className="text-xs text-slate-500">{location?.name}</p>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-900">{activeEmployee?.name}</p>
          <p className="text-xs text-slate-500 capitalize">{activeEmployee?.role}</p>
        </div>
        <button
          onClick={handleSwitchEmployee}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Cambiar usuario
        </button>
        <button
          onClick={handleSignOutLocation}
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          Cerrar dispositivo
        </button>
      </div>
    </header>
  )
}
