import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { formatMoney, parseAmount } from '../../../lib/format'
import {
  TIP_PRESETS,
  computeBill,
  round2,
  type Order,
  type OrderItem,
  type PaymentMethod,
} from '../../../types/orders'

interface PaymentDialogProps {
  tableName: string
  items: OrderItem[]
  taxRate: number
  pricesIncludeTax: boolean
  onSubmit: (params: {
    method: PaymentMethod
    tip: number
    cashReceived: number | null
  }) => Promise<{ order?: Order; error: string | null }>
  /** Se llama al cerrar el recibo; recibe el ticket cobrado. */
  onDone: (order: Order) => void
  onCancel: () => void
}

/**
 * Cobro de la cuenta. El importe que manda es solo la propina y el efectivo
 * recibido: subtotal, impuesto y total los recalcula `pay_order` en el servidor
 * al cerrar el ticket. Lo que se ve aquí es una vista previa del mismo cálculo.
 */
export function PaymentDialog({
  tableName,
  items,
  taxRate,
  pricesIncludeTax,
  onSubmit,
  onDone,
  onCancel,
}: PaymentDialogProps) {
  const [method, setMethod] = useState<PaymentMethod>('efectivo')
  /** Porcentaje elegido, o `null` cuando la propina se escribe a mano. */
  const [tipPercent, setTipPercent] = useState<number | null>(0)
  const [customTip, setCustomTip] = useState('')
  const [received, setReceived] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [paid, setPaid] = useState<Order | null>(null)

  const base = useMemo(
    () => computeBill(items, taxRate, pricesIncludeTax),
    [items, taxRate, pricesIncludeTax],
  )

  const tip =
    tipPercent !== null ? round2((base.sale * tipPercent) / 100) : (parseAmount(customTip) ?? 0)
  const total = round2(base.sale + tip)

  const receivedValue = parseAmount(received)
  const change = receivedValue !== null ? round2(receivedValue - total) : null

  if (paid) {
    return <Receipt order={paid} tableName={tableName} onDone={() => onDone(paid)} />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (method === 'efectivo' && (receivedValue === null || receivedValue < total)) {
      setError('Captura cuánto efectivo recibiste. Debe cubrir el total.')
      return
    }

    setError(null)
    setSaving(true)
    const result = await onSubmit({
      method,
      tip,
      cashReceived: method === 'efectivo' ? receivedValue : null,
    })
    setSaving(false)

    if (result.error || !result.order) {
      setError(result.error ?? 'No se pudo cobrar la cuenta')
      return
    }
    setPaid(result.order)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full space-y-4 rounded-2xl border border-surface-variant bg-surface-container-lowest p-6 shadow-[0px_12px_32px_rgba(0,0,0,0.08)]"
    >
      <div>
        <h2 className="text-headline-md text-on-surface">Cobrar {tableName}</h2>
        <p className="text-body-md text-secondary">
          Cobra primero, cierra el ticket después. No se puede reabrir.
        </p>
      </div>

      <div className="space-y-1 rounded-xl bg-surface-container-low p-3 text-sm">
        <Row label="Subtotal" value={formatMoney(base.subtotal)} />
        <Row
          label={pricesIncludeTax ? `IVA ${taxRate}% (incluido)` : `IVA ${taxRate}%`}
          value={formatMoney(base.tax)}
          muted
        />
        <Row label="Propina" value={formatMoney(tip)} />
        <div className="flex items-baseline justify-between border-t border-surface-variant pt-2">
          <span className="font-semibold text-on-surface">Total a cobrar</span>
          <span className="text-headline-md tabular-nums text-primary">{formatMoney(total)}</span>
        </div>
      </div>

      <fieldset>
        <legend className="mb-1 font-label text-label-caps text-secondary uppercase">
          Propina
        </legend>
        <div className="flex flex-wrap gap-2">
          {TIP_PRESETS.map((percent) => (
            <ChoiceChip
              key={percent}
              active={tipPercent === percent}
              onClick={() => setTipPercent(percent)}
            >
              {percent === 0 ? 'Sin propina' : `${percent}%`}
            </ChoiceChip>
          ))}
          <ChoiceChip active={tipPercent === null} onClick={() => setTipPercent(null)}>
            Otro monto
          </ChoiceChip>
        </div>
        {tipPercent === null && (
          <input
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={customTip}
            onChange={(e) => setCustomTip(e.target.value)}
            placeholder="0.00"
            aria-label="Propina en importe"
            className="input mt-2 h-12 tabular-nums"
          />
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-1 font-label text-label-caps text-secondary uppercase">
          Método de pago
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <MethodButton
            active={method === 'efectivo'}
            icon="payments"
            label="Efectivo"
            onClick={() => setMethod('efectivo')}
          />
          <MethodButton
            active={method === 'tarjeta'}
            icon="credit_card"
            label="Tarjeta"
            onClick={() => setMethod('tarjeta')}
          />
        </div>
      </fieldset>

      {method === 'efectivo' ? (
        <label className="block">
          <span className="mb-1 block font-label text-label-caps text-secondary uppercase">
            Efectivo recibido
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={received}
            onChange={(e) => setReceived(e.target.value)}
            placeholder="0.00"
            className="input h-14 text-headline-md tabular-nums"
          />
          <span className="mt-1 flex justify-between text-body-md">
            <span className="text-secondary">Cambio</span>
            <span
              className={`tabular-nums font-semibold ${
                change !== null && change < 0 ? 'text-error' : 'text-on-surface'
              }`}
            >
              {change === null ? '—' : formatMoney(Math.max(0, change))}
            </span>
          </span>
        </label>
      ) : (
        <p className="rounded-lg bg-surface-container px-4 py-2 text-body-md text-secondary">
          Cobra en la terminal física y confirma aquí solo cuando el voucher esté aprobado.
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-error-container px-4 py-2 text-body-md text-on-error-container">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-button text-secondary hover:bg-surface-container-high"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary px-6 py-2 text-button text-on-primary shadow-sm transition-transform active:scale-95 disabled:opacity-50"
        >
          {saving ? 'Cobrando...' : `Cobrar ${formatMoney(total)}`}
        </button>
      </div>
    </form>
  )
}

/** Comprobante posterior al cobro: lo que el mesero necesita leer en voz alta. */
function Receipt({
  order,
  tableName,
  onDone,
}: {
  order: Order
  tableName: string
  onDone: () => void
}) {
  const cash = order.payment_method === 'efectivo'

  return (
    <div className="w-full space-y-4 rounded-2xl border border-surface-variant bg-surface-container-lowest p-6 text-center shadow-[0px_12px_32px_rgba(0,0,0,0.08)]">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-container text-on-success-container">
        <span className="material-symbols-outlined text-[32px]">check</span>
      </div>

      <div>
        <h2 className="text-headline-md text-on-surface">Cuenta cobrada</h2>
        <p className="text-body-md text-secondary">
          {tableName} · {cash ? 'Efectivo' : 'Tarjeta'} · {formatMoney(order.total)}
        </p>
      </div>

      {cash && (
        <div className="rounded-xl bg-surface-container-low p-4">
          <p className="font-label text-label-caps text-secondary uppercase">Cambio a devolver</p>
          <p className="text-display tabular-nums text-primary">{formatMoney(order.change_due)}</p>
          <p className="text-body-md text-secondary">
            Recibiste {formatMoney(order.cash_received)}
          </p>
        </div>
      )}

      {order.tip !== null && order.tip > 0 && (
        <p className="text-body-md text-secondary">
          Propina registrada: <strong className="text-on-surface">{formatMoney(order.tip)}</strong>
        </p>
      )}

      <p className="text-body-md text-secondary">
        {tableName} queda <strong className="text-on-surface">sucia</strong>. Libérala desde el
        mapa cuando esté limpia y montada.
      </p>

      <button
        type="button"
        onClick={onDone}
        className="w-full rounded-lg bg-primary px-6 py-3 text-button text-on-primary shadow-sm transition-transform active:scale-95"
      >
        Listo, volver al mapa
      </button>
    </div>
  )
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? 'text-secondary' : 'text-on-surface'}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

function ChoiceChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? 'bg-primary text-on-primary'
          : 'border border-surface-variant text-secondary hover:bg-surface-container-high'
      }`}
    >
      {children}
    </button>
  )
}

function MethodButton({
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
      className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-button transition-transform active:scale-95 ${
        active
          ? 'border-primary bg-primary-container/10 text-primary'
          : 'border-surface-variant text-secondary hover:bg-surface-container-high'
      }`}
    >
      <span className="material-symbols-outlined">{icon}</span>
      {label}
    </button>
  )
}
