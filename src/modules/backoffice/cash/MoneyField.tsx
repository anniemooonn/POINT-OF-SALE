interface MoneyFieldProps {
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  autoFocus?: boolean
}

/**
 * Captura de un importe en efectivo. El valor se maneja como texto para
 * permitir estados intermedios ("2000." o vacío) mientras se escribe, sin que
 * el número salte a 0; quien lo usa lo convierte con `parseAmount` al enviar.
 */
export function MoneyField({ label, hint, value, onChange, autoFocus }: MoneyFieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block font-label text-label-caps text-secondary uppercase">
        {label}
      </span>
      <input
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        required
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.00"
        className="input h-14 text-headline-lg tabular-nums"
      />
      {hint && <span className="mt-1 block text-body-md text-secondary">{hint}</span>}
    </label>
  )
}
