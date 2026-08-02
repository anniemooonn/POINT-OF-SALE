import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../../components/AppHeader'
import { Modal } from '../../components/Modal'
import { Spinner } from '../../components/Spinner'
import { TableShapeSvg } from '../../components/TableShapeSvg'
import { formatElapsed, formatMoney } from '../../lib/format'
import { useNow } from '../../lib/useNow'
import { useAuthStore } from '../../stores/useAuthStore'
import { useOrdersStore } from '../../stores/useOrdersStore'
import { useTablesStore } from '../../stores/useTablesStore'
import { CANVAS_H, CANVAS_W } from '../../lib/geometry'
import { STATUS_META, TABLE_STATUSES } from '../../types/tables'
import type { TableStatus } from '../../types/tables'
import { orderSubtotal } from '../../types/orders'
import { OpenTableDialog } from './order/OpenTableDialog'

type Dialog = 'acciones' | 'abrir' | 'estado' | null

/**
 * Mapa de mesas operativo (FOH). Solo lectura sobre el layout que armó el
 * administrador en el backoffice: aquí las mesas no se mueven, se abren, se
 * atienden y se cobran. Los cambios llegan de otros dispositivos por Realtime.
 *
 * Tocar una mesa con cuenta abierta lleva directo a su comanda, que es el
 * camino que un mesero recorre decenas de veces por turno. El cambio de estado
 * a mano sigue existiendo detrás del interruptor "Estados", para las
 * excepciones que el flujo no cubre.
 */
export function FohHomePage() {
  const navigate = useNavigate()
  const locationId = useAuthStore((s) => s.location?.id)
  const employee = useAuthStore((s) => s.activeEmployee)

  const { sections, tables, states, loading, missingMigration, load, subscribeStates, setTableStatus } =
    useTablesStore()
  const {
    byTable,
    load: loadOrders,
    subscribe: subscribeOrders,
    openTable,
  } = useOrdersStore()

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [statusMode, setStatusMode] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const now = useNow()

  useEffect(() => {
    if (!locationId) return
    // load() fija locationId en el store de forma síncrona antes de su primer
    // await, así que la suscripción puede crearse inmediatamente después.
    void load(locationId)
    void loadOrders(locationId)
    const unsubscribeStates = subscribeStates()
    const unsubscribeOrders = subscribeOrders()
    return () => {
      unsubscribeStates()
      unsubscribeOrders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId])

  const activeSection = sections.find((s) => s.id === activeSectionId) ?? sections[0] ?? null
  const activeSectionKey = activeSection?.id ?? null
  const sectionTables = useMemo(
    () => (activeSectionKey ? tables.filter((t) => t.section_id === activeSectionKey) : []),
    [activeSectionKey, tables],
  )
  const selectedTable = tables.find((t) => t.id === selectedTableId) ?? null
  const selectedOrder = selectedTableId ? (byTable[selectedTableId] ?? null) : null

  const statusCounts = useMemo(() => {
    const counts = {} as Record<TableStatus, number>
    for (const status of TABLE_STATUSES) counts[status] = 0
    for (const t of sectionTables) counts[states[t.id] ?? 'libre']++
    return counts
  }, [sectionTables, states])

  function handleTableTap(tableId: string) {
    setError(null)
    setSelectedTableId(tableId)

    if (statusMode) {
      setDialog('estado')
      return
    }
    // Mesa con cuenta abierta: el camino corto es su comanda.
    if (byTable[tableId]) {
      navigate(`/foh/mesa/${tableId}`)
      return
    }
    setDialog('acciones')
  }

  async function handleSetStatus(status: TableStatus) {
    if (!selectedTable) return
    setDialog(null)
    const result = await setTableStatus(selectedTable.id, status)
    if (result.error) setError(result.error)
  }

  /** Devuelve el mensaje de error, o `null` si la mesa quedó abierta. */
  async function handleOpenTable(guests: number): Promise<string | null> {
    if (!selectedTable || !employee) return 'No hay un empleado activo.'

    const result = await openTable(selectedTable.id, guests, employee.id)
    if (result.error) return result.error

    setDialog(null)
    navigate(`/foh/mesa/${selectedTable.id}`)
    return null
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
            {/* Secciones y modo de toque */}
            <div className="flex items-center gap-2">
              <div className="flex flex-1 gap-2 overflow-x-auto pb-1">
                {sections.length > 1 &&
                  sections.map((section) => {
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

              <button
                type="button"
                onClick={() => setStatusMode((on) => !on)}
                aria-pressed={statusMode}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                  statusMode
                    ? 'bg-slate-900 text-white'
                    : 'border border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                Estados
              </button>
            </div>

            {statusMode && (
              <p className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
                Modo estados: tocar una mesa cambia su estado a mano, sin abrir la comanda.
              </p>
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
                  const order = byTable[table.id] ?? null
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
                      onClick={() => handleTableTap(table.id)}
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
                      {order ? (
                        <span
                          className="text-[11px] font-semibold tabular-nums"
                          style={{ color: meta.text }}
                        >
                          {formatMoney(orderSubtotal(order.items))} ·{' '}
                          {formatElapsed(order.opened_at, now)}
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium" style={{ color: meta.text }}>
                          {meta.label}
                        </span>
                      )}
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

      <Modal open={dialog !== null} onClose={() => setDialog(null)}>
        {dialog === 'acciones' && selectedTable && (
          <div className="w-full space-y-4 rounded-2xl border border-surface-variant bg-surface-container-lowest p-6 shadow-[0px_12px_32px_rgba(0,0,0,0.08)]">
            <div>
              <h2 className="text-headline-md text-on-surface">{selectedTable.name}</h2>
              <p className="text-body-md text-secondary">
                {STATUS_META[states[selectedTable.id] ?? 'libre'].label} ·{' '}
                {selectedTable.capacity} lugares
              </p>
            </div>

            <button
              type="button"
              onClick={() => setDialog('abrir')}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-button text-on-primary shadow-sm transition-transform active:scale-95"
            >
              <span className="material-symbols-outlined">group_add</span>
              Abrir mesa
            </button>

            {(states[selectedTable.id] ?? 'libre') === 'sucia' && (
              <button
                type="button"
                onClick={() => void handleSetStatus('libre')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-button text-slate-700 transition-transform active:scale-95 hover:bg-slate-50"
              >
                <span className="material-symbols-outlined">cleaning_services</span>
                Ya está limpia, liberar
              </button>
            )}

            <button
              type="button"
              onClick={() => setDialog('estado')}
              className="w-full rounded-lg px-4 py-2 text-sm font-semibold text-secondary hover:bg-surface-container-high"
            >
              Cambiar estado a mano
            </button>
          </div>
        )}

        {dialog === 'abrir' && selectedTable && (
          <OpenTableDialog
            table={selectedTable}
            initialGuests={selectedOrder?.guests}
            onSubmit={handleOpenTable}
            onCancel={() => setDialog('acciones')}
          />
        )}

        {dialog === 'estado' && selectedTable && (
          <div className="w-full space-y-4 rounded-2xl border border-surface-variant bg-surface-container-lowest p-6 shadow-[0px_12px_32px_rgba(0,0,0,0.08)]">
            <div>
              <h2 className="text-headline-md text-on-surface">{selectedTable.name}</h2>
              <p className="text-sm text-secondary">
                {selectedTable.capacity} comensales · ¿A qué estado pasa?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TABLE_STATUSES.map((status) => {
                const meta = STATUS_META[status]
                const current = (states[selectedTable.id] ?? 'libre') === status
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
