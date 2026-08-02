/**
 * Sesión de caja (tabla `cash_sessions`). Una caja abierta es la que tiene
 * `closed_at` nulo; al cerrarse se llenan de golpe todos los campos de cierre.
 */
export interface CashSession {
  id: string
  opened_by_name: string
  opened_at: string
  /** Efectivo declarado al abrir el turno. */
  opening_float: number
  /** Ventas cobradas en efectivo durante el turno (sin propina). */
  cash_sales: number
  /**
   * Propinas cobradas en efectivo. Van aparte de la venta pero cuentan en el
   * esperado: hasta que se reparten, el dinero está físicamente en el cajón.
   */
  cash_tips: number
  closed_by_name: string | null
  closed_at: string | null
  /** Lo que debería haber en el cajón, congelado al momento de cerrar. */
  expected_cash: number | null
  counted_cash: number | null
  /** `counted_cash - expected_cash`. Negativo = faltante, positivo = sobrante. */
  difference: number | null
  notes: string | null
}

/** Una caja ya cerrada: los campos de cierre dejan de ser opcionales. */
export interface ClosedCashSession extends CashSession {
  closed_by_name: string
  closed_at: string
  expected_cash: number
  counted_cash: number
  difference: number
}

export function isClosed(session: CashSession): session is ClosedCashSession {
  return session.closed_at !== null
}
