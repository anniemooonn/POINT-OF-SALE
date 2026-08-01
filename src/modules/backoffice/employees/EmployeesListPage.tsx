import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/useAuthStore'
import { fadeUp, listContainer, viewSwap } from '../../../lib/motion'
import { Modal } from '../../../components/Modal'
import { ViewSwitch, type ListView } from '../../../components/ViewSwitch'
import type { EmployeeListItem, EmployeeShift } from '../../../types/auth'
import { EmployeeCard } from './EmployeeCard'
import { EmployeeForm } from './EmployeeForm'
import { EmployeeTable } from './EmployeeTable'
import { getShiftStatus, indexLatestShifts, type ShiftStatus } from './shift'

const VIEW_STORAGE_KEY = 'employees:view'
const SHIFT_COLUMNS = 'id, employee_id, started_at, ended_at'

const MISSING_TABLE_MSG =
  'La tabla de turnos todavía no existe en Supabase. Corre la migración ' +
  'supabase/migrations/0006_employee_shifts.sql en el SQL Editor para poder registrar entradas y salidas.'

/**
 * Traduce el error de Supabase a algo accionable. El caso más común al
 * estrenar el módulo es que la migración de turnos no se haya aplicado:
 * PostgREST responde PGRST205 ("no encuentro la tabla") o Postgres 42P01.
 */
function describeShiftError(error: { code?: string; message: string }): string {
  if (error.code === 'PGRST205' || error.code === '42P01') return MISSING_TABLE_MSG
  if (error.code === '23505') {
    return 'Ese empleado ya tiene un turno abierto. Recarga la pantalla para ver el estado real.'
  }
  return error.message
}

