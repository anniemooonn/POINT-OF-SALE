import { useState } from 'react'

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

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex gap-3">
        {Array.from({ length: pinLength }).map((_, i) => (
          <span
            key={i}
            className={`h-4 w-4 rounded-full border-2 ${
              i < pin.length ? 'border-slate-900 bg-slate-900' : 'border-slate-300'
            }`}
          />
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((key, i) => (
          <button
            key={i}
            type="button"
            disabled={key === '' || submitting}
            onClick={() => press(key)}
            className={`h-16 w-16 rounded-full text-xl font-medium transition ${
              key === ''
                ? 'invisible'
                : key === 'del'
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-white text-slate-900 shadow-sm hover:bg-slate-50'
            }`}
          >
            {key === 'del' ? '⌫' : key}
          </button>
        ))}
      </div>

      <button type="button" onClick={onCancel} className="text-sm text-slate-500 underline">
        Cancelar
      </button>
    </div>
  )
}
