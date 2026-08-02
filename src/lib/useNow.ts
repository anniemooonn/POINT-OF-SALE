import { useEffect, useState } from 'react'

/**
 * Reloj compartido para los contadores de "cuánto lleva esperando". Devuelve
 * `Date.now()` y lo refresca cada `intervalMs`, de modo que los tiempos de la
 * comanda y del KDS avanzan solos sin que nadie recargue la pantalla.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return now
}
