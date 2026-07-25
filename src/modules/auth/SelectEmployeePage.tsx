import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/useAuthStore'
import { PinPad } from '../../components/PinPad'
import { Modal } from '../../components/Modal'
import { DEFAULT_ROUTE_BY_ROLE, ROLE_AVATAR_CLASSES, ROLE_LABEL } from '../../lib/roles'
import type { EmployeeListItem } from '../../types/auth'

export function SelectEmployeePage() {
  const navigate = useNavigate()
  const location = useAuthStore((s) => s.location)
  const selectEmployee = useAuthStore((s) => s.selectEmployee)
  const signOutLocation = useAuthStore((s) => s.signOutLocation)
  const shouldReduceMotion = useReducedMotion()

  const [employees, setEmployees] = useState<EmployeeListItem[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [selected, setSelected] = useState<EmployeeListItem | null>(null)
  const [pinOpen, setPinOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!location) return
    supabase
      .from('employees')
      .select('id, name, role, active')
      .eq('location_id', location.id)
      .eq('active', true)
      .order('name')
      .then(({ data }) => {
        setEmployees(data ?? [])
        setLoadingList(false)
      })
  }, [location])

  async function handlePin(pin: string) {
    if (!selected) return
    setSubmitting(true)
    setError(null)
    const { error } = await selectEmployee(selected.id, pin)
    setSubmitting(false)
    if (error) {
      setError(error)
      return
    }
    navigate(DEFAULT_ROUTE_BY_ROLE[selected.role], { replace: true })
  }

  async function handleCloseDevice() {
    await signOutLocation()
    navigate('/login', { replace: true })
  }

  function closePinPad() {
    setPinOpen(false)
    setError(null)
  }

  const stagger: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
  }
  const cardIn: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 14, scale: shouldReduceMotion ? 1 : 0.97 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-background font-sans text-on-background antialiased">
      <header className="flex h-touch-target-min w-full items-center justify-between px-8">
        <div className="flex items-center gap-2 text-headline-lg font-black text-primary">
          <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            restaurant
          </span>
          BistroFlow POS
        </div>
        <button
          onClick={handleCloseDevice}
          className="flex h-touch-target-min items-center gap-2 rounded-lg px-4 text-secondary transition-colors hover:bg-surface-container-low active:scale-95"
        >
          <span className="material-symbols-outlined">power_settings_new</span>
          <span className="text-button">Cerrar dispositivo</span>
        </button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="mb-12 text-center">
          <h1 className="mb-2 text-[32px] leading-[1.15] font-extrabold tracking-tight text-on-surface xl:text-display xl:leading-tight">
            Selecciona tu perfil
          </h1>
          <p className="text-body-lg text-secondary">{location?.name} · Servicio Activo</p>
        </div>

        {loadingList && <p className="text-secondary">Cargando empleados...</p>}

        {!loadingList && employees.length === 0 && (
          <p className="max-w-sm text-center text-secondary">
            Aún no hay empleados dados de alta. Entra a Backoffice como administrador
            para crear el primero.
          </p>
        )}

        <motion.div
          className="mx-auto grid w-full max-w-4xl grid-cols-2 gap-gutter md:grid-cols-4"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          {employees.map((emp) => (
            <motion.button
              key={emp.id}
              variants={cardIn}
              onClick={() => {
                setSelected(emp)
                setPinOpen(true)
              }}
              className="group flex aspect-square flex-col items-center justify-center rounded-2xl border border-surface-variant bg-surface-container-lowest p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] transition-all hover:shadow-[0px_12px_32px_rgba(0,0,0,0.08)] focus:ring-2 focus:ring-primary focus:outline-none active:scale-95"
            >
              <div
                className={`mb-4 flex h-20 w-20 items-center justify-center rounded-full transition-transform group-hover:scale-105 ${ROLE_AVATAR_CLASSES[emp.role]}`}
              >
                <span className="text-headline-lg">{emp.name[0]?.toUpperCase()}</span>
              </div>
              <h3 className="text-headline-md text-on-surface">{emp.name}</h3>
              <span className="mt-1 rounded-full bg-surface-container-low px-2 py-1 font-label text-label-caps text-secondary uppercase tracking-widest">
                {ROLE_LABEL[emp.role]}
              </span>
            </motion.button>
          ))}
        </motion.div>
      </main>

      <Modal open={pinOpen} onClose={closePinPad}>
        {selected && (
          <PinPad
            title={selected.name}
            subtitle={`Captura tu PIN (${ROLE_LABEL[selected.role]})`}
            error={error}
            submitting={submitting}
            onSubmit={handlePin}
            onCancel={closePinPad}
          />
        )}
      </Modal>
    </div>
  )
}
