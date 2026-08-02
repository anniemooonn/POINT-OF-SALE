import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import {
  CANVAS_H,
  CANVAS_W,
  ROTATION_STEP,
  boxCorners,
  boxHalfExtents,
  boxInsidePolygon,
  clamp,
  rotatePoint,
  snap,
} from '../../../lib/geometry'
import type { Box, Point } from '../../../lib/geometry'
import type { SectionRow, TableRow, TableShape } from '../../../types/tables'
import { TableShapeSvg } from '../../../components/TableShapeSvg'
import { DEFAULT_SIZE, placementValid } from './placement'

/** Colores del editor (dentro del SVG van planos, no como clases). */
const EDITOR_FILL = '#e7eefe'
const EDITOR_STROKE = '#536478'
const SELECTED_STROKE = '#a93101'

const MIN_SIZE = 40
const MAX_SIZE = 400
/** Distancia del tirador de rotación por encima del borde superior de la mesa. */
const ROTATE_HANDLE_OFFSET = 32

type Mode = 'tables' | 'boundary'

/**
 * Un solo estado para los tres gestos sobre una mesa: mover, redimensionar
 * desde una esquina y rotar. Guarda la geometría completa en vivo para que el
 * render y la validación no mezclen datos del gesto con los de la base.
 */
interface GeoDrag {
  id: string
  kind: 'move' | 'resize' | 'rotate'
  x: number
  y: number
  width: number
  height: number
  rotation: number
  offsetX: number
  offsetY: number
  valid: boolean
  moved: boolean
}

interface PaletteDragState {
  shape: TableShape
  pos: Point | null
  valid: boolean
}

export interface GeometryPatch {
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
}

interface LayoutEditorProps {
  section: SectionRow
  /** Solo las mesas de esta sección. */
  tables: TableRow[]
  selectedTableId: string | null
  onSelectTable: (id: string | null) => void
  onGeometryChange: (id: string, patch: GeometryPatch) => void
  onAddTable: (shape: TableShape, x: number, y: number, width: number, height: number) => void
  onSaveBoundary: (points: Point[] | null) => void
  /** Avisos no bloqueantes (ej. "esa posición no es válida"). */
  onNotice: (message: string) => void
}

