export type EmployeeRole = 'admin' | 'mesero' | 'cocina' | 'caja'

export interface ActiveEmployee {
  id: string
  name: string
  role: EmployeeRole
}

export interface EmployeeListItem {
  id: string
  name: string
  role: EmployeeRole
  active: boolean
}

/** Turno de trabajo. `ended_at` nulo significa que el turno sigue abierto. */
export interface EmployeeShift {
  id: string
  employee_id: string
  started_at: string
  ended_at: string | null
}
