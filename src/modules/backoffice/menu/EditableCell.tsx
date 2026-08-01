import { useRef, useState } from 'react'

interface EditableCellProps {
  /** Valor crudo que se edita (lo que verá el input). */
  value: string
  /** Valor ya formateado que se muestra en reposo (ej. "$12.50" o "—"). */
  display: string
  type?: 'text' | 'number'
  align?: 'left' | 'right'
  ariaLabel: string
  onCommit: (raw: string) => void
}

export function EditableCell({
  value,
  display,
  type = 'text',
  align = 'left',
  ariaLabel,
  onCommit,
}: EditableCellProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  // Escape también dispara blur, así que hay que recordar que se canceló
  // antes de que el handler de blur intente guardar.
  const cancelled = useRef(false)

  const alignClass = align === 'right' ? 'text-right' : 'text-left'

  function startEditing() {
    setDraft(value)
    cancelled.current = false
    setEditing(true)
  }

  function finishEditing() {
    setEditing(false)
    if (cancelled.current) return
    const next = draft.trim()
    if (next === value.trim()) return
    onCommit(next)
  }

  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        inputMode={type === 'number' ? 'decimal' : undefined}
        step={type === 'number' ? '0.01' : undefined}
        aria-label={ariaLabel}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={finishEditing}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.currentTarget.blur()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            cancelled.current = true
            e.currentTarget.blur()
          }
        }}
        className={`w-full rounded-md border border-primary bg-surface-container-lowest px-2 py-1.5 text-body-md text-on-surface outline-none ring-2 ring-primary/20 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${alignClass}`}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={startEditing}
      aria-label={`${ariaLabel}: ${display}. Click para editar`}
      className={`w-full cursor-text rounded-md border border-transparent px-2 py-1.5 text-body-md text-on-surface transition-colors hover:border-surface-variant hover:bg-surface-container-low ${alignClass}`}
    >
      {display}
    </button>
  )
}
