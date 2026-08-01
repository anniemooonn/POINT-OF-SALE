import { motion } from 'framer-motion'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Eliminar',
  onConfirm,
  onCancel,
  loading,
}: ConfirmDialogProps) {
  return (
    <div className="w-full max-w-sm space-y-4 rounded-2xl border border-surface-variant bg-surface-container-lowest p-8 shadow-[0px_12px_32px_rgba(0,0,0,0.08)]">
      <div>
        <h2 className="text-headline-md text-on-surface">{title}</h2>
        <p className="mt-1 text-body-md text-secondary">{message}</p>
      </div>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-button text-secondary hover:bg-surface-container-high"
        >
          Cancelar
        </button>
        <motion.button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          whileTap={loading ? undefined : { scale: 0.95 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          className="rounded-lg bg-error px-6 py-2 text-button text-on-error shadow-sm disabled:opacity-50"
        >
          {loading ? 'Eliminando...' : confirmLabel}
        </motion.button>
      </div>
    </div>
  )
}
