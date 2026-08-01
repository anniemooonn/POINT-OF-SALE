/** Ajustes de venta del local (tabla `location_settings`, una fila por local). */
export interface LocationSettings {
  currency_code: string
  locale: string
  timezone: string
  /** Porcentaje, no fracción: 16 significa 16%. */
  tax_rate: number
  /** true = el precio capturado en el menú ya trae el impuesto dentro. */
  prices_include_tax: boolean
}

/**
 * Se usan mientras la fila del local no se ha cargado (o si falta correr la
 * migración 0007), para que la app siga formateando dinero y horas sin romperse.
 */
export const DEFAULT_SETTINGS: LocationSettings = {
  currency_code: 'MXN',
  locale: 'es-MX',
  timezone: 'America/Mexico_City',
  tax_rate: 16,
  prices_include_tax: true,
}

/** Datos de identidad del local (tabla `locations`); van impresos en el ticket. */
export interface LocationProfile {
  name: string
  address: string | null
  phone: string | null
  tax_id: string | null
}

export interface MenuCategoryRow {
  id: string
  name: string
  sort_order: number
  active: boolean
}

export const CURRENCY_OPTIONS = [
  { code: 'MXN', label: 'Peso mexicano (MXN)' },
  { code: 'USD', label: 'Dólar estadounidense (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'COP', label: 'Peso colombiano (COP)' },
  { code: 'ARS', label: 'Peso argentino (ARS)' },
  { code: 'CLP', label: 'Peso chileno (CLP)' },
  { code: 'PEN', label: 'Sol peruano (PEN)' },
  { code: 'GTQ', label: 'Quetzal (GTQ)' },
] as const

export const LOCALE_OPTIONS = [
  { code: 'es-MX', label: 'Español (México)' },
  { code: 'es-CO', label: 'Español (Colombia)' },
  { code: 'es-AR', label: 'Español (Argentina)' },
  { code: 'es-CL', label: 'Español (Chile)' },
  { code: 'es-ES', label: 'Español (España)' },
  { code: 'en-US', label: 'Inglés (Estados Unidos)' },
] as const

export const TIMEZONE_OPTIONS = [
  { code: 'America/Mexico_City', label: 'Ciudad de México (GMT-6)' },
  { code: 'America/Tijuana', label: 'Tijuana (GMT-8)' },
  { code: 'America/Cancun', label: 'Cancún (GMT-5)' },
  { code: 'America/Hermosillo', label: 'Hermosillo (GMT-7)' },
  { code: 'America/Bogota', label: 'Bogotá (GMT-5)' },
  { code: 'America/Lima', label: 'Lima (GMT-5)' },
  { code: 'America/Santiago', label: 'Santiago (GMT-4)' },
  { code: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (GMT-3)' },
  { code: 'America/Guatemala', label: 'Guatemala (GMT-6)' },
  { code: 'Europe/Madrid', label: 'Madrid (GMT+1)' },
] as const
