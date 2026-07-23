import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/useAuthStore'

export function LocationLoginPage() {
  const navigate = useNavigate()
  const signInLocation = useAuthStore((s) => s.signInLocation)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signInLocation(email, password)
    setLoading(false)
    if (error) {
      setError(error)
      return
    }
    navigate('/select-employee', { replace: true })
  }

  return (
    <div className="flex min-h-screen w-full bg-background font-sans text-on-surface antialiased">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-surface-variant p-margin-page md:flex lg:p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-surface-variant via-surface to-background" />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary-container/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-10 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative z-10 flex h-full flex-col justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span
                className="material-symbols-outlined text-4xl text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                restaurant_menu
              </span>
              <h2 className="text-headline-lg tracking-tight text-primary">BistroFlow</h2>
            </div>
            <div className="mt-4 inline-block rounded-full border border-outline-variant/30 bg-surface-container-lowest/50 px-3 py-1 backdrop-blur-md">
              <span className="font-label text-label-caps uppercase tracking-widest text-on-surface-variant">
                Terminal Setup
              </span>
            </div>
          </div>

          <div className="max-w-md">
            <h3 className="mb-4 text-display leading-tight text-on-surface">
              Control integral para tu negocio.
            </h3>
            <p className="text-body-lg text-secondary">
              Diseñado para la eficiencia en sala y la precisión en cocina. Accede a las
              configuraciones maestras de tu terminal de servicio.
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex w-full items-center justify-center bg-surface-bright p-8 sm:p-12 md:w-1/2 lg:p-24">
        <div className="w-full max-w-md rounded-2xl border border-surface-variant bg-surface-container-lowest p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] sm:p-10">
          <div className="mb-10 text-center">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-low text-primary">
              <span
                className="material-symbols-outlined text-3xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                admin_panel_settings
              </span>
            </div>
            <h1 className="mb-3 text-headline-lg-mobile text-on-surface md:text-headline-lg">
              Iniciar sesión en el dispositivo
            </h1>
            <p className="text-body-md text-secondary">
              Acceso exclusivo para dueños o gerentes del local.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="pl-1 font-label text-label-caps text-secondary uppercase">
                Correo electrónico
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute top-1/2 left-4 -translate-y-1/2 text-tertiary">
                  mail
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="gerente@restaurante.com"
                  className="h-touch-target-min w-full rounded-lg border-2 border-outline-variant bg-surface-bright pr-4 pl-12 text-body-md text-on-surface transition-colors placeholder:text-tertiary-fixed-dim focus:border-primary focus:bg-surface-container-lowest focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="pl-1 font-label text-label-caps text-secondary uppercase">
                Contraseña
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute top-1/2 left-4 -translate-y-1/2 text-tertiary">
                  lock
                </span>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-touch-target-min w-full rounded-lg border-2 border-outline-variant bg-surface-bright pr-4 pl-12 text-body-md text-on-surface transition-colors placeholder:text-tertiary-fixed-dim focus:border-primary focus:bg-surface-container-lowest focus:outline-none"
                />
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container">
                {error}
              </p>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex h-touch-target-min w-full items-center justify-center gap-2 rounded-lg bg-primary-container text-button text-on-primary-container shadow-sm transition-all duration-200 hover:bg-surface-tint active:scale-95 disabled:opacity-50"
              >
                <span>{loading ? 'Entrando...' : 'Entrar'}</span>
                {!loading && <span className="material-symbols-outlined text-xl">arrow_forward</span>}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <Link
              to="/signup"
              className="text-body-md font-medium text-primary transition-colors hover:text-on-primary-fixed-variant hover:underline"
            >
              ¿Nuevo restaurante? Regístrate aquí
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
