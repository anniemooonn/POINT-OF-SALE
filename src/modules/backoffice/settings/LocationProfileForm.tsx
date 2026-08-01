import { useEffect, useState, type FormEvent } from 'react'
import { useAuthStore } from '../../../stores/useAuthStore'
import { useSettingsStore } from '../../../stores/useSettingsStore'
import type { LocationProfile } from '../../../types/settings'
import { SaveFooter, SettingsCard, SettingsField } from './SettingsCard'

interface Draft {
  name: string
  address: string
  phone: string
  tax_id: string
}

function toDraft(profile: LocationProfile | null): Draft {
  return {
    name: profile?.name ?? '',
    address: profile?.address ?? '',
    phone: profile?.phone ?? '',
    tax_id: profile?.tax_id ?? '',
  }
}

/** Campo vacío = "sin capturar", no cadena vacía. */
function orNull(value: string): string | null {
  return value.trim() || null
}

export function LocationProfileForm() {
  const profile = useSettingsStore((s) => s.profile)
  const saveProfile = useSettingsStore((s) => s.saveProfile)
  const setLocationName = useAuthStore((s) => s.setLocationName)

  const [draft, setDraft] = useState<Draft>(() => toDraft(profile))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // El perfil llega asíncrono (y se reemplaza al guardar): el borrador se
  // resincroniza con lo que hay en la base.
  useEffect(() => {
    setDraft(toDraft(profile))
  }, [profile])

  const stored = toDraft(profile)
  const dirty = (Object.keys(draft) as (keyof Draft)[]).some((k) => draft[k] !== stored[k])

  function update(field: keyof Draft, value: string) {
    setDraft((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
    setError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const name = draft.name.trim()
    if (!name) {
      setError('El nombre del restaurante no puede quedar vacío')
      return
    }

    setSaving(true)
    const result = await saveProfile({
      name,
      address: orNull(draft.address),
      phone: orNull(draft.phone),
      tax_id: orNull(draft.tax_id),
    })
    setSaving(false)

    if (result.error) {
      setError(result.error)
      return
    }
    setLocationName(name)
    setSaved(true)
  }

  return (
    <form onSubmit={handleSubmit}>
      <SettingsCard
        title="Datos del restaurante"
        description="Aparecen en el ticket impreso y en los reportes de corte."
        footer={<SaveFooter dirty={dirty} saving={saving} saved={saved} error={error} />}
      >
        <div className="grid gap-stack-md md:grid-cols-2">
          <SettingsField label="Nombre">
            <input
              required
              value={draft.name}
              onChange={(e) => update('name', e.target.value)}
              className="input"
              placeholder="Mi Restaurante"
            />
          </SettingsField>

          <SettingsField label="Teléfono">
            <input
              type="tel"
              value={draft.phone}
              onChange={(e) => update('phone', e.target.value)}
              className="input"
              placeholder="55 1234 5678"
            />
          </SettingsField>

          <SettingsField label="Dirección">
            <input
              value={draft.address}
              onChange={(e) => update('address', e.target.value)}
              className="input"
              placeholder="Calle, número, colonia, ciudad"
            />
          </SettingsField>

          <SettingsField label="RFC / Identificación fiscal">
            <input
              value={draft.tax_id}
              onChange={(e) => update('tax_id', e.target.value.toUpperCase())}
              className="input"
              placeholder="XAXX010101000"
            />
          </SettingsField>
        </div>
      </SettingsCard>
    </form>
  )
}