export function EmployeesListPage() {
  const location = useAuthStore((s) => s.location)
  const [employees, setEmployees] = useState<EmployeeListItem[]>([])
  /** Último turno de cada empleado (abierto o cerrado hoy), por id de empleado. */
  const [shifts, setShifts] = useState<Record<string, EmployeeShift>>({})
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [shiftBusyId, setShiftBusyId] = useState<string | null>(null)
  const [view, setView] = useState<ListView>(() =>
    localStorage.getItem(VIEW_STORAGE_KEY) === 'table' ? 'table' : 'cards',
  )

  async function reload() {
    if (!location) return
    setLoading(true)

    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const [employeesResult, shiftsResult] = await Promise.all([
      supabase
        .from('employees')
        .select('id, name, role, active')
        .eq('location_id', location.id)
        .order('name'),
      // Turnos de hoy más cualquier turno abierto, para no perder los que
      // cruzan la medianoche. La fecha va entre comillas porque lleva ":" y
      // ".", que PostgREST trata como caracteres reservados dentro de `or`.
      supabase
        .from('employee_shifts')
        .select(SHIFT_COLUMNS)
        .eq('location_id', location.id)
        .or(`ended_at.is.null,started_at.gte."${startOfToday.toISOString()}"`)
        .order('started_at', { ascending: false }),
    ])

    setEmployees(employeesResult.data ?? [])
    setShifts(indexLatestShifts(shiftsResult.data ?? []))
    setErrorMsg(
      employeesResult.error
        ? `No se pudieron cargar los empleados: ${employeesResult.error.message}`
        : shiftsResult.error
          ? describeShiftError(shiftsResult.error)
          : null,
    )
    setLoading(false)
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  function changeView(next: ListView) {
    setView(next)
    localStorage.setItem(VIEW_STORAGE_KEY, next)
  }

  const statuses = useMemo(() => {
    const map: Record<string, ShiftStatus> = {}
    for (const employee of employees) {
      map[employee.id] = getShiftStatus(shifts[employee.id])
    }
    return map
  }, [employees, shifts])

  const onShiftCount = employees.filter((e) => statuses[e.id]?.onShift).length

  /**
   * Activa/desactiva a un empleado. Mueve el interruptor de inmediato y, si
   * Supabase rechaza el update, lo regresa a su estado anterior y avisa.
   */
  async function toggleActive(employee: EmployeeListItem) {
    const next = !employee.active
    setErrorMsg(null)
    setEmployees((prev) => prev.map((e) => (e.id === employee.id ? { ...e, active: next } : e)))

    const { error } = await supabase.from('employees').update({ active: next }).eq('id', employee.id)
    if (error) {
      setEmployees((prev) => prev.map((e) => (e.id === employee.id ? employee : e)))
      setErrorMsg(`No se pudo actualizar a "${employee.name}": ${error.message}`)
    }
  }

  /**
   * Abre o cierra el turno del empleado. A diferencia del interruptor de
   * estado, aquí esperamos la respuesta: la hora de entrada/salida la pone el
   * servidor y no queremos mostrar una hora inventada si el update falla.
   */
  async function toggleShift(employee: EmployeeListItem) {
    if (!location || shiftBusyId) return
    const openShift = shifts[employee.id]?.ended_at === null ? shifts[employee.id] : undefined

    setErrorMsg(null)
    setShiftBusyId(employee.id)

    const { data, error } = openShift
      ? await supabase
          .from('employee_shifts')
          .update({ ended_at: new Date().toISOString() })
          .eq('id', openShift.id)
          .select(SHIFT_COLUMNS)
          .single()
      : await supabase
          .from('employee_shifts')
          .insert({ location_id: location.id, employee_id: employee.id })
          .select(SHIFT_COLUMNS)
          .single()

    setShiftBusyId(null)

    if (error || !data) {
      const action = openShift ? 'terminar' : 'iniciar'
      const detail = error ? describeShiftError(error) : 'la base no devolvió el turno.'
      setErrorMsg(`No se pudo ${action} el turno de "${employee.name}". ${detail}`)
      return
    }
    setShifts((prev) => ({ ...prev, [employee.id]: data }))
  }

  return (
    <div>
      <div className="mb-gutter flex items-end justify-between">
        <div>
          <h2 className="text-headline-lg text-on-surface">Empleados</h2>
          <p className="mt-1 text-secondary">Gestiona los accesos, turnos y roles del equipo.</p>
        </div>
        <motion.button
          onClick={() => setFormOpen(true)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="flex min-h-12 items-center gap-2 rounded-lg bg-primary px-6 py-3 text-button text-on-primary shadow-sm"
        >
          <span className="material-symbols-outlined">add</span>
          Nuevo empleado
        </motion.button>
      </div>

      <AnimatePresence>
        {errorMsg && (
          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="show"
            exit="exit"
            className="mb-stack-md rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container"
          >
            {errorMsg}
          </motion.p>
        )}
      </AnimatePresence>

      {loading && <p className="text-secondary">Cargando empleados...</p>}

      {!loading && employees.length === 0 && (
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="rounded-xl border border-dashed border-surface-variant px-6 py-12 text-center"
        >
          <p className="text-secondary">Aún no hay empleados dados de alta.</p>
        </motion.div>
      )}

      {!loading && employees.length > 0 && (
        <>
          <div className="mb-stack-sm flex items-center justify-between gap-stack-sm">
            <p className="font-label text-label-caps text-secondary uppercase">
              {employees.length} {employees.length === 1 ? 'empleado' : 'empleados'}
              <span className="mx-2 text-tertiary-fixed-dim">·</span>
              {/* El contador cambia al fichar entrada/salida: se anima para que
                  el cambio se note sin tener que estar mirándolo. */}
              <span className={`inline-flex ${onShiftCount > 0 ? 'text-success' : ''}`}>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={onShiftCount}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="mr-1 tabular-nums"
                  >
                    {onShiftCount}
                  </motion.span>
                </AnimatePresence>
                en turno
              </span>
            </p>
            <ViewSwitch view={view} onChange={changeView} />
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              variants={viewSwap}
              initial="hidden"
              animate="show"
              exit="exit"
            >
              {view === 'cards' ? (
                <motion.div
                  className="grid grid-cols-1 gap-gutter md:grid-cols-2 lg:grid-cols-3"
                  variants={listContainer}
                  initial="hidden"
                  animate="show"
                >
                  <AnimatePresence>
                    {employees.map((employee) => (
                      <EmployeeCard
                        key={employee.id}
                        employee={employee}
                        shift={statuses[employee.id]}
                        shiftBusy={shiftBusyId === employee.id}
                        onToggleActive={toggleActive}
                        onToggleShift={toggleShift}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <EmployeeTable
                  employees={employees}
                  statuses={statuses}
                  shiftBusyId={shiftBusyId}
                  onToggleActive={toggleActive}
                  onToggleShift={toggleShift}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)}>
        {location && (
          <EmployeeForm
            locationId={location.id}
            onCancel={() => setFormOpen(false)}
            onCreated={() => {
              setFormOpen(false)
              reload()
            }}
          />
        )}
      </Modal>
    </div>
  )
}
