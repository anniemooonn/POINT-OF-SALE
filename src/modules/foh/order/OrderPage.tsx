import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { formatElapsed, formatMoney } from '../../../lib/format'
import { useNow } from '../../../lib/useNow'
import { useAuthStore } from '../../../stores/useAuthStore'
import { useOrdersStore } from '../../../stores/useOrdersStore'
import { useSettingsStore } from '../../../stores/useSettingsStore'
import { useTablesStore } from '../../../stores/useTablesStore'
import { Modal } from '../../../components/Modal'
import { Spinner } from '../../../components/Spinner'
import type { Product } from '../../../types/menu'
import { billableItems, computeBill, type OrderItem } from '../../../types/orders'
import { NoteDialog } from './NoteDialog'
import { OpenTableDialog } from './OpenTableDialog'
import { OrderTicket } from './OrderTicket'
import { PaymentDialog } from './PaymentDialog'
import { ProductPicker } from './ProductPicker'

type Dialog = 'guests' | 'note' | 'pay' | null
type MobileView = 'menu' | 'comanda'

/** Referencia estable para la mesa sin cuenta: evita recalcular los `useMemo`. */
const NO_ITEMS: OrderItem[] = []

/**
 * Comanda de una mesa: catálogo a la izquierda, cuenta a la derecha. Es la
 * pantalla donde el mesero pasa el turno, así que las acciones no se acumulan:
 * el botón principal siempre es el único paso que toca ahora (enviar, servir o
 * cobrar), y el resto queda como acción secundaria.
 */
