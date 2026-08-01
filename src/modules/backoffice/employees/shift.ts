import { formatTime } from '../../../lib/format'
import type { EmployeeShift } from '../../../types/auth'

export interface ShiftStatus {
  /** true mientras el turno siga abierto (el empleado está operando ahora). */
  onShift: boolean
  label: string
  /** Hora de entrada o de salida, según corresponda. */
  detail: string
  /**
   * Para ordenar la columna Turno: 2 = en turno, 1 = ya salió hoy,
   * 0 = sin registro. Empata por hora del último movimiento.
   */
  rank: number
}

export function getShiftStatus(shift: EmployeeShift | undefined): ShiftStatus {
  if (!shift) {
    return { onShift: false, label: 'Fuera de turno', detail: 'Sin registro hoy', rank: 0 }
  }
  if (!shift.ended_at) {
    return {
      onShift: true,
      label: 'En turno',
      detail: `Entró ${formatTime(shift.started_at)}`,
      rank: 2,
    }
  }
  return {
    onShift: false,
    label: 'Fuera de turno',
    detail: `Salió ${formatTime(shift.ended_at)}`,
    rank: 1,
  }
}

/** Turnos por empleado, quedándose con el más reciente de cada uno. */
export function indexLatestShifts(shifts: EmployeeShift[]): Record<string, EmployeeShift> {
  const byEmployee: Record<string, EmployeeShift> = {}
  for (const shift of shifts) {
    const current = byEmployee[shift.employee_id]
    if (!current || shift.started_at > current.started_at) {
      byEmployee[shift.employee_id] = shift
    }
  }
  return byEmployee
}
