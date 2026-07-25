import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { useAuthStore } from '../../stores/useAuthStore'
import { Spinner } from '../../components/Spinner'

const RESTAURANT_PHOTO_URL =
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=1200&auto=format&fit=crop'

export function LocationLoginPage() {
  const navigate = useNavigate()
  const signInLocation = useAuthStore((s) => s.signInLocation)
  const shouldReduceMotion = useReducedMotion()

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

  const stagger: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
  }
  const fadeUp: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
  }

  return (
    <div className="flex min-h-screen w-full bg-background font-sans text-on-surface antialiased">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-8 md:flex 2xl:p-12">
        <img src={RESTAURANT_PHOTO_URL} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-surface-variant/90 via-surface/75 to-background/85" />
        <div className="animate-blob absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary-container/20 blur-3xl" />
        <div className="animate-blob-delayed absolute -bottom-32 -left-10 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />

        <motion.div
          className="relative z-10 flex h-full flex-col justify-between"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          <div>
            <motion.div variants={fadeUp} className="flex items-center gap-3">
              <span
                className="material-symbols-outlined text-4xl text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                restaurant_menu
              </span>
              <h2 className="text-headline-lg tracking-tight text-primary">BistroFlow</h2>
            </motion.div>
            <motion.div
              variants={fadeUp}
              className="mt-4 inline-block rounded-full border border-outline-variant/30 bg-surface-container-lowest/50 px-3 py-1 backdrop-blur-md"
            >
              <span className="font-label text-label-caps uppercase tracking-widest text-on-surface-variant">
                Terminal Setup
              </span>
            </motion.div>
          </div>

          <motion.div variants={fadeUp} className="max-w-md">
            <h3 className="mb-4 text-[32px] leading-[1.15] font-extrabold tracking-tight text-on-surface 2xl:text-display 2xl:leading-tight">
              Control integral para tu negocio.
            </h3>
            <p className="text-body-lg text-secondary">
              Diseñado para la eficiencia en sala y la precisión en cocina. Accede a las
              configuraciones maestras de tu terminal de servicio.
            </p>
          </motion.div>
        </motion.div>
      </div>

      <div className="relative z-10 flex w-full items-center justify-center bg-surface-bright p-8 sm:p-10 md:w-1/2 2xl:p-16">
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 24, scale: shouldReduceMotion ? 1 : 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="w-full max-w-md rounded-2xl border border-surface-variant bg-surface-container-lowest p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] sm:p-9"
        >
          <div className="mb-10 text-center">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-low text-primary">
              <span
                className="material-symbols-outlined text-3xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                admin_panel_settings
              </span>
            </div>
            <h1 className="mb-3 text-headline-lg-mobile text-on-surface xl:text-headline-lg">
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
                  className="h-14 w-full rounded-lg border-2 border-outline-variant bg-surface-bright pr-4 pl-12 text-body-md text-on-surface transition-colors placeholder:text-tertiary-fixed-dim focus:border-primary focus:bg-surface-container-lowest focus:outline-none"
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
                  className="h-14 w-full rounded-lg border-2 border-outline-variant bg-surface-bright pr-4 pl-12 text-body-md text-on-surface transition-colors placeholder:text-tertiary-fixed-dim focus:border-primary focus:bg-surface-container-lowest focus:outline-none"
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
                className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-primary-container text-button text-on-primary-container shadow-sm transition-all duration-200 hover:bg-surface-tint active:scale-95 disabled:opacity-70"
              >
                {loading ? (
                  <Spinner className="h-5 w-5" />
                ) : (
                  <>
                    <span>Entrar</span>
                    <span className="material-symbols-outlined text-xl">arrow_forward</span>
                  </>
                )}
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
        </motion.div>
      </div>
    </div>
  )
}