export function LayoutEditor({
  section,
  tables,
  selectedTableId,
  onSelectTable,
  onGeometryChange,
  onAddTable,
  onSaveBoundary,
  onNotice,
}: LayoutEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [mode, setMode] = useState<Mode>('tables')
  const [draft, setDraft] = useState<Point[]>([])
  const [dragVertex, setDragVertex] = useState<number | null>(null)
  const [geoDrag, setGeoDrag] = useState<GeoDrag | null>(null)
  const [paletteDrag, setPaletteDrag] = useState<PaletteDragState | null>(null)

  // Cambiar de sección resetea el editor: cada sección tiene su propio límite.
  useEffect(() => {
    setMode('tables')
    setDraft([])
    setGeoDrag(null)
    setDragVertex(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.id])

  /** Píxeles de pantalla → unidades del lienzo lógico, vía la matriz del SVG. */
  function toCanvas(clientX: number, clientY: number): Point | null {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return null
    const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse())
    return { x: pt.x, y: pt.y }
  }

  function isOverCanvas(clientX: number, clientY: number): boolean {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return false
    return (
      clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
    )
  }

  function validate(box: Box, ignoreId?: string): boolean {
    return placementValid(box, section.boundary, tables, ignoreId)
  }

  // ── Límite del área ─────────────────────────────────────────

  function enterBoundaryMode() {
    setDraft(section.boundary ?? [])
    setMode('boundary')
    onSelectTable(null)
  }

  function handleCanvasPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (mode !== 'boundary' || dragVertex !== null) return
    const p = toCanvas(e.clientX, e.clientY)
    if (!p) return
    setDraft([
      ...draft,
      { x: snap(clamp(p.x, 0, CANVAS_W)), y: snap(clamp(p.y, 0, CANVAS_H)) },
    ])
  }

  function handleVertexPointerDown(e: ReactPointerEvent<SVGCircleElement>, index: number) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragVertex(index)
  }

  function handleVertexPointerMove(e: ReactPointerEvent<SVGCircleElement>, index: number) {
    if (dragVertex !== index) return
    const p = toCanvas(e.clientX, e.clientY)
    if (!p) return
    const next = [...draft]
    next[index] = { x: snap(clamp(p.x, 0, CANVAS_W)), y: snap(clamp(p.y, 0, CANVAS_H)) }
    setDraft(next)
  }

  function saveBoundary() {
    const boundary = draft.length >= 3 ? draft : null
    onSaveBoundary(boundary)
    if (boundary) {
      const outside = tables.filter((t) => !boxInsidePolygon(t, boundary))
      if (outside.length > 0) {
        onNotice(
          `${outside.length} mesa(s) quedaron fuera del nuevo límite. Muévelas dentro del área.`,
        )
      }
    }
    setMode('tables')
  }

  // ── Gestos sobre mesas: mover, redimensionar, rotar ─────────

  function startGeoDrag(
    e: ReactPointerEvent<Element>,
    table: TableRow,
    kind: GeoDrag['kind'],
    pointer: Point,
  ) {
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture(e.pointerId)
    onSelectTable(table.id)
    setGeoDrag({
      id: table.id,
      kind,
      x: table.x,
      y: table.y,
      width: table.width,
      height: table.height,
      rotation: table.rotation,
      offsetX: pointer.x - table.x,
      offsetY: pointer.y - table.y,
      valid: true,
      moved: false,
    })
  }

  function handleTablePointerDown(e: ReactPointerEvent<SVGGElement>, table: TableRow) {
    if (mode !== 'tables') return
    const p = toCanvas(e.clientX, e.clientY)
    if (!p) return
    startGeoDrag(e, table, 'move', p)
  }

  function handleSvgPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (!geoDrag) return
    const p = toCanvas(e.clientX, e.clientY)
    if (!p) return

    const next: GeoDrag = { ...geoDrag, moved: true }

    if (geoDrag.kind === 'move') {
      // El centro se acota por el bounding box real de la mesa rotada.
      const { hx, hy } = boxHalfExtents(geoDrag)
      next.x = snap(clamp(p.x - geoDrag.offsetX, hx, CANVAS_W - hx))
      next.y = snap(clamp(p.y - geoDrag.offsetY, hy, CANVAS_H - hy))
    } else if (geoDrag.kind === 'resize') {
      // El puntero se lleva al marco local (sin rotación) de la mesa: la
      // esquina arrastrada define la mitad del ancho/alto desde el centro.
      const local = rotatePoint({ x: p.x - geoDrag.x, y: p.y - geoDrag.y }, -geoDrag.rotation)
      next.width = clamp(snap(Math.abs(local.x) * 2), MIN_SIZE, MAX_SIZE)
      next.height = clamp(snap(Math.abs(local.y) * 2), MIN_SIZE, MAX_SIZE)
    } else {
      // El tirador vive arriba del borde superior: +90° para que "arriba" sea 0°.
      const degrees = (Math.atan2(p.y - geoDrag.y, p.x - geoDrag.x) * 180) / Math.PI + 90
      next.rotation = ((Math.round(degrees / ROTATION_STEP) * ROTATION_STEP) % 360 + 360) % 360
    }

    next.valid = validate(next, geoDrag.id)
    setGeoDrag(next)
  }

  function handleSvgPointerUp() {
    if (!geoDrag) return
    if (geoDrag.moved) {
      if (geoDrag.valid) {
        const patch: GeometryPatch =
          geoDrag.kind === 'move'
            ? { x: geoDrag.x, y: geoDrag.y }
            : geoDrag.kind === 'resize'
              ? { width: geoDrag.width, height: geoDrag.height }
              : { rotation: geoDrag.rotation }
        onGeometryChange(geoDrag.id, patch)
      } else {
        onNotice('Esa posición no es válida: fuera del límite o encima de otra mesa.')
      }
    }
    setGeoDrag(null)
  }

  // ── Arrastre desde la paleta ────────────────────────────────

  function handlePalettePointerDown(e: ReactPointerEvent<HTMLButtonElement>, shape: TableShape) {
    e.currentTarget.setPointerCapture(e.pointerId)
    setPaletteDrag({ shape, pos: null, valid: false })
  }

  function handlePalettePointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!paletteDrag) return
    if (!isOverCanvas(e.clientX, e.clientY)) {
      if (paletteDrag.pos) setPaletteDrag({ ...paletteDrag, pos: null, valid: false })
      return
    }
    const p = toCanvas(e.clientX, e.clientY)
    if (!p) return
    const size = DEFAULT_SIZE[paletteDrag.shape]
    const pos = { x: snap(p.x), y: snap(p.y) }
    const valid = validate({ ...pos, ...size })
    setPaletteDrag({ ...paletteDrag, pos, valid })
  }

  function handlePalettePointerUp() {
    if (!paletteDrag) return
    if (paletteDrag.pos) {
      if (paletteDrag.valid) {
        const size = DEFAULT_SIZE[paletteDrag.shape]
        onAddTable(paletteDrag.shape, paletteDrag.pos.x, paletteDrag.pos.y, size.width, size.height)
      } else {
        onNotice('Ahí no cabe la mesa: suéltala dentro del área y sin encimar otra mesa.')
      }
    }
    setPaletteDrag(null)
  }

  // ── Render ──────────────────────────────────────────────────

  const boundary = section.boundary
  const paletteSize = paletteDrag ? DEFAULT_SIZE[paletteDrag.shape] : null

  /** Geometría a dibujar: la del gesto en curso, o la guardada. */
  function displayBox(table: TableRow): Box {
    if (geoDrag?.id === table.id) {
      return {
        x: geoDrag.x,
        y: geoDrag.y,
        width: geoDrag.width,
        height: geoDrag.height,
        rotation: geoDrag.rotation,
      }
    }
    return { x: table.x, y: table.y, width: table.width, height: table.height, rotation: table.rotation }
  }

  const selectedTable =
    mode === 'tables' && !paletteDrag
      ? tables.find((t) => t.id === selectedTableId) ?? null
      : null

  return (
    <div className="space-y-3">
      {/* Barra de herramientas */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-outline-variant bg-surface-container-lowest p-1">
          <ToolbarToggle
            active={mode === 'tables'}
            icon="table_restaurant"
            label="Mesas"
            onClick={() => setMode('tables')}
          />
          <ToolbarToggle
            active={mode === 'boundary'}
            icon="polyline"
            label="Límite del área"
            onClick={enterBoundaryMode}
          />
        </div>

        {mode === 'tables' ? (
          <>
            <div className="flex items-center gap-2">
              <PaletteItem
                shape="rect"
                icon="crop_landscape"
                label="Rectangular"
                onPointerDown={handlePalettePointerDown}
                onPointerMove={handlePalettePointerMove}
                onPointerUp={handlePalettePointerUp}
              />
              <PaletteItem
                shape="circle"
                icon="circle"
                label="Redonda"
                onPointerDown={handlePalettePointerDown}
                onPointerMove={handlePalettePointerMove}
                onPointerUp={handlePalettePointerUp}
              />
            </div>
            <p className="text-sm text-secondary">
              Arrastra una mesa al plano. Con la mesa seleccionada: esquinas para el tamaño, tirador
              superior para rotar.
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setDraft(draft.slice(0, -1))}
              disabled={draft.length === 0}
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm text-secondary hover:bg-surface-container-high disabled:opacity-40"
            >
              Deshacer punto
            </button>
            <button
              type="button"
              onClick={() => setDraft([])}
              disabled={draft.length === 0}
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-sm text-secondary hover:bg-surface-container-high disabled:opacity-40"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={saveBoundary}
              disabled={draft.length > 0 && draft.length < 3}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-on-primary shadow-sm disabled:opacity-40"
            >
              {draft.length === 0 ? 'Guardar sin límite' : 'Guardar límite'}
            </button>
            <p className="text-sm text-secondary">
              Toca el plano para colocar los vértices que delimitan el espacio de trabajo.
            </p>
          </>
        )}
      </div>

      {/* Lienzo */}
      <div className="overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
          className="block w-full touch-none select-none"
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleSvgPointerMove}
          onPointerUp={handleSvgPointerUp}
        >
          <defs>
            <pattern id="editor-grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#dce2f3" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width={CANVAS_W} height={CANVAS_H} fill="url(#editor-grid)" />

          {/* Límite guardado (modo mesas) */}
          {mode === 'tables' && boundary && boundary.length >= 3 && (
            <polygon
              points={boundary.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="#a93101"
              fillOpacity={0.04}
              stroke="#cb491c"
              strokeWidth={2}
              strokeDasharray="8 6"
            />
          )}

          {/* Dibujo del límite (modo límite) */}
          {mode === 'boundary' && (
            <g>
              {draft.length >= 3 && (
                <polygon
                  points={draft.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="#a93101"
                  fillOpacity={0.06}
                  stroke="none"
                />
              )}
              {draft.length >= 2 && (
                <polyline
                  points={draft.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#cb491c"
                  strokeWidth={2.5}
                />
              )}
              {draft.length >= 3 && (
                <line
                  x1={draft[draft.length - 1].x}
                  y1={draft[draft.length - 1].y}
                  x2={draft[0].x}
                  y2={draft[0].y}
                  stroke="#cb491c"
                  strokeWidth={2.5}
                  strokeDasharray="6 5"
                />
              )}
              {draft.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={9}
                  fill="#ffffff"
                  stroke="#a93101"
                  strokeWidth={2.5}
                  style={{ cursor: 'grab' }}
                  onPointerDown={(e) => handleVertexPointerDown(e, i)}
                  onPointerMove={(e) => handleVertexPointerMove(e, i)}
                  onPointerUp={() => setDragVertex(null)}
                />
              ))}
            </g>
          )}

          {/* Mesas */}
          {tables.map((table) => {
            const box = displayBox(table)
            const selected = selectedTableId === table.id
            const invalid = geoDrag?.id === table.id && !geoDrag.valid
            return (
              <TableShapeSvg
                key={table.id}
                box={box}
                shape={table.shape}
                fill={EDITOR_FILL}
                stroke={selected ? SELECTED_STROKE : EDITOR_STROKE}
                selected={selected}
                invalid={invalid}
                cursor={mode === 'tables' ? 'grab' : undefined}
                onPointerDown={(e) => handleTablePointerDown(e, table)}
              >
                <span className="text-[13px] font-semibold text-on-surface">{table.name}</span>
                <span className="flex items-center gap-0.5 text-[11px] text-secondary">
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                    group
                  </span>
                  {table.capacity}
                </span>
              </TableShapeSvg>
            )
          })}

          {/* Tiradores de la mesa seleccionada: esquinas = tamaño, superior = rotar */}
          {selectedTable && (
            <SelectionHandles
              box={displayBox(selectedTable)}
              invalid={geoDrag?.id === selectedTable.id && !geoDrag.valid}
              onResizeStart={(e) => {
                const p = toCanvas(e.clientX, e.clientY)
                if (p) startGeoDrag(e, selectedTable, 'resize', p)
              }}
              onRotateStart={(e) => {
                const p = toCanvas(e.clientX, e.clientY)
                if (p) startGeoDrag(e, selectedTable, 'rotate', p)
              }}
            />
          )}

          {/* Vista previa al arrastrar desde la paleta */}
          {paletteDrag?.pos && paletteSize && (
            <TableShapeSvg
              box={{ ...paletteDrag.pos, ...paletteSize }}
              shape={paletteDrag.shape}
              fill={EDITOR_FILL}
              stroke={EDITOR_STROKE}
              invalid={!paletteDrag.valid}
              ghost
            />
          )}

          {/* Estado vacío */}
          {mode === 'tables' && tables.length === 0 && !paletteDrag?.pos && (
            <text
              x={CANVAS_W / 2}
              y={CANVAS_H / 2}
              textAnchor="middle"
              fill="#4f6073"
              fontSize={18}
            >
              Arrastra aquí tu primera mesa desde la paleta
            </text>
          )}
        </svg>
      </div>
    </div>
  )
}

