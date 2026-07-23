import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from './stores/useAuthStore'
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

function App() {
  const init = useAuthStore((s) => s.init)
  const initializing = useAuthStore((s) => s.initializing)

  useEffect(() => {
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (initializing) {
    return <div className="flex min-h-full items-center justify-center text-slate-400">Cargando...</div>
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
          <Route path="empleados" element={<EmployeesListPage />} />
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
