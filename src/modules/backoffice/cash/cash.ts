import { formatMoney } from '../../../lib/format'

// En una sola línea a propósito: supabase-js infiere el tipo de la respuesta
// leyendo esta cadena, y una concatenación le deja un `string` sin analizar.
export const CASH_SESSION_COLUMNS =
  'id, opened_by_name, opened_at, opening_float, cash_sales, closed_by_name, closed_at, expected_cash, counted_cash, difference, notes'

export const MISSING_TABLE_MSG =
  'La tabla de cortes de caja todavía no existe en Supabase. Corre la migración ' +
  'supabase/migrations/20260802020833_cash_sessions.sql en el SQL Editor para poder abrir y cerrar caja.'

interface SupabaseError {
  code?: string
  message: string
}

/**
 * Traduce el error de Supabase a algo accionable. Los dos casos frecuentes son
 * estrenar el módulo sin haber corrido la migración (PGRST205 / 42P01) y chocar
 * con el índice de "una sola caja abierta por local" (23505), que en la
 * práctica significa que alguien más ya abrió la caja desde otro dispositivo.
 */
export function describeCashError(error: SupabaseError): string {
  if (error.code === 'PGRST205' || error.code === '42P01') return MISSING_TABLE_MSG
  if (error.code === '23505') {
    return 'Este local ya tiene una caja abierta. Recarga la pantalla para ver el estado real.'
  }
  return error.message
}

export interface DifferenceTone {
  label: string
  /** Importe con signo explícito: "+$50.00" para el sobrante. */
  amount: string
  chip: string
  icon: string
}

/** Cómo se ve una diferencia de corte: faltante, sobrante o cuadra exacto. */
export function describeDifference(difference: number): DifferenceTone {
  if (difference < 0) {
    return {
      label: 'Faltante',
      amount: formatMoney(difference),
      chip: 'bg-error-container text-on-error-container',
      icon: 'trending_down',
    }
  }
  if (difference > 0) {
    return {
      label: 'Sobrante',
      amount: `+${formatMoney(difference)}`,
      chip: 'bg-success-container text-on-success-container',
      icon: 'trending_up',
    }
  }
  return {
    label: 'Cuadra',
    amount: formatMoney(0),
    chip: 'bg-surface-variant text-on-surface',
    icon: 'check',
  }
}

/**
 * Lee un importe capturado a mano. Devuelve `null` si no es un número válido:
 * el formulario decide qué mensaje mostrar según el campo.
 */
export function parseAmount(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.')
  if (trimmed === '') return null
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value < 0) return null
  // Dos decimales: la columna es numeric(12,2) y Postgres redondearía igual.
  return Math.round(value * 100) / 100
}
