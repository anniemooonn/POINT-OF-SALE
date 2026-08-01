import { useEffect, useState, type FormEvent } from 'react'
import { ToggleSwitch } from '../../../components/ToggleSwitch'
import { useSettingsStore } from '../../../stores/useSettingsStore'
import {
  CURRENCY_OPTIONS,
  LOCALE_OPTIONS,
  TIMEZONE_OPTIONS,
  type LocationSettings,
} from '../../../types/settings'
import { SaveFooter, SettingsCard, SettingsField } from './SettingsCard'

const PREVIEW_AMOUNT = 1234.5

/**
 * Vista previa con los valores del borrador (todavía sin guardar), por eso no
 * usa `formatMoney`: esa función lee la configuración ya aplicada.
 */
function previewMoney(locale: string, currency: string): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(PREVIEW_AMOUNT)
  } catch {
    return '—'
  }
}

function previewTime(locale: string, timeZone: string): string {
  try {
    return new Date().toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    })
  } catch {
    return '—'
  }
}

export function SalesSettingsForm() {
  const settings = useSettingsStore((s) => s.settings)
  const saveSettings = useSettingsStore((s) => s.saveSettings)

  const [draft, setDraft] = useState<LocationSettings>(settings)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // El input se maneja como texto para permitir estados intermedios ("8." o
  // vacío) mientras se escribe, sin que el número salte a 0.
  const [taxInput, setTaxInput] = useState(String(settings.tax_rate))

  useEffect(() => {
    setDraft(settings)
    setTaxInput(String(settings.tax_rate))
  }, [settings])

  function update<K extends keyof LocationSettings>(field: K, value: LocationSettings[K]) {
    setDraft((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
    setError(null)
  }

  function updateTax(raw: string) {
    setTaxInput(raw)
    setSaved(false)
    setError(null)
    const parsed = Number(raw)
    if (raw.trim() !== '' && Number.isFinite(parsed)) {
      setDraft((prev) => ({ ...prev, tax_rate: parsed }))
    }
  }

  const dirty =
    draft.currency_code !== settings.currency_code ||
    draft.locale !== settings.locale ||
    draft.timezone !== settings.timezone ||
    draft.tax_rate !== settings.tax_rate ||
    draft.prices_include_tax !== settings.prices_include_tax

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const tax = Number(taxInput)
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) {
      setError('El impuesto debe ser un porcentaje entre 0 y 100')
      return
    }

    setSaving(true)
    const result = await saveSettings({ ...draft, tax_rate: tax })
    setSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }
    setSaved(true)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-gutter">
      <SettingsCard
        title="Moneda y formato"
        description="Define cómo se muestran los importes y las horas en todo el sistema."
        footer={<SaveFooter dirty={dirty} saving={saving} saved={saved} error={error} />}
      >
        <div className="grid gap-stack-md md:grid-cols-3">
          <SettingsField label="Moneda">
            <select
              value={draft.currency_code}
              onChange={(e) => update('currency_code', e.target.value)}
              className="input"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </SettingsField>

          <SettingsField label="Formato de números">
            <select
              value={draft.locale}
              onChange={(e) => update('locale', e.target.value)}
              className="input"
            >
              {LOCALE_OPTIONS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </SettingsField>

          <SettingsField label="Zona horaria" hint="Define a qué día pertenece cada corte de caja.">
            <select
              value={draft.timezone}
              onChange={(e) => update('timezone', e.target.value)}
              className="input"
            >
              {TIMEZONE_OPTIONS.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                </option>
              ))}
            </select>
          </SettingsField>
        </div>

        <div className="mt-stack-md flex flex-wrap items-center gap-x-8 gap-y-2 rounded-lg bg-surface-container-low px-4 py-3">
          <span className="font-label text-label-caps text-secondary uppercase">Vista previa</span>
          <span className="text-body-lg text-on-surface">
            {previewMoney(draft.locale, draft.currency_code)}
          </span>
          <span className="text-body-lg text-on-surface">
            {previewTime(draft.locale, draft.timezone)}
          </span>
        </div>

        <div className="mt-gutter border-t border-outline-variant pt-gutter">
          <h4 className="mb-stack-sm text-headline-md text-on-surface">Impuestos</h4>
          <div className="grid gap-stack-md md:grid-cols-2">
            <SettingsField label="Tasa de impuesto (%)">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                inputMode="decimal"
                value={taxInput}
                onChange={(e) => updateTax(e.target.value)}
                className="input"
                placeholder="16"
              />
            </SettingsField>

            <div className="flex items-center justify-between gap-4 self-end rounded-lg border border-surface-variant px-4 py-3">
              <div>
                <p className="text-body-md text-on-surface">Los precios ya incluyen impuesto</p>
                <p className="text-body-md text-secondary">
                  {draft.prices_include_tax
                    ? 'El precio del menú es el precio final; el impuesto se desglosa en el ticket.'
                    : 'El impuesto se suma al total al momento de cobrar.'}
                </p>
              </div>
              <ToggleSwitch
                checked={draft.prices_include_tax}
                onChange={(v) => update('prices_include_tax', v)}
                label="Los precios ya incluyen impuesto"
              />
            </div>
          </div>
        </div>
      </SettingsCard>
    </form>
  )
}
