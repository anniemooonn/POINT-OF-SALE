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
