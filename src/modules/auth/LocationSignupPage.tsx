import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'

export function LocationSignupPage() {
  const navigate = useNavigate()
  const signUpLocation = useAuthStore((s) => s.signUpLocation)

  const [locationName, setLocationName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminPin, setAdminPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!/^[0-9]{4,6}$/.test(adminPin)) {
      setError('El PIN debe tener entre 4 y 6 dígitos')
      return
    }
    setLoading(true)
    const { error } = await signUpLocation({
      email,
      password,
      locationName,
      adminName,
      adminPin,
    })
    setLoading(false)
    if (error) {
      setError(error)
      return
    }
    navigate('/foh', { replace: true })
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-4 rounded-2xl bg-white p-8 shadow-sm"
      >
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Configura tu restaurante</h1>
          <p className="mt-1 text-sm text-slate-500">
            Esto se hace una sola vez por dispositivo. Crea la cuenta del local y tu
            usuario administrador.
          </p>
        </div>

        <Field label="Nombre del restaurante">
          <input
            required
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            className="input"
            placeholder="Ej. Tacos El Buen Sazón"
          />
        </Field>

        <Field label="Correo del dueño/gerente">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="dueno@restaurante.com"
          />
        </Field>

        <Field label="Contraseña">
          <input
            required
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
        </Field>

        <hr className="border-slate-200" />

        <Field label="Tu nombre (como administrador)">
          <input
            required
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            className="input"
            placeholder="Ej. Ana Ramírez"
          />
        </Field>

        <Field label="Tu PIN (4 a 6 dígitos)">
          <input
            required
            inputMode="numeric"
            pattern="[0-9]{4,6}"
            value={adminPin}
            onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ''))}
            className="input tracking-widest"
            placeholder="••••"
          />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-slate-900 py-3 font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? 'Creando...' : 'Crear restaurante'}
        </button>

        <p className="text-center text-sm text-slate-500">
          ¿Ya configuraste este dispositivo?{' '}
          <Link to="/login" className="font-medium text-slate-900 underline">
            Inicia sesión
          </Link>
        </p>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}
