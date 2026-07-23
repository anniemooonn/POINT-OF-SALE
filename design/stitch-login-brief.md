# Brief para Google Stitch — Rediseño del inicio de sesión (POS Restaurante)

Copia y pega el bloque de abajo directamente en Stitch. Está escrito como un
solo prompt en prosa porque así es como Stitch interpreta mejor las
especificaciones de varias pantallas relacionadas.

---

## Prompt para Stitch

Diseña el flujo de inicio de sesión de una aplicación web de punto de venta
(POS) para restaurantes, pensada para usarse en tablets de 8"-12" apoyadas en
la caja o en manos del mesero, y también en celular. El tono debe sentirse
profesional, confiable y rápido — como una herramienta de trabajo seria, no
un consumer app. Evita que se vea "corporativo frío"; el restaurante es un
lugar cálido, así que dale algo de calidez sin perder seriedad (piensa en la
estética de herramientas como Square POS, Toast, o Linear — limpias, con
buen espaciado, tipografía fuerte, poco ruido visual).

El flujo tiene 4 pantallas que deben sentirse como un mismo sistema de
diseño (misma paleta, misma tipografía, mismo lenguaje de botones/tarjetas):

**1. Configurar restaurante (primera vez en el dispositivo)**
Formulario de alta inicial. Campos: nombre del restaurante, correo del
dueño/gerente, contraseña, nombre del administrador, PIN de 4-6 dígitos.
Es un formulario largo pero se usa una sola vez — transmite que esto es
"instalar tu restaurante", no un registro genérico. Botón principal grande
"Crear restaurante". Enlace secundario discreto hacia la pantalla de login
por si el dispositivo ya fue configurado antes.

**2. Iniciar dispositivo (login diario, poco frecuente)**
Pantalla simple y corta: correo y contraseña del dueño/gerente. Se usa una
vez por turno de dispositivo, no por persona — el copy debe dejar claro que
esto es distinto de "iniciar sesión como empleado" (eso pasa en la
siguiente pantalla). Botón principal "Entrar". Enlace hacia signup para
dispositivos nuevos.

**3. ¿Quién eres? (selección de empleado — la pantalla que más se usa en
todo el día, por todo el personal)**
Grid grande de tarjetas/botones táctiles, una por cada empleado activo
(mesero, cocina, caja, admin), mostrando su nombre y su rol. Debe ser
reconocible al instante y muy fácil de tocar con el dedo sin apuntar con
precisión — objetivos de toque grandes (mínimo 64px). Diseña también el
estado "sin empleados aún" (mensaje corto invitando a ir a Backoffice a
crear el primero).

**4. Captura de PIN (después de tocar tu nombre)**
Pantalla enfocada, con el nombre del empleado seleccionado arriba, un
indicador visual del PIN capturado (puntos o similar, sin mostrar los
dígitos), y un teclado numérico grande tipo teléfono (0-9) optimizado para
tocar rápido con el pulgar mientras se sostiene la tablet. Debe existir un
estado de error visible pero no alarmante (PIN incorrecto) y un botón para
cancelar y volver a la pantalla anterior.

**Restricciones de producto que no deben cambiar (son decisiones ya
validadas, no pidas alternativas de flujo aquí):**
- El login de dispositivo (pantallas 1-2) es distinto del login de
  empleado (pantallas 3-4) — son dos capas separadas, no las fusiones en
  una sola pantalla.
- El PIN pad debe funcionar sin depender de que el usuario recuerde nada
  memorizado por color — usa forma, tamaño y posición como pistas
  primarias, el color es secundario/decorativo.
- Todo debe operarse con el pulgar en una tablet sostenida con una mano —
  nada de elementos pequeños ni menús ocultos.

**Qué entregar:** las 4 pantallas como un set coherente, con la misma
paleta de color, tipografía, radios de borde y estilo de sombra/elevación
en todas, listo para poder implementarse después en React + Tailwind CSS.

---

## Notas para cuando regreses con el resultado de Stitch

- Trae el export (imágenes, o el código/CSS que te dé Stitch si lo permite)
  y lo traducimos 1:1 a los componentes ya existentes en
  `src/modules/auth/` (`LocationLoginPage.tsx`, `LocationSignupPage.tsx`,
  `SelectEmployeePage.tsx`) y `src/components/PinPad.tsx`.
- Si Stitch te da una paleta de color nueva, la más limpia forma de
  aplicarla es actualizando los tokens de color en `src/index.css`
  (clases `bg-slate-*`, `text-slate-*`, etc. usadas hoy) en vez de
  cambiar cada componente uno por uno.
