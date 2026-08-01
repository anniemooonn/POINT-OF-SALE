import { DEFAULT_SETTINGS, type LocationSettings } from '../types/settings'

/**
 * Moneda, locale y zona horaria salen de Backoffice → Configuración. Se
 * guardan aquí como estado de módulo (y no en un hook) para que `formatMoney`
 * y `formatTime` sigan siendo funciones sueltas, llamables desde cualquier
 * render sin propagar props por todo el árbol.
 *
 * Quien monta la app llama `applyFormatSettings` al cargar la configuración
 * (ver `useSettingsStore`). Las pantallas que muestran dinero ya se vuelven a
 * renderizar cuando el store cambia, así que no hace falta suscribirse aquí.
 */
let active: LocationSettings = DEFAULT_SETTINGS
let moneyFormatter = buildMoneyFormatter(DEFAULT_SETTINGS)

function buildMoneyFormatter(settings: LocationSettings): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(settings.locale, {
      style: 'currency',
      currency: settings.currency_code,
    })
  } catch {
    // Un locale o código de moneda inválido no debe tumbar la pantalla:
    // se cae a los valores por defecto.
    return new Intl.NumberFormat(DEFAULT_SETTINGS.locale, {
      style: 'currency',
      currency: DEFAULT_SETTINGS.currency_code,
    })
  }
}

export function applyFormatSettings(settings: LocationSettings): void {
  active = settings
  moneyFormatter = buildMoneyFormatter(settings)
}

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return moneyFormatter.format(value)
}

/** Hora local del restaurante en formato 24h ("09:12"), como se lee un reloj de turnos. */
export function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(active.locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: active.timezone,
    })
  } catch {
    return new Date(iso).toLocaleTimeString(DEFAULT_SETTINGS.locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }
}
