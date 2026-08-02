import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from './stores/useAuthStore'
import { useSettingsStore } from './stores/useSettingsStore'
import { DEFAULT_ROUTE_BY_ROLE } from './lib/roles'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LocationLoginPage } from './modules/auth/LocationLoginPage'
import { LocationSignupPage } from './modules/auth/LocationSignupPage'
import { SelectEmployeePage } from './modules/auth/SelectEmployeePage'
import { FohHomePage } from './modules/foh/FohHomePage'
import { KdsPage } from './modules/kds/KdsPage'
import { BackofficeLayout } from './modules/backoffice/BackofficeLayout'
import { BackofficeHomePage } from './modules/backoffice/BackofficeHomePage'
import { EmployeesListPage } from './modules/backoffice/employees/EmployeesListPage'
import { MenuPage } from './modules/backoffice/menu/MenuPage'
import { TableLayoutPage } from './modules/backoffice/tables/TableLayoutPage'
import { CashRegisterPage } from './modules/backoffice/CashRegisterPage'
import { TipsPage } from './modules/backoffice/TipsPage'
import { SettingsPage } from './modules/backoffice/settings/SettingsPage'
import { Spinner } from './components/Spinner'

function App() {
  const init = useAuthStore((s) => s.init)
  const initializing = useAuthStore((s) => s.initializing)
  const locationId = useAuthStore((s) => s.location?.id)
  const loadSettings = useSettingsStore((s) => s.load)

  useEffect(() => {
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // La configuración se carga a nivel de app, no de Backoffice: moneda, locale
  // y zona horaria los usan también FOH y KDS al formatear importes y horas.
  useEffect(() => {
    if (locationId) loadSettings(locationId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId])

  if (initializing) {
    return (
      <div className="flex min-h-full items-center justify-center text-slate-400">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<LocationLoginPage />} />
      <Route path="/signup" element={<LocationSignupPage />} />
      <Route path="/select-employee" element={<SelectEmployeePage />} />

      <Route element={<ProtectedRoute allowedRoles={['mesero', 'caja', 'admin']} />}>
        <Route path="/foh" element={<FohHomePage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['cocina', 'admin']} />}>
        <Route path="/kds" element={<KdsPage />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/backoffice" element={<BackofficeLayout />}>
          <Route index element={<BackofficeHomePage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="mesas" element={<TableLayoutPage />} />
          <Route path="cortes-de-caja" element={<CashRegisterPage />} />
          <Route path="propinas" element={<TipsPage />} />
          <Route path="empleados" element={<EmployeesListPage />} />
          <Route path="configuracion" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  )
}

function RootRedirect() {
  const session = useAuthStore((s) => s.session)
  const activeEmployee = useAuthStore((s) => s.activeEmployee)

  if (!session) return <Navigate to="/login" replace />
  if (!activeEmployee) return <Navigate to="/select-employee" replace />
  return <Navigate to={DEFAULT_ROUTE_BY_ROLE[activeEmployee.role]} replace />
}

export default App
