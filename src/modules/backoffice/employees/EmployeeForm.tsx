import { useState, type FormEvent } from 'react'
import { supabase } from '../../../lib/supabase'
import { ROLE_LABEL } from '../../../lib/roles'
import type { EmployeeRole } from '../../../types/auth'

const ROLES: EmployeeRole[] = ['mesero', 'cocina', 'caja', 'admin']

interface EmployeeFormProps {
  locationId: string
  onCreated: () => void
  onCancel: () => void
}

export function EmployeeForm({ locationId, onCreated, onCancel }: EmployeeFormProps) {
  const [name, setName] = useState('')
  const [role, setRole] = useState<EmployeeRole>('mesero')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!/^[0-9]{4,6}$/.test(pin)) {
      setError('El PIN debe tener entre 4 y 6 dígitos')
      return
    }
    setLoading(true)
    const { error } = await supabase.rpc('create_employee', {
      p_location_id: locationId,
      p_name: name,
      p_role: role,
      p_pin: pin,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    onCreated()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md space-y-4 rounded-2xl border border-surface-variant bg-surface-container-lowest p-8 shadow-[0px_12px_32px_rgba(0,0,0,0.08)]"
    >
      <div>
        <h2 className="text-headline-md text-on-surface">Nuevo empleado</h2>
        <p className="text-body-md text-secondary">
          Define su rol y el PIN con el que entrará al sistema.
        </p>
      </div>

      <label className="block">
        <span className="mb-1 block font-label text-label-caps text-secondary uppercase">Nombre</span>
        <input required value={name} onChange={(e) => setName(e.target.value)} className="input" />
      </label>

      <label className="block">
        <span className="mb-1 block font-label text-label-caps text-secondary uppercase">Rol</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as EmployeeRole)}
          className="input"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block font-label text-label-caps text-secondary uppercase">
          PIN (4 a 6 dígitos)
        </span>
        <input
          required
          inputMode="numeric"
          pattern="[0-9]{4,6}"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          className="input max-w-40 tracking-widest"
          placeholder="••••"
        />
      </label>

      {error && (
        <p className="rounded-lg bg-error-container px-4 py-2 text-body-md text-on-error-container">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-button text-secondary hover:bg-surface-container-high"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-6 py-2 text-button text-on-primary shadow-sm transition-transform active:scale-95 disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Crear empleado'}
        </button>
      </div>
    </form>
  )
}
