import { boxInsidePolygon, boxOutsideCanvas, boxesOverlap } from '../../../lib/geometry'
import type { Box, Point } from '../../../lib/geometry'
import type { TableRow, TableShape } from '../../../types/tables'

/** Tamaño con el que nace una mesa al soltarla desde la paleta. */
export const DEFAULT_SIZE: Record<TableShape, { width: number; height: number }> = {
  rect: { width: 110, height: 70 },
  circle: { width: 85, height: 85 },
}

/**
 * Valida una colocación contra el lienzo, el límite dibujado y el resto de
 * mesas de la sección. La comparten el editor (drag & drop) y el inspector
 * (cambios de tamaño).
 */
export function placementValid(
  box: Box,
  boundary: Point[] | null,
  tables: TableRow[],
  ignoreId?: string,
): boolean {
  if (boxOutsideCanvas(box)) return false
  if (boundary && boundary.length >= 3 && !boxInsidePolygon(box, boundary)) return false
  return !tables.some((t) => t.id !== ignoreId && boxesOverlap(box, t))
}
