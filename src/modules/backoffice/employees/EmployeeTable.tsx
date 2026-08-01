import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ToggleSwitch } from '../../../components/ToggleSwitch'
import { layoutSpring, rowItem } from '../../../lib/motion'
import { ROLE_ACCENT_CLASSES, ROLE_AVATAR_CLASSES, ROLE_LABEL } from '../../../lib/roles'
import type { EmployeeListItem } from '../../../types/auth'
import type { ShiftStatus } from './shift'
import { ShiftButton } from './ShiftButton'
import { ShiftIndicator } from './ShiftIndicator'

type SortKey = 'name' | 'role' | 'active' | 'shift'
type SortDirection = 'asc' | 'desc'

interface EmployeeTableProps {
  employees: EmployeeListItem[]
  /** Estado de turno por id de empleado. */
  statuses: Record<string, ShiftStatus>
  shiftBusyId: string | null
  onToggleActive: (employee: EmployeeListItem) => void
  onToggleShift: (employee: EmployeeListItem) => void
}

const COLUMNS: { key: SortKey; label: string; className: string }[] = [
  { key: 'name', label: 'Empleado', className: '' },
  { key: 'role', label: 'Rol', className: 'w-48' },
  { key: 'active', label: 'Estado', className: 'w-48' },
  { key: 'shift', label: 'Turno', className: 'w-56' },
]

export function EmployeeTable({
  employees,
  statuses,
  shiftBusyId,
  onToggleActive,
  onToggleShift,
}: EmployeeTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [direction, setDirection] = useState<SortDirection>('asc')

  /** Ordenar por la misma columna invierte el sentido; cambiar de columna arranca en ascendente. */
  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setDirection('asc')
  }

  const sorted = useMemo(() => {
    function compare(a: EmployeeListItem, b: EmployeeListItem): number {
      switch (sortKey) {
        case 'role':
          return ROLE_LABEL[a.role].localeCompare(ROLE_LABEL[b.role], 'es')
        case 'active':
          return Number(a.active) - Number(b.active)
        case 'shift':
          return (statuses[a.id]?.rank ?? 0) - (statuses[b.id]?.rank ?? 0)
        default:
          return 0
      }
    }

    return [...employees].sort((a, b) => {
      const result = compare(a, b)
      // El nombre desempata siempre, para que el orden no baile entre renders.
      const value = result !== 0 ? result : a.name.localeCompare(b.name, 'es')
      return direction === 'asc' ? value : -value
    })
  }, [employees, statuses, sortKey, direction])

  return (
    <div className="overflow-x-auto rounded-xl border border-surface-variant bg-surface-container-lowest shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
      <table className="w-full min-w-[860px] border-collapse text-left">
        <thead>
          <tr className="border-b border-surface-variant bg-surface-container-high">
            {COLUMNS.map((column) => {
              const active = sortKey === column.key
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={
                    active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                  className={`px-4 py-3 ${column.className}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    className={`flex items-center gap-1 font-label text-label-caps uppercase transition-colors hover:text-primary ${
                      active ? 'text-primary' : 'text-secondary'
                    }`}
                  >
                    {column.label}
                    <span className="material-symbols-outlined text-base">
                      {active
                        ? direction === 'asc'
                          ? 'arrow_upward'
                          : 'arrow_downward'
                        : 'unfold_more'}
                    </span>
                  </button>
                </th>
              )
            })}
            <th
              scope="col"
              className="w-52 px-4 py-3 text-right font-label text-label-caps text-secondary uppercase"
            >
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {/* `layout` en la fila: al cambiar de columna de orden las filas se
              deslizan a su nueva posición en vez de reaparecer barajadas. */}
          <AnimatePresence initial={false}>
            {sorted.map((employee) => {
              const accent = ROLE_ACCENT_CLASSES[employee.role]
              const status = statuses[employee.id]

              return (
                <motion.tr
                  key={employee.id}
                  layout
                  variants={rowItem}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  transition={layoutSpring}
                  className={`border-b border-surface-variant transition-colors last:border-b-0 hover:bg-surface-container-low ${
                    employee.active ? '' : 'opacity-60'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full ${
                            employee.active
                              ? ROLE_AVATAR_CLASSES[employee.role]
                              : 'bg-surface-variant text-tertiary'
                          }`}
                        >
                          <span className="text-body-md font-semibold">
                            {employee.name[0]?.toUpperCase()}
                          </span>
                        </div>
                        <AnimatePresence>
                          {status.onShift && (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                              className="absolute right-0 bottom-0 h-3 w-3 rounded-full border-2 border-surface-container-lowest bg-success"
                              aria-hidden="true"
                            />
                          )}
                        </AnimatePresence>
                      </div>
                      <span className="text-body-md font-semibold text-on-surface">
                        {employee.name}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 font-label text-label-caps uppercase ${accent.chip}`}
                    >
                      <span className="mr-2 h-2 w-2 rounded-full bg-current" />
                      {ROLE_LABEL[employee.role]}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ToggleSwitch
                        checked={employee.active}
                        onChange={() => onToggleActive(employee)}
                        label={`Activar ${employee.name}`}
                      />
                      <span className="text-body-md text-secondary">
                        {employee.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <ShiftIndicator status={status} />
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <ShiftButton
                        onShift={status.onShift}
                        employeeName={employee.name}
                        disabled={!employee.active && !status.onShift}
                        busy={shiftBusyId === employee.id}
                        onClick={() => onToggleShift(employee)}
                      />
                    </div>
                  </td>
                </motion.tr>
              )
            })}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  )
}
