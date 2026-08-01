import type { Transition, Variants } from 'framer-motion'

/**
 * Vocabulario de animación del POS. Todo lo que se mueve en la app sale de
 * aquí para que las pantallas se sientan de la misma familia y para poder
 * ajustar el ritmo general en un solo sitio.
 *
 * La accesibilidad se resuelve arriba, en el `<MotionConfig reducedMotion="user">`
 * de main.tsx: si el sistema pide menos movimiento, Framer ignora los
 * desplazamientos y escalas y deja solo el fundido. Por eso los componentes ya
 * no necesitan consultar `useReducedMotion` para cada variante.
 */

/** Curva tipo "ease-out expo": arranca rápido y frena al final. */
export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]

/** Para elementos que cambian de sitio: tarjetas al filtrar, subrayado de pestañas. */
export const layoutSpring: Transition = { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 }

/** Entrada de un bloque suelto (encabezado, aviso de error): sube mientras aparece. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15, ease: 'easeIn' } },
}

/**
 * Contenedor de una lista o cuadrícula: no se anima a sí mismo, solo escalona
 * la entrada de sus hijos. El retraso es corto a propósito; en una pantalla con
 * 40 productos un stagger largo se vuelve una espera.
 */
export const listContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.04 } },
  exit: {},
}

/** Tarjeta dentro de una cuadrícula escalonada. */
export const listItem: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.15, ease: 'easeIn' } },
}

/**
 * Fila de tabla. Sin escala ni desplazamiento vertical: las celdas de una tabla
 * comparten línea base y moverlas de a una deja los bordes temblando.
 */
export const rowItem: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.12, ease: 'easeIn' } },
}

/**
 * Cambio de pantalla dentro del Backoffice. La salida es más corta que la
 * entrada porque van encadenadas (`AnimatePresence mode="wait"`) y la suma es
 * lo que percibe el usuario al navegar.
 */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.12, ease: 'easeIn' } },
}

/** Alternar entre cuadrícula y tabla: fundido corto, sin desplazamiento. */
export const viewSwap: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: 0.12, ease: 'easeIn' } },
}

/** Elevación al pasar el cursor por una tarjeta interactiva. */
export const cardHover = { y: -4, transition: { duration: 0.2, ease: EASE_OUT } }

/**
 * Morfeo entre dos maquetados distintos del mismo elemento (botón cerrado ↔
 * menú abierto). `visualDuration` mide el tiempo hasta que el muelle *parece*
 * haber llegado, no hasta que deja de oscilar, que es lo que se percibe.
 */
export const morphSpring: Transition = { type: 'spring', bounce: 0.15, visualDuration: 0.25 }

/** Contenido que aparece dentro de un elemento que acaba de cambiar de forma. */
export const blurIn: Variants = {
  hidden: { opacity: 0, filter: 'blur(8px)' },
  // El retraso deja que el contenedor termine de crecer antes de que el texto
  // se lea; sin él, el contenido nítido delata que la caja todavía se mueve.
  show: { opacity: 1, filter: 'blur(0px)', transition: { delay: 0.15 } },
  exit: { opacity: 0, filter: 'blur(8px)' },
}
