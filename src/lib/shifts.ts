import { supabase } from './supabase'

/**
 * Registro de turnos ligado a la sesión: el turno se abre cuando el empleado
 * entra con su PIN y se cierra cuando deja el dispositivo.
 *
 * Ninguna de estas funciones lanza ni bloquea el flujo de auth: si el registro
 * de turnos falla (por ejemplo, porque falta correr la migración 0006), el
 * empleado debe poder entrar a trabajar igual. El administrador siempre puede
 * corregir el turno a mano desde Backoffice → Empleados.
 */

export async function openShift(locationId: string, employeeId: string): Promise<void> {
  const { error } = await supabase
    .from('employee_shifts')
    .insert({ location_id: locationId, employee_id: employeeId })

  // 23505 = ya tenía un turno abierto (índice único parcial). No es un error:
  // significa que el turno de esa persona simplemente sigue corriendo.
  if (error && error.code !== '23505') {
    console.warn('No se pudo abrir el turno del empleado:', error.message)
  }
}

export async function closeOpenShift(employeeId: string): Promise<void> {
  const { error } = await supabase
    .from('employee_shifts')
    .update({ ended_at: new Date().toISOString() })
    .eq('employee_id', employeeId)
    .is('ended_at', null)

  if (error) {
    console.warn('No se pudo cerrar el turno del empleado:', error.message)
  }
}
