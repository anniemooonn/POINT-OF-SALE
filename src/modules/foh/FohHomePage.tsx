import { useEffect, useMemo, useState } from 'react'
import { AppHeader } from '../../components/AppHeader'
import { Modal } from '../../components/Modal'
import { Spinner } from '../../components/Spinner'
import { TableShapeSvg } from '../../components/TableShapeSvg'
import { useAuthStore } from '../../stores/useAuthStore'
import { useTablesStore } from '../../stores/useTablesStore'
import { CANVAS_H, CANVAS_W } from '../../lib/geometry'
import { STATUS_META, TABLE_STATUSES } from '../../types/tables'
import type { TableStatus } from '../../types/tables'

/**
 * Mapa de mesas operativo (FOH). Solo lectura sobre el layout que armó el
 * administrador en el backoffice: aquí las mesas no se mueven, se les cambia
 * el estado. Los cambios llegan de otros dispositivos por Realtime.
 */
export function FohHomePage() {
  const locationId = useAuthStore((s) => s.location?.id)
  const { sections, tables, states, loading, missingMigration, load, subscribeStates, setTableStatus } =
    useTablesStore()

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [statusTableId, setStatusTableId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!locationId) return
    // load() fija locationId en el store de forma síncrona antes de su primer
    // await, así que la suscripción puede crearse inmediatamente después.
    void load(locationId)
    const unsubscribe = subscribeStates()
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId])

  const activeSection = sections.find((s) => s.id === activeSectionId) ?? sections[0] ?? null
  const activeSectionKey = activeSection?.id ?? null
  const sectionTables = useMemo(
    () => (activeSectionKey ? tables.filter((t) => t.section_id === activeSectionKey) : []),
    [activeSectionKey, tables],
  )
  const statusTable = tables.find((t) => t.id === statusTableId) ?? null

  const statusCounts = useMemo(() => {
    const counts = {} as Record<TableStatus, number>
    for (const status of TABLE_STATUSES) counts[status] = 0
    for (const t of sectionTables) counts[states[t.id] ?? 'libre']++
    return counts
  }, [sectionTables, states])

  async function handleSetStatus(status: TableStatus) {
    if (!statusTable) return
    setStatusTableId(null)
    const result = await setTableStatus(statusTable.id, status)
    if (result.error) setError(result.error)
  }

  return (
    <div className="min-h-full bg-slate-50">
      <AppHeader title="Mapa de mesas" />

      <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-slate-400">
            <Spinner className="h-8 w-8" />
          </div>
        ) : missingMigration ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-500">
            Las tablas del mapa de mesas todavía no existen en Supabase. Pide al administrador
            correr la migración 0008.
          </div>
        ) : sections.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
            El administrador aún no configura el mapa de mesas. Se arma en Backoffice → Mesas.
          </div>
        ) : (
          <>
            {/* Secciones */}
            {sections.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {sections.map((section) => {
                  const active = activeSection?.id === section.id
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSectionId(section.id)}
                      className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                        active
                          ? 'bg-primary-container text-on-primary-container'
                          : 'border border-slate-300 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {section.name}
                    </button>
                  )
                })}
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-error/30 bg-error-container/60 px-4 py-2 text-sm text-on-error-container">
                {error}
              </div>
            )}

            {/* Plano */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <svg
                viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
                className="block w-full touch-none select-none"
              >
                {activeSection?.boundary && activeSection.boundary.length >= 3 && (
                  <polygon
                    points={activeSection.boundary.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill="#f1f5f9"
                    stroke="#cbd5e1"
                    strokeWidth={2}
                  />
                )}

                {sectionTables.map((table) => {
                  const status = states[table.id] ?? 'libre'
                  const meta = STATUS_META[status]
                  return (
                    <TableShapeSvg
                      key={table.id}
                      box={{
                        x: table.x,
                        y: table.y,
                        width: table.width,
                        height: table.height,
                        rotation: table.rotation,
                      }}
                      shape={table.shape}
                      fill={meta.fill}
                      stroke={meta.stroke}
                      cursor="pointer"
                      onClick={() => setStatusTableId(table.id)}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 18, color: meta.stroke }}
                      >
                        {meta.icon}
                      </span>
                      <span className="text-[13px] font-bold" style={{ color: meta.text }}>
                        {table.name}
                      </span>
                      <span className="text-[11px] font-medium" style={{ color: meta.text }}>
                        {meta.label}
                      </span>
                    </TableShapeSvg>
                  )
                })}

                {sectionTables.length === 0 && (
                  <text
                    x={CANVAS_W / 2}
                    y={CANVAS_H / 2}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize={18}
                  >
                    Esta sección todavía no tiene mesas
                  </text>
                )}
              </svg>
            </div>

            {/* Leyenda con conteo por estado */}
            <div className="flex flex-wrap gap-2">
              {TABLE_STATUSES.map((status) => {
                const meta = STATUS_META[status]
                return (
                  <span
                    key={status}
                    className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
                    style={{
                      backgroundColor: meta.fill,
                      borderColor: meta.stroke,
                      color: meta.text,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                      {meta.icon}
                    </span>
                    {meta.label}
                    <span className="opacity-70">· {statusCounts[status]}</span>
                  </span>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Cambio de estado manual: puente operativo hasta que la toma de orden
          y el cobro muevan los estados solos. */}
      <Modal open={statusTable !== null} onClose={() => setStatusTableId(null)}>
        {statusTable && (
          <div className="w-full space-y-4 rounded-2xl border border-surface-variant bg-surface-container-lowest p-6 shadow-[0px_12px_32px_rgba(0,0,0,0.08)]">
            <div>
              <h2 className="text-headline-md text-on-surface">{statusTable.name}</h2>
              <p className="text-sm text-secondary">
                {statusTable.capacity} comensales · ¿A qué estado pasa?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TABLE_STATUSES.map((status) => {
                const meta = STATUS_META[status]
                const current = (states[statusTable.id] ?? 'libre') === status
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => void handleSetStatus(status)}
                    className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-transform active:scale-95 ${
                      current ? '' : 'border-transparent hover:bg-surface-container-high'
                    }`}
                    style={{
                      backgroundColor: meta.fill,
                      borderColor: current ? meta.stroke : undefined,
                      color: meta.text,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                      {meta.icon}
                    </span>
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
