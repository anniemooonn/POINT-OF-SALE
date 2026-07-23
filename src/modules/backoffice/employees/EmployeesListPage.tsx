import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuthStore } from '../../../stores/useAuthStore'
import { ROLE_LABEL } from '../../../lib/roles'
import type { EmployeeListItem } from '../../../types/auth'
import { NewEmployeeForm } from './NewEmployeeForm'

export function EmployeesListPage() {
  const location = useAuthStore((s) => s.location)
  const [employees, setEmployees] = useState<EmployeeListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  async function reload() {
    if (!location) return
    setLoading(true)
    const { data } = await supabase
      .from('employees')
      .select('id, name, role, active')
      .eq('location_id', location.id)
      .order('name')
    setEmployees(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  async function toggleActive(employee: EmployeeListItem) {
    await supabase.from('employees').update({ active: !employee.active }).eq('id', employee.id)
    reload()
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Empleados</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          {showForm ? 'Cancelar' : '+ Nuevo empleado'}
        </button>
      </div>

      {showForm && location && (
        <div className="mb-6">
          <NewEmployeeForm
            locationId={location.id}
            onCreated={() => {
              setShowForm(false)
              reload()
            }}
          />
        </div>
      )}

      {loading && <p className="text-slate-500">Cargando...</p>}

      <ul className="divide-y divide-slate-200 rounded-xl bg-white shadow-sm">
        {employees.map((emp) => (
          <li key={emp.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="font-medium text-slate-900">{emp.name}</p>
              <p className="text-sm text-slate-500">{ROLE_LABEL[emp.role]}</p>
            </div>
            <button
              onClick={() => toggleActive(emp)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                emp.active
                  ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {emp.active ? 'Activo' : 'Inactivo'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
