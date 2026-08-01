import type { ReactNode } from 'react'

interface SettingsCardProps {
  title: string
  description?: string
  children: ReactNode
  /** Acciones al pie (guardar, mensajes de estado). */
  footer?: ReactNode
}

/** Tarjeta contenedora de un bloque de configuración. */
export function SettingsCard({ title, description, children, footer }: SettingsCardProps) {
  return (
    <section className="rounded-2xl border border-surface-variant bg-surface-container-lowest p-8 shadow-sm">
      <header className="mb-gutter">
        <h3 className="text-headline-md text-on-surface">{title}</h3>
        {description && <p className="mt-1 text-body-md text-secondary">{description}</p>}
      </header>

      {children}

      {footer && (
        <div className="mt-gutter flex items-center justify-end gap-4 border-t border-outline-variant pt-4">
          {footer}
        </div>
      )}
    </section>
  )
}

interface SettingsFieldProps {
  label: string
  hint?: string
  children: ReactNode
}

export function SettingsField({ label, hint, children }: SettingsFieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block font-label text-label-caps text-secondary uppercase">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-body-md text-secondary">{hint}</span>}
    </label>
  )
}

interface SaveButtonProps {
  dirty: boolean
  saving: boolean
  saved: boolean
  error: string | null
}

/** Pie común de los formularios de configuración: estado + botón de guardar. */
export function SaveFooter({ dirty, saving, saved, error }: SaveButtonProps) {
  return (
    <>
      {error && <p className="mr-auto text-body-md text-error">{error}</p>}
      {!error && saved && !dirty && (
        <p className="mr-auto flex items-center gap-1 text-body-md text-success">
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          Cambios guardados
        </p>
      )}
      <button
        type="submit"
        disabled={!dirty || saving}
        className="rounded-lg bg-primary px-6 py-2 text-button text-on-primary shadow-sm transition-transform active:scale-95 disabled:opacity-40"
      >
        {saving ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </>
  )
}
