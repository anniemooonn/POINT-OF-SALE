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

/**
 * Día calendario del restaurante como "2026-08-01". Se calcula con la zona
 * horaria configurada y no con la del navegador: un corte de las 23:45 tiene
 * que pertenecer al día del local, aunque la tablet esté en otro huso.
 */
function zonedDayKey(date: Date): string {
  try {
    // en-CA formatea la fecha en orden año-mes-día, que además ordena bien.
    return date.toLocaleDateString('en-CA', { timeZone: active.timezone })
  } catch {
    return date.toLocaleDateString('en-CA')
  }
}

/**
 * Fecha con referencia al día para listados de historial: "Hoy, 14:30",
 * "Ayer, 23:45" o "12 oct, 15:00" para cualquier fecha anterior.
 */
export function formatDayTime(iso: string): string {
  const date = new Date(iso)
  const time = formatTime(iso)

  const day = zonedDayKey(date)
  const now = new Date()
  if (day === zonedDayKey(now)) return `Hoy, ${time}`

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  if (day === zonedDayKey(yesterday)) return `Ayer, ${time}`

  try {
    const label = date.toLocaleDateString(active.locale, {
      day: 'numeric',
      month: 'short',
      timeZone: active.timezone,
    })
    return `${label}, ${time}`
  } catch {
    return `${date.toLocaleDateString(DEFAULT_SETTINGS.locale)}, ${time}`
  }
}