export function OrderPage() {
  const { tableId = '' } = useParams()
  const navigate = useNavigate()

  const locationId = useAuthStore((s) => s.location?.id)
  const employee = useAuthStore((s) => s.activeEmployee)
  const settings = useSettingsStore((s) => s.settings)

  const { tables, states, load: loadTables, setTableStatus } = useTablesStore()
  const {
    byTable,
    loading: ordersLoading,
    missingMigration,
    load: loadOrders,
    subscribe,
    openTable,
    addItem,
    setItemQty,
    setItemNotes,
    removeItem,
    sendToKitchen,
    markServed,
    payOrder,
    cancelOrder,
  } = useOrdersStore()

  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [noteItem, setNoteItem] = useState<OrderItem | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [mobileView, setMobileView] = useState<MobileView>('menu')

  const now = useNow()

  useEffect(() => {
    if (!locationId) return
    if (useTablesStore.getState().tables.length === 0) void loadTables(locationId)
    void loadOrders(locationId)
    const unsubscribe = subscribe()
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId])

  useEffect(() => {
    if (!locationId) return
    supabase
      .from('products')
      .select('id, name, category, price, cost, photo_url, active, in_stock')
      .eq('location_id', locationId)
      .order('name')
      .then(({ data }) => {
        setProducts(data ?? [])
        setProductsLoading(false)
      })
  }, [locationId])

  const table = tables.find((t) => t.id === tableId) ?? null
  const order = byTable[tableId] ?? null
  const status = states[tableId] ?? 'libre'

  const items = order?.items ?? NO_ITEMS
  const billable = useMemo(() => billableItems(items), [items])
  const bill = useMemo(
    () => computeBill(items, settings.tax_rate, settings.prices_include_tax),
    [items, settings.tax_rate, settings.prices_include_tax],
  )

  const pending = billable.filter((i) => i.status === 'pendiente')
  const inKitchen = billable.filter((i) => i.status === 'enviado')
  const ready = billable.filter((i) => i.status === 'listo')

  const countsByProduct = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of billable) {
      if (item.product_id) counts[item.product_id] = (counts[item.product_id] ?? 0) + item.qty
    }
    return counts
  }, [billable])

  /** Envuelve una acción del store: apaga los botones y muestra el error. */
  async function run(action: () => Promise<{ error: string | null }>) {
    setBusy(true)
    setError(null)
    const result = await action()
    setBusy(false)
    if (result.error) setError(result.error)
    return result.error === null
  }

  async function handleServed(orderId: string) {
    setBusy(true)
    setError(null)
    const result = await markServed(orderId)
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    // Servir una parte no cambia el estado de la mesa; conviene decir por qué.
    if (inKitchen.length > 0) {
      setError(
        `Se marcaron ${result.served} platillos como servidos. La mesa sigue en "Esperando": ` +
          `todavía hay ${inKitchen.length} en cocina.`,
      )
    }
  }

  async function handleRequestBill() {
    await run(() => setTableStatus(tableId, 'por_pagar'))
  }

  async function handleCancelOrder(orderId: string) {
    const ok = await run(() => cancelOrder(orderId))
    if (ok) navigate('/foh', { replace: true })
  }

  /**
   * Al cerrar el recibo se vuelve al mapa y la mesa se queda en 'sucia', que es
   * donde la dejó `pay_order`. Liberarla es un acto aparte y posterior: pasa
   * cuando la mesa está limpia y montada, no cuando se cobró.
   */
  function handleAfterPayment() {
    setDialog(null)
    navigate('/foh', { replace: true })
  }

  const loading = ordersLoading || productsLoading

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (missingMigration) {
    return (
      <Placeholder
        onBack={() => navigate('/foh')}
        text="Las tablas de comandas todavía no existen en Supabase. Pide al administrador correr la migración 20260802150000_orders_and_payments."
      />
    )
  }

  if (!table || !employee) {
    return <Placeholder onBack={() => navigate('/foh')} text="Esta mesa ya no existe en el mapa." />
  }

  if (!order) {
    return (
      <Placeholder
        onBack={() => navigate('/foh')}
        text={`${table.name} no tiene una cuenta abierta. Ábrela desde el mapa de mesas.`}
      />
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      {/* Barra de la mesa */}
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => navigate('/foh')}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
          aria-label="Volver al mapa de mesas"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>

        <div className="min-w-0">
          <h1 className="text-lg font-semibold leading-tight text-slate-900">{table.name}</h1>
          <button
            type="button"
            onClick={() => setDialog('guests')}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
          >
            <span className="material-symbols-outlined text-[14px]">group</span>
            {order.guests} {order.guests === 1 ? 'comensal' : 'comensales'}
            <span className="mx-1 text-slate-300">·</span>
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            {formatElapsed(order.opened_at, now)}
          </button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {inKitchen.length > 0 && (
            <Pill icon="hourglass_top" tone="amber">
              {inKitchen.length} en cocina
            </Pill>
          )}
          {ready.length > 0 && (
            <Pill icon="room_service" tone="teal">
              {ready.length} listo{ready.length === 1 ? '' : 's'}
            </Pill>
          )}
          {status === 'por_pagar' && (
            <Pill icon="payments" tone="purple">
              Por pagar
            </Pill>
          )}
        </div>
      </header>

      {/* Selector de panel en pantallas chicas */}
      <div className="flex gap-1 border-b border-slate-200 bg-white px-4 pb-2 lg:hidden">
        <TabButton
          active={mobileView === 'menu'}
          onClick={() => setMobileView('menu')}
          label="Menú"
        />
        <TabButton
          active={mobileView === 'comanda'}
          onClick={() => setMobileView('comanda')}
          label={`Comanda (${billable.length})`}
        />
      </div>

      {error && (
        <p className="border-b border-error/20 bg-error-container/60 px-4 py-2 text-sm text-on-error-container">
          {error}
        </p>
      )}

      <div className="grid min-h-0 flex-1 lg:grid-cols-[1fr_380px]">
        <section
          className={`min-h-0 overflow-hidden p-4 ${mobileView === 'menu' ? '' : 'hidden lg:block'}`}
        >
          <ProductPicker
            products={products}
            countsByProduct={countsByProduct}
            onPick={(product) => void run(() => addItem(order.id, product))}
          />
        </section>

        <section
          className={`flex min-h-0 flex-col border-slate-200 bg-white lg:border-l ${
            mobileView === 'comanda' ? '' : 'hidden lg:flex'
          }`}
        >
          <OrderTicket
            items={items}
            bill={bill}
            taxRate={settings.tax_rate}
            pricesIncludeTax={settings.prices_include_tax}
            onQty={(item, qty) => void run(() => setItemQty(order.id, item.id, qty))}
            onRemove={(item) => void run(() => removeItem(order.id, item.id))}
            onNote={(item) => {
              setNoteItem(item)
              setDialog('note')
            }}
          />

          {/* Acciones: el botón principal es el paso que toca ahora */}
          <div className="space-y-2 border-t border-slate-200 p-3">
            {pending.length > 0 ? (
              <PrimaryButton
                icon="outdoor_grill"
                disabled={busy}
                onClick={() => void run(() => sendToKitchen(order.id))}
              >
                Enviar a cocina ({pending.reduce((n, i) => n + i.qty, 0)})
              </PrimaryButton>
            ) : ready.length > 0 ? (
              <PrimaryButton
                icon="restaurant"
                disabled={busy}
                onClick={() => void handleServed(order.id)}
              >
                Marcar como servida ({ready.length})
              </PrimaryButton>
            ) : (
              <PrimaryButton
                icon="payments"
                disabled={busy || billable.length === 0}
                onClick={() => setDialog('pay')}
              >
                Cobrar {formatMoney(bill.sale)}
              </PrimaryButton>
            )}

            <div className="flex gap-2">
              {pending.length === 0 && billable.length > 0 && status !== 'por_pagar' && (
                <SecondaryButton icon="receipt_long" disabled={busy} onClick={handleRequestBill}>
                  Pedir la cuenta
                </SecondaryButton>
              )}
              {billable.length === 0 && (
                <SecondaryButton
                  icon="cancel"
                  disabled={busy}
                  onClick={() => void handleCancelOrder(order.id)}
                >
                  Cerrar mesa sin consumo
                </SecondaryButton>
              )}
            </div>
          </div>
        </section>
      </div>

      <Modal
        open={dialog !== null}
        onClose={() => {
          setDialog(null)
          setNoteItem(null)
        }}
      >
        {dialog === 'guests' && (
          <OpenTableDialog
            table={table}
            initialGuests={order.guests}
            onSubmit={async (guests) => {
              const result = await openTable(tableId, guests, employee.id)
              if (result.error) return result.error
              setDialog(null)
              return null
            }}
            onCancel={() => setDialog(null)}
          />
        )}

        {dialog === 'note' && noteItem && (
          <NoteDialog
            item={noteItem}
            onSubmit={async (notes) => {
              const result = await setItemNotes(order.id, noteItem.id, notes)
              if (result.error) return result.error
              setDialog(null)
              setNoteItem(null)
              return null
            }}
            onCancel={() => {
              setDialog(null)
              setNoteItem(null)
            }}
          />
        )}

        {dialog === 'pay' && (
          <PaymentDialog
            tableName={table.name}
            items={items}
            taxRate={settings.tax_rate}
            pricesIncludeTax={settings.prices_include_tax}
            onSubmit={({ method, tip, cashReceived }) =>
              payOrder({ orderId: order.id, method, tip, cashReceived, employeeId: employee.id })
            }
            onDone={handleAfterPayment}
            onCancel={() => setDialog(null)}
          />
        )}
      </Modal>
    </div>
  )
}

