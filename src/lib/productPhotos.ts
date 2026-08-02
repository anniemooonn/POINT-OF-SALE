import { supabase } from './supabase'
import type { Product } from '../types/menu'

const BUCKET = 'product-photos'
const PUBLIC_URL_MARKER = `/storage/v1/object/public/${BUCKET}/`

/** Ruta dentro del bucket si la URL es una foto propia; null para enlaces externos. */
export function productPhotoPath(url: string | null): string | null {
  if (!url) return null
  const index = url.indexOf(PUBLIC_URL_MARKER)
  if (index === -1) return null
  return decodeURIComponent(url.slice(index + PUBLIC_URL_MARKER.length))
}

/**
 * Borra del bucket la foto `url`, salvo que otro producto la siga usando
 * (pasa al duplicar un producto: ambos comparten el mismo archivo). Los
 * enlaces externos se ignoran. Best-effort: si el borrado falla, el archivo
 * queda huérfano pero el flujo del usuario no se interrumpe.
 */
export async function removeProductPhotoIfUnused(
  url: string | null,
  products: Product[],
  exceptProductId?: string,
): Promise<void> {
  const path = productPhotoPath(url)
  if (!path) return
  const stillUsed = products.some((p) => p.id !== exceptProductId && p.photo_url === url)
  if (stillUsed) return
  await supabase.storage.from(BUCKET).remove([path])
}