const HANDLE_SIZE = 14

function SelectionHandles({
  box,
  invalid,
  onResizeStart,
  onRotateStart,
}: {
  box: Box
  invalid: boolean
  onResizeStart: (e: ReactPointerEvent<SVGRectElement>) => void
  onRotateStart: (e: ReactPointerEvent<SVGCircleElement>) => void
}) {
  const stroke = invalid ? '#ba1a1a' : SELECTED_STROKE
  const rotation = box.rotation ?? 0
  const corners = boxCorners(box)
  // Punto medio del borde superior y posición del tirador, ambos girados.
  const topEdge = {
    x: box.x + rotatePoint({ x: 0, y: -box.height / 2 }, rotation).x,
    y: box.y + rotatePoint({ x: 0, y: -box.height / 2 }, rotation).y,
  }
  const handleOffset = rotatePoint({ x: 0, y: -box.height / 2 - ROTATE_HANDLE_OFFSET }, rotation)
  const rotateHandle = { x: box.x + handleOffset.x, y: box.y + handleOffset.y }

  return (
    <g>
      <line
        x1={topEdge.x}
        y1={topEdge.y}
        x2={rotateHandle.x}
        y2={rotateHandle.y}
        stroke={stroke}
        strokeWidth={1.5}
        strokeDasharray="3 3"
      />
      <circle
        cx={rotateHandle.x}
        cy={rotateHandle.y}
        r={9}
        fill="#ffffff"
        stroke={stroke}
        strokeWidth={2}
        style={{ cursor: 'grab' }}
        onPointerDown={onRotateStart}
      />
      {corners.map((c, i) => (
        <rect
          key={i}
          x={c.x - HANDLE_SIZE / 2}
          y={c.y - HANDLE_SIZE / 2}
          width={HANDLE_SIZE}
          height={HANDLE_SIZE}
          rx={3}
          fill="#ffffff"
          stroke={stroke}
          strokeWidth={2}
          transform={rotation ? `rotate(${rotation} ${c.x} ${c.y})` : undefined}
          style={{ cursor: 'nwse-resize' }}
          onPointerDown={onResizeStart}
        />
      ))}
    </g>
  )
}

function ToolbarToggle({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
        active ? 'bg-primary-container text-on-primary-container' : 'text-secondary hover:bg-surface-container-high'
      }`}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
        {icon}
      </span>
      {label}
    </button>
  )
}

function PaletteItem({
  shape,
  icon,
  label,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: {
  shape: TableShape
  icon: string
  label: string
  onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>, shape: TableShape) => void
  onPointerMove: (e: ReactPointerEvent<HTMLButtonElement>) => void
  onPointerUp: () => void
}) {
  return (
    <button
      type="button"
      onPointerDown={(e) => onPointerDown(e, shape)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="flex cursor-grab touch-none items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-sm font-semibold text-on-surface shadow-sm hover:bg-surface-container-high"
    >
      <span className="material-symbols-outlined text-secondary" style={{ fontSize: 18 }}>
        {icon}
      </span>
      {label}
    </button>
  )
}
