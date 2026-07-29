export const MENU_CATEGORIES = ['Entradas', 'Platos Fuertes', 'Bebidas', 'Postres'] as const

export type MenuCategory = (typeof MENU_CATEGORIES)[number]

export interface Product {
  id: string
  name: string
  category: MenuCategory
  price: number
  photo_url: string | null
  active: boolean
}
