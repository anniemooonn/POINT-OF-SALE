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

/**
 * Acento de color por rol para las tarjetas de empleado: `bar` es la franja
 * superior de la tarjeta y `chip` la etiqueta con el nombre del rol.
 */
export const ROLE_ACCENT_CLASSES: Record<EmployeeRole, { bar: string; chip: string }> = {
  admin: {
    bar: 'bg-primary',
    chip: 'border-primary/30 bg-primary-container/15 text-primary',
  },
  mesero: {
    bar: 'bg-secondary',
    chip: 'border-secondary/30 bg-secondary-container/30 text-secondary',
  },
  cocina: {
    bar: 'bg-tertiary',
    chip: 'border-tertiary/30 bg-tertiary-fixed/40 text-tertiary',
  },
  caja: {
    bar: 'bg-on-primary-fixed-variant',
    chip: 'border-on-primary-fixed-variant/30 bg-primary-fixed-dim/30 text-on-primary-fixed-variant',
  },
}
