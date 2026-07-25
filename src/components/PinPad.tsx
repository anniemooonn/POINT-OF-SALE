import { useEffect, useState } from 'react'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

interface PinPadProps {
  title: string
  subtitle?: string
  pinLength?: number
  error?: string | null
  onSubmit: (pin: string) => void
  onCancel: () => void
  submitting?: boolean
}

export function PinPad({
  title,
  subtitle,
  pinLength = 4,
  error,
  onSubmit,
  onCancel,
  submitting,
}: PinPadProps) {
  const [pin, setPin] = useState('')

  function press(key: string) {
    if (submitting) return
    if (key === 'del') {
      setPin((p) => p.slice(0, -1))
      return
    }
    if (key === '') return
    setPin((p) => {
      const next = (p + key).slice(0, pinLength)
      if (next.length === pinLength) {
        onSubmit(next)
        return ''
      }
      return next
    })
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (/^[0-9]$/.test(e.key)) {
        press(e.key)
      } else if (e.key === 'Backspace') {
        press('del')
      } else if (e.key === 'Enter' && pin.length === pinLength) {
        onSubmit(pin)
        setPin('')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, submitting, pinLength])

  return (
    <div className="flex w-full flex-col items-center gap-6 rounded-2xl border border-surface-variant bg-surface-container-lowest p-8 shadow-[0px_12px_32px_rgba(0,0,0,0.08)]">
      <div className="text-center">
        <h2 className="text-headline-md text-on-surface">{title}</h2>
        {subtitle && <p className="text-body-md text-secondary">{subtitle}</p>}
      </div>

      <div className="flex gap-3">
        {Array.from({ length: pinLength }).map((_, i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border-2 transition-colors ${
              i < pin.length ? 'border-primary bg-primary' : 'border-outline-variant'
            }`}
          />
        ))}
      </div>

      {error && (
        <p className="w-full rounded-lg bg-error-container px-4 py-2 text-center text-body-md text-on-error-container">
          {error}
        </p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((key, i) => (
          <button
            key={i}
            type="button"
            disabled={key === '' || submitting}
            onClick={() => press(key)}
            className={`flex h-touch-target-min w-touch-target-min items-center justify-center rounded-full text-xl font-medium transition active:scale-95 ${
              key === ''
                ? 'invisible'
                : key === 'del'
                  ? 'bg-surface-container-low text-secondary hover:bg-surface-container'
                  : 'bg-background text-on-surface shadow-sm hover:bg-surface-container-low'
            }`}
          >
            {key === 'del' ? (
              <span className="material-symbols-outlined">backspace</span>
            ) : (
              key
            )}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onCancel}
        className="text-body-md text-secondary underline transition-colors hover:text-primary"
      >
        Cancelar (Esc)
      </button>
    </div>
  )
}
