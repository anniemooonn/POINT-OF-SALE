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

export const ROLE_AVATAR_CLASSES: Record<EmployeeRole, string> = {
  admin: 'bg-primary-container text-on-primary-container',
  mesero: 'bg-secondary-container text-on-secondary-container',
  cocina: 'bg-tertiary-fixed text-on-tertiary-fixed',
  caja: 'bg-primary-fixed-dim text-on-primary-fixed-variant',
}
