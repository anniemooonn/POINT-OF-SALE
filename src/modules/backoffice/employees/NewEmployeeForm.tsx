import { useState, type FormEvent } from 'react'
import { supabase } from '../../../lib/supabase'
import type { EmployeeRole } from '../../../types/auth'

const ROLES: { value: EmployeeRole; label: string }[] = [
  { value: 'mesero', label: 'Mesero' },
  { value: 'cocina', label: 'Cocina' },
  { value: 'caja', label: 'Caja' },
  { value: 'admin', label: 'Administrador' },
]

interface NewEmployeeFormProps {
  locationId: string
  onCreated: () => void
}

export function NewEmployeeForm({ locationId, onCreated }: NewEmployeeFormProps) {
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
    setName('')
    setPin('')
    setRole('mesero')
    onCreated()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Nombre</span>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="input" />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Rol</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as EmployeeRole)}
            className="input"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block max-w-[10rem]">
        <span className="mb-1 block text-sm font-medium text-slate-700">PIN (4-6 dígitos)</span>
        <input
          required
          inputMode="numeric"
          pattern="[0-9]{4,6}"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          className="input tracking-widest"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {loading ? 'Guardando...' : 'Crear empleado'}
      </button>
    </form>
  )
}
