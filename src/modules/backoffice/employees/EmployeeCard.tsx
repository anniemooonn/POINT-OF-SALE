import { AnimatePresence, motion } from 'framer-motion'
import { ToggleSwitch } from '../../../components/ToggleSwitch'
import { cardHover, layoutSpring, listItem } from '../../../lib/motion'
import { ROLE_ACCENT_CLASSES, ROLE_AVATAR_CLASSES, ROLE_LABEL } from '../../../lib/roles'
import type { EmployeeListItem } from '../../../types/auth'
import type { ShiftStatus } from './shift'
import { ShiftButton } from './ShiftButton'
import { ShiftIndicator } from './ShiftIndicator'

interface EmployeeCardProps {
  employee: EmployeeListItem
  shift: ShiftStatus
  shiftBusy: boolean
  onToggleActive: (employee: EmployeeListItem) => void
  onToggleShift: (employee: EmployeeListItem) => void
}

export function EmployeeCard({
  employee,
  shift,
  shiftBusy,
  onToggleActive,
  onToggleShift,
}: EmployeeCardProps) {
  const accent = ROLE_ACCENT_CLASSES[employee.role]

  return (
    <motion.div
      layout
      variants={listItem}
      exit="exit"
      transition={layoutSpring}
      whileHover={employee.active ? cardHover : undefined}
      className={`relative flex flex-col overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest p-6 shadow-[0px_4px_20px_rgba(0,0,0,0.04)] transition-shadow duration-200 ${
        employee.active ? 'hover:shadow-[0px_12px_32px_rgba(0,0,0,0.08)]' : 'opacity-75'
      }`}
    >
      <div className={`absolute top-0 left-0 h-2 w-full ${accent.bar}`} />

      <div className="flex items-center gap-4 pt-2">
        <div className="relative shrink-0">
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full ${
              employee.active ? ROLE_AVATAR_CLASSES[employee.role] : 'bg-surface-variant text-tertiary'
            }`}
          >
            <span className="text-headline-md">{employee.name[0]?.toUpperCase()}</span>
          </div>
          <AnimatePresence>
            {shift.onShift && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className="absolute right-0 bottom-0 h-4 w-4 rounded-full border-2 border-surface-container-lowest bg-success"
                aria-hidden="true"
              />
            )}
          </AnimatePresence>
        </div>
        <div className="min-w-0">
          <h3
            className={`truncate text-headline-md ${employee.active ? 'text-on-surface' : 'text-tertiary'}`}
            title={employee.name}
          >
            {employee.name}
          </h3>
          <span
            className={`mt-1 inline-flex items-center rounded-full border px-3 py-1 font-label text-label-caps uppercase ${accent.chip}`}
          >
            <span className="mr-2 h-2 w-2 rounded-full bg-current" />
            {ROLE_LABEL[employee.role]}
          </span>
        </div>
      </div>

      <div
        className={`mt-gutter flex items-center justify-between gap-stack-sm rounded-lg px-4 py-3 ${
          shift.onShift ? 'bg-success-container/40' : 'bg-surface-container-low'
        }`}
      >
        <ShiftIndicator status={shift} />
        <ShiftButton
          onShift={shift.onShift}
          employeeName={employee.name}
          disabled={!employee.active && !shift.onShift}
          busy={shiftBusy}
          onClick={() => onToggleShift(employee)}
        />
      </div>

      <div className="mt-stack-sm flex items-center justify-between border-t border-surface-variant pt-stack-sm">
        <div>
          <p className="mb-1 font-label text-label-caps text-secondary uppercase">Estado</p>
          <p
            className={`text-body-md font-semibold ${employee.active ? 'text-on-surface' : 'text-tertiary'}`}
          >
            {employee.active ? 'Activo' : 'Inactivo'}
          </p>
        </div>
        <ToggleSwitch
          checked={employee.active}
          onChange={() => onToggleActive(employee)}
          label={`Activar ${employee.name}`}
        />
      </div>
    </motion.div>
  )
}
