import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/useAuthStore'
import type { EmployeeRole } from '../types/auth'

interface ProtectedRouteProps {
  allowedRoles?: EmployeeRole[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const session = useAuthStore((s) => s.session)
  const activeEmployee = useAuthStore((s) => s.activeEmployee)

  if (!session) return <Navigate to="/login" replace />
  if (!activeEmployee) return <Navigate to="/select-employee" replace />
  if (allowedRoles && !allowedRoles.includes(activeEmployee.role)) {
    return <Navigate to="/select-employee" replace />
  }

  return <Outlet />
}
