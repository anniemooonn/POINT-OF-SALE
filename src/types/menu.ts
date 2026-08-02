/**
 * Las categorías las define el dueño en Backoffice → Configuración
 * (tabla `menu_categories`), por eso `category` es texto libre y no una unión
 * fija. La lista viva está en `useSettingsStore`.
 */

/** Pseudo-categoría del filtro del menú: no existe en la base. */
export const ALL_CATEGORIES = 'Todas'

export interface Product {
  id: string
  name: string
  category: string
  price: number
  cost: number | null
  photo_url: string | null
  active: boolean
  in_stock: boolean
  /** Con fecha = fuera del menú pero conservado para el historial de ventas. */
  archived_at: string | null
}
