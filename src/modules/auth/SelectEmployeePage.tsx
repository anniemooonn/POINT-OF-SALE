import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/useAuthStore'
import { PinPad } from '../../components/PinPad'
import { DEFAULT_ROUTE_BY_ROLE, ROLE_LABEL } from '../../lib/roles'
import type { EmployeeListItem } from '../../types/auth'

export function SelectEmployeePage() {
  const navigate = useNavigate()
  const location = useAuthStore((s) => s.location)
  const selectEmployee = useAuthStore((s) => s.selectEmployee)

  const [employees, setEmployees] = useState<EmployeeListItem[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [selected, setSelected] = useState<EmployeeListItem | null>(null)
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

  if (selected) {
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-50 p-6">
        <PinPad
          title={selected.name}
          subtitle={`Captura tu PIN (${ROLE_LABEL[selected.role]})`}
          error={error}
          submitting={submitting}
          onSubmit={handlePin}
          onCancel={() => {
            setSelected(null)
            setError(null)
          }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-6 text-center text-2xl font-semibold text-slate-900">
          ¿Quién eres?
        </h1>

        {loadingList && <p className="text-center text-slate-500">Cargando empleados...</p>}

        {!loadingList && employees.length === 0 && (
          <p className="text-center text-slate-500">
            Aún no hay empleados dados de alta. Entra a Backoffice como administrador
            para crear el primero.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {employees.map((emp) => (
            <button
              key={emp.id}
              onClick={() => setSelected(emp)}
              className="flex flex-col items-center gap-2 rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-lg font-semibold text-white">
                {emp.name
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </span>
              <span className="font-medium text-slate-900">{emp.name}</span>
              <span className="text-xs text-slate-500">{ROLE_LABEL[emp.role]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
