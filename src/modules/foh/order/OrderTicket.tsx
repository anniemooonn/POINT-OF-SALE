import { formatMoney, formatTime } from '../../../lib/format'
import { ITEM_STATUS_META, type BillBreakdown, type OrderItem } from '../../../types/orders'

interface OrderTicketProps {
  items: OrderItem[]
  bill: BillBreakdown
  pricesIncludeTax: boolean
  taxRate: number
  onQty: (item: OrderItem, qty: number) => void
  onRemove: (item: OrderItem) => void
  onNote: (item: OrderItem) => void
}

/**
 * La comanda de la mesa. Las líneas en 'pendiente' son borrador y se pueden
 * editar; en cuanto salen a cocina se vuelven de solo lectura, porque cambiar
 * en pantalla algo que ya está en la plancha no cambia la realidad.
 */
export function OrderTicket({
  items,
  bill,
  pricesIncludeTax,
  taxRate,
  onQty,
  onRemove,
  onNote,
}: OrderTicketProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-slate-400">
        <span className="material-symbols-outlined text-[40px]">receipt_long</span>
        <p className="text-sm">
          La comanda está vacía. Toca los platillos del menú para capturarlos.
        </p>
      </div>
    )
  }

  return (
    <>
      <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
        {items.map((item) => {
          const meta = ITEM_STATUS_META[item.status]
          const editable = item.status === 'pendiente'
          return (
            <li key={item.id} className="p-3">
              <div className="flex items-start gap-2">
                <span className="min-w-8 text-center text-sm font-bold tabular-nums text-slate-900">
                  {item.qty}×
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-tight text-slate-900">{item.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.chip}`}
                    >
                      <span className="material-symbols-outlined text-[13px]">{meta.icon}</span>
                      {meta.label}
                    </span>
                    {item.sent_at && (
                      <span className="text-[11px] text-slate-400">{formatTime(item.sent_at)}</span>
                    )}
                  </div>
                  {item.notes && (
                    <p className="mt-1 flex items-start gap-1 text-xs italic text-amber-700">
                      <span className="material-symbols-outlined text-[14px]">sticky_note_2</span>
                      {item.notes}
                    </p>
                  )}
                </div>
                <span className="text-sm tabular-nums text-slate-600">
                  {formatMoney(item.qty * item.unit_price)}
                </span>
              </div>

              {editable && (
                <div className="mt-2 flex items-center gap-1 pl-10">
                  <QtyButton
                    icon="remove"
                    label={`Quitar una unidad de ${item.name}`}
                    onClick={() => onQty(item, item.qty - 1)}
                  />
                  <QtyButton
                    icon="add"
                    label={`Agregar una unidad de ${item.name}`}
                    onClick={() => onQty(item, item.qty + 1)}
                  />
                  <button
                    type="button"
                    onClick={() => onNote(item)}
                    className="ml-1 flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">sticky_note_2</span>
                    {item.notes ? 'Editar nota' : 'Nota'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(item)}
                    aria-label={`Quitar ${item.name} de la comanda`}
                    className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-error-container hover:text-on-error-container"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <div className="space-y-1 border-t border-slate-200 bg-slate-50 p-3 text-sm">
        <Row label="Subtotal" value={formatMoney(bill.subtotal)} />
        <Row
          label={pricesIncludeTax ? `IVA ${taxRate}% (incluido)` : `IVA ${taxRate}%`}
          value={formatMoney(bill.tax)}
          muted
        />
        <div className="flex items-baseline justify-between border-t border-slate-200 pt-2">
          <span className="font-semibold text-slate-900">Total</span>
          <span className="text-xl font-bold tabular-nums text-slate-900">
            {formatMoney(bill.sale)}
          </span>
        </div>
      </div>
    </>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? 'text-slate-500' : 'text-slate-700'}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

function QtyButton({
  icon,
  label,
  onClick,
}: {
  icon: string
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-700 transition-transform active:scale-90 hover:bg-slate-100"
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </button>
  )
}