function Placeholder({ text, onBack }: { text: string; onBack: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-slate-50 p-8 text-center">
      <p className="max-w-md text-slate-500">{text}</p>
      <button
        type="button"
        onClick={onBack}
        className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-white"
      >
        Volver al mapa
      </button>
    </div>
  )
}

const PILL_TONES = {
  amber: 'bg-amber-100 text-amber-800',
  teal: 'bg-teal-100 text-teal-800',
  purple: 'bg-purple-100 text-purple-800',
} as const

function Pill({
  icon,
  tone,
  children,
}: {
  icon: string
  tone: keyof typeof PILL_TONES
  children: ReactNode
}) {
  return (
    <span
      className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${PILL_TONES[tone]}`}
    >
      <span className="material-symbols-outlined text-[14px]">{icon}</span>
      {children}
    </span>
  )
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold ${
        active ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-600'
      }`}
    >
      {label}
    </button>
  )
}

function PrimaryButton({
  icon,
  disabled,
  onClick,
  children,
}: {
  icon: string
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-button text-on-primary shadow-sm transition-transform active:scale-95 disabled:opacity-40"
    >
      <span className="material-symbols-outlined">{icon}</span>
      {children}
    </button>
  )
}

function SecondaryButton({
  icon,
  disabled,
  onClick,
  children,
}: {
  icon: string
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition-transform active:scale-95 hover:bg-slate-50 disabled:opacity-40"
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      {children}
    </button>
  )
}
