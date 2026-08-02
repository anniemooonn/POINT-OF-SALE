import type { Point } from '../lib/geometry'

/** Los siete estados del backlog, en orden de ciclo de servicio. */
export const TABLE_STATUSES = [
  'libre',
  'ocupada',
  'en_captura',
  'esperando',
  'servida',
  'por_pagar',
  'sucia',
] as const

export type TableStatus = (typeof TABLE_STATUSES)[number]

export type TableShape = 'rect' | 'circle'

/** Sección de la distribución del local (tabla `sections`). */
export interface SectionRow {
  id: string
  name: string
  sort_order: number
  /** Límite del espacio de trabajo dibujado por el admin; null = todo el lienzo. */
  boundary: Point[] | null
}

/** Layout de una mesa (tabla `restaurant_tables`). `x`/`y` son el centro. */
export interface TableRow {
  id: string
  section_id: string
  name: string
  capacity: number
  shape: TableShape
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

interface StatusMeta {
  label: string
  /** Nombre de ícono de Material Symbols (mismo set que usa el resto de la app). */
  icon: string
  /** Colores planos para pintar dentro del SVG del mapa. */
  fill: string
  stroke: string
  text: string
}

export const STATUS_META: Record<TableStatus, StatusMeta> = {
  libre: { label: 'Libre', icon: 'check_circle', fill: '#cdeedd', stroke: '#146c43', text: '#00391f' },
  ocupada: { label: 'Ocupada', icon: 'group', fill: '#ffdad6', stroke: '#a93101', text: '#93000a' },
  en_captura: { label: 'En captura', icon: 'edit_note', fill: '#dbeafe', stroke: '#1d4ed8', text: '#1e3a8a' },
  esperando: { label: 'Esperando', icon: 'hourglass_top', fill: '#fef3c7', stroke: '#b45309', text: '#78350f' },
  servida: { label: 'Servida', icon: 'restaurant', fill: '#ccfbf1', stroke: '#0f766e', text: '#134e4a' },
  por_pagar: { label: 'Por pagar', icon: 'payments', fill: '#f3e8ff', stroke: '#7e22ce', text: '#581c87' },
  sucia: { label: 'Sucia', icon: 'cleaning_services', fill: '#e2e8f0', stroke: '#475569', text: '#1e293b' },
}
