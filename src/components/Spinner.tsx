interface SpinnerProps {
  className?: string
}

export function Spinner({ className = 'h-5 w-5' }: SpinnerProps) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="42 100"
        opacity="0.9"
      />
    </svg>
  )
}
