/**
 * Geometría del mapa de mesas. Todo trabaja en el lienzo lógico de
 * CANVAS_W × CANVAS_H unidades; la conversión desde píxeles de pantalla la
 * hace el componente del lienzo con la matriz del SVG.
 *
 * Las cajas pueden venir rotadas (`rotation` en grados, alrededor del centro):
 * las esquinas se calculan ya giradas y tanto la contención en el polígono
 * como el solapamiento (SAT) trabajan con la caja orientada real.
 */

export interface Point {
  x: number
  y: number
}

/** Caja de una mesa: `x`/`y` son el CENTRO (igual que en la base de datos). */
export interface Box {
  x: number
  y: number
  width: number
  height: number
  /** Grados, sentido horario, alrededor del centro. Ausente = 0. */
  rotation?: number
}

export const CANVAS_W = 1000
export const CANVAS_H = 620

/** Rejilla de colocación: las posiciones se redondean a este paso. */
export const GRID_STEP = 5

/** Paso de rotación del tirador de girar. */
export const ROTATION_STEP = 15

export function snap(value: number): number {
  return Math.round(value / GRID_STEP) * GRID_STEP
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Rota un vector alrededor del origen. Grados, sentido horario (como SVG). */
export function rotatePoint(p: Point, degrees: number): Point {
  const rad = (degrees * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos }
}

/** Esquinas de la caja, ya rotadas alrededor del centro. */
export function boxCorners(box: Box): Point[] {
  const hw = box.width / 2
  const hh = box.height / 2
  const local: Point[] = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ]
  const rotation = box.rotation ?? 0
  return local.map((p) => {
    const r = rotation ? rotatePoint(p, rotation) : p
    return { x: box.x + r.x, y: box.y + r.y }
  })
}

/**
 * Semiextensiones del bounding box alineado a ejes de una caja rotada.
 * Sirve para acotar el centro al lienzo durante un arrastre.
 */
export function boxHalfExtents(box: Box): { hx: number; hy: number } {
  const rad = ((box.rotation ?? 0) * Math.PI) / 180
  const cos = Math.abs(Math.cos(rad))
  const sin = Math.abs(Math.sin(rad))
  return {
    hx: (box.width * cos + box.height * sin) / 2,
    hy: (box.width * sin + box.height * cos) / 2,
  }
}

/** Ray casting clásico: cuenta cuántas aristas cruza un rayo horizontal. */
export function pointInPolygon(p: Point, polygon: Point[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]
    const b = polygon[j]
    const crosses =
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    if (crosses) inside = !inside
  }
  return inside
}

function orientation(a: Point, b: Point, c: Point): number {
  const v = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y)
  if (v === 0) return 0
  return v > 0 ? 1 : 2
}

function onSegment(a: Point, b: Point, c: Point): boolean {
  return (
    Math.min(a.x, c.x) <= b.x &&
    b.x <= Math.max(a.x, c.x) &&
    Math.min(a.y, c.y) <= b.y &&
    b.y <= Math.max(a.y, c.y)
  )
}

export function segmentsIntersect(p1: Point, p2: Point, q1: Point, q2: Point): boolean {
  const o1 = orientation(p1, p2, q1)
  const o2 = orientation(p1, p2, q2)
  const o3 = orientation(q1, q2, p1)
  const o4 = orientation(q1, q2, p2)

  if (o1 !== o2 && o3 !== o4) return true
  if (o1 === 0 && onSegment(p1, q1, p2)) return true
  if (o2 === 0 && onSegment(p1, q2, p2)) return true
  if (o3 === 0 && onSegment(q1, p1, q2)) return true
  if (o4 === 0 && onSegment(q1, p2, q2)) return true
  return false
}

/**
 * true si la caja (rotada o no) cabe completa dentro del polígono: las cuatro
 * esquinas dentro Y ninguna arista de la caja cruza una arista del polígono
 * (la segunda condición cubre polígonos cóncavos, donde "esquinas dentro" no
 * basta).
 */
export function boxInsidePolygon(box: Box, polygon: Point[]): boolean {
  if (polygon.length < 3) return true
  const corners = boxCorners(box)
  if (!corners.every((c) => pointInPolygon(c, polygon))) return false

  for (let i = 0; i < corners.length; i++) {
    const a = corners[i]
    const b = corners[(i + 1) % corners.length]
    for (let j = 0; j < polygon.length; j++) {
      const c = polygon[j]
      const d = polygon[(j + 1) % polygon.length]
      if (segmentsIntersect(a, b, c, d)) return false
    }
  }
  return true
}

function normalize(p: Point): Point {
  const len = Math.hypot(p.x, p.y) || 1
  return { x: p.x / len, y: p.y / len }
}

/** Los dos ejes normales de un rectángulo dado por sus esquinas en orden. */
function axesOf(corners: Point[]): Point[] {
  return [
    normalize({ x: corners[1].x - corners[0].x, y: corners[1].y - corners[0].y }),
    normalize({ x: corners[3].x - corners[0].x, y: corners[3].y - corners[0].y }),
  ]
}

function project(corners: Point[], axis: Point): [number, number] {
  let min = Infinity
  let max = -Infinity
  for (const c of corners) {
    const d = c.x * axis.x + c.y * axis.y
    if (d < min) min = d
    if (d > max) max = d
  }
  return [min, max]
}

/**
 * Solapamiento entre cajas rotadas por el teorema del eje separador (SAT),
 * con un margen mínimo de respiro entre mesas (se infla una de las cajas).
 */
export function boxesOverlap(a: Box, b: Box, gap = 4): boolean {
  const ca = boxCorners({ ...a, width: a.width + gap, height: a.height + gap })
  const cb = boxCorners(b)
  const axes = [...axesOf(ca), ...axesOf(cb)]
  return axes.every((axis) => {
    const [minA, maxA] = project(ca, axis)
    const [minB, maxB] = project(cb, axis)
    return minA < maxB && minB < maxA
  })
}

/** true si la caja (rotada o no) se sale del lienzo lógico. */
export function boxOutsideCanvas(box: Box): boolean {
  return boxCorners(box).some(
    (c) => c.x < 0 || c.y < 0 || c.x > CANVAS_W || c.y > CANVAS_H,
  )
}
