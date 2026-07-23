import type { EmployeeRole } from '../types/auth'

export const ROLE_LABEL: Record<EmployeeRole, string> = {
  admin: 'Administrador',
  mesero: 'Mesero',
  cocina: 'Cocina',
  caja: 'Caja',
}

export const DEFAULT_ROUTE_BY_ROLE: Record<EmployeeRole, string> = {
  admin: '/backoffice',
  mesero: '/foh',
  caja: '/foh',
  cocina: '/kds',
}
