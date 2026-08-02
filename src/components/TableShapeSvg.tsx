import type { PointerEvent, ReactNode } from 'react'
import type { Box } from '../lib/geometry'
import type { TableShape } from '../types/tables'

interface TableShapeSvgProps {
  box: Box
  shape: TableShape
  fill: string
  stroke: string
  selected?: boolean
  /** Posición no permitida: pinta en rojo de error, ignorando fill/stroke. */
  invalid?: boolean
  /** Vista previa durante un arrastre: semitransparente y con borde punteado. */
  ghost?: boolean
  cursor?: string
  onPointerDown?: (e: PointerEvent<SVGGElement>) => void
  onClick?: () => void
  children?: ReactNode
}

/**
 * Una mesa dibujada sobre el SVG del mapa. La usan el editor del backoffice y
 * el mapa de FOH; solo cambian colores, contenido y qué handlers se conectan.
 * El contenido va en un foreignObject sin eventos para que el drag caiga
 * siempre en la figura.
 */
export function TableShapeSvg({
  box,
  shape,
  fill,
  stroke,
  selected,
  invalid,
  ghost,
  cursor,
  onPointerDown,
  onClick,
  children,
}: TableShapeSvgProps) {
  const finalFill = invalid ? '#ffdad6' : fill
  const finalStroke = invalid ? '#ba1a1a' : stroke
  const hw = box.width / 2
  const hh = box.height / 2
  const rotation = box.rotation ?? 0

  const shapeProps = {
    fill: finalFill,
    stroke: finalStroke,
    strokeWidth: selected ? 3 : 2,
    strokeDasharray: ghost ? '6 4' : undefined,
    // Solo gira la figura; la etiqueta (foreignObject) queda horizontal para
    // que el nombre y el estado se lean igual con la mesa rotada.
    transform: rotation ? `rotate(${rotation} ${box.x} ${box.y})` : undefined,
  }

  return (
    <g
      onPointerDown={onPointerDown}
      onClick={onClick}
      opacity={ghost ? 0.75 : 1}
      style={cursor ? { cursor } : undefined}
    >
      {shape === 'circle' ? (
        <ellipse cx={box.x} cy={box.y} rx={hw} ry={hh} {...shapeProps} />
      ) : (
        <rect x={box.x - hw} y={box.y - hh} width={box.width} height={box.height} rx={10} {...shapeProps} />
      )}
      <foreignObject
        x={box.x - hw}
        y={box.y - hh}
        width={box.width}
        height={box.height}
        style={{ pointerEvents: 'none' }}
      >
        <div className="flex h-full w-full flex-col items-center justify-center overflow-hidden text-center leading-tight">
          {children}
        </div>
      </foreignObject>
    </g>
  )
}
