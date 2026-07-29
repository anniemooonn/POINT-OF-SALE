# Brief para Google Stitch — Backoffice / Panel del Administrador (POS Restaurante)

Copia y pega el bloque de abajo directamente en Stitch. Igual que con el
login, está escrito en prosa porque así interpreta mejor Stitch varias
pantallas relacionadas de un mismo sistema.

---

## Prompt para Stitch

Diseña el panel de administración ("Backoffice") de una aplicación web de
punto de venta (POS) para restaurantes. Es la continuación del mismo
producto — ya existe un flujo de login con branding "BistroFlow POS" en
tonos terracota/naranja (#a93101 como color primario), tipografía Hanken
Grotesk para textos e Hanken/Geist para etiquetas en mayúsculas, iconografía
Material Symbols Outlined, tarjetas con esquinas redondeadas (16px), sombras
suaves, y una superficie de fondo casi blanca (#f9f9ff). Mantén exactamente
ese mismo lenguaje visual — el Backoffice no es un producto nuevo, es donde
el dueño/gerente entra después de identificarse con su PIN.

A diferencia de las pantallas anteriores (pensadas para tocar rápido de pie,
en una tablet, por meseros/cocina), el Backoffice lo usa el dueño o gerente
sentado, revisando números — prioriza legibilidad de datos y densidad de
información sobre botones gigantes. Está pensado primero para laptop/desktop
(pantalla ancha con navegación lateral fija), pero debe seguir funcionando en
tablet.

**Estructura general (persistente en todas las pantallas):**
Barra lateral izquierda fija con el logo "BistroFlow" arriba y navegación:
Resumen, Menú, Cortes de Caja, Propinas, Empleados, Configuración. Header
superior mostrando el nombre del restaurante y el empleado admin activo,
con opción de "Cambiar de usuario" y "Cerrar dispositivo".

El panel tiene estas pantallas:

**1. Resumen (dashboard, la pantalla de entrada)**
Vista de un vistazo de la salud del negocio del día. Tarjetas de
indicadores (KPIs) en la parte superior: Ventas del día, Ticket promedio,
número de órdenes, y el estado de la caja actual (abierta/cerrada, con
color verde si cuadra y rojo si hay una discrepancia pendiente). Debajo,
un espacio para una gráfica simple de ventas (por hora del día o por los
últimos 7 días — usa un placeholder de gráfica de barras o líneas, no
hace falta que sea funcional). Todo debe leerse en segundos, sin scroll
excesivo.

**2. Menú (catálogo de productos)**
Pestañas o filtro por categoría (Entradas, Platos Fuertes, Bebidas,
Postres) arriba. Debajo, una cuadrícula o lista de tarjetas de producto
con foto, nombre, precio, y un interruptor de "activo/inactivo". Botón
prominente "+ Nuevo producto" que abre un formulario (foto, nombre,
categoría, precio, descripción corta).

**3. Cortes de Caja**
Dos partes: (a) el corte activo del turno actual, mostrando el fondo
inicial declarado y un botón grande "Cerrar caja" que inicia un asistente
de 3 pasos (declarar efectivo contado, declarar propinas, registrar
salidas de efectivo del día) — el sistema no debe revelar el monto
esperado hasta que el usuario ya haya declarado lo que contó físicamente
("corte ciego"); (b) debajo, una tabla con el historial de cortes
anteriores (fecha, quién lo cerró, monto esperado vs. contado, diferencia
resaltada en rojo si no cuadra o verde si cuadra).

**4. Propinas**
Pantalla simple de configuración: sliders o inputs de porcentaje para
definir cómo se reparte el total de propinas del día entre roles (ej. 70%
meseros, 20% cocina, 10% barra), con una vista previa de cuánto le tocaría
a cada grupo con los números del día actual.

**5. Empleados**
Ya existe implementada (lista + alta de empleados con nombre, rol y PIN);
diséñala solo para que combine visualmente con el resto — lista de
tarjetas o filas con nombre, rol como etiqueta de color, y estado
activo/inactivo.

**Restricciones que no deben cambiar:**
- Es una zona de confianza (solo administradores entran aquí) — no
  necesitas diseñar advertencias de permisos ni confirmaciones excesivas,
  pero sí un buen contraste y jerarquía tipográfica clara para leer
  números rápido.
- El "corte ciego" de caja (pedir el conteo antes de mostrar el esperado)
  es un requisito de control interno, no lo simplifiques quitando ese
  paso.
- Mantén la barra lateral y el header idénticos en las 5 pantallas — es
  la misma aplicación, no páginas sueltas.

**Qué entregar:** las 5 pantallas (Resumen, Menú, Cortes de Caja, Propinas,
Empleados) como un set coherente con la misma barra lateral, tipografía,
paleta y estilo de tarjetas, listo para implementarse en React + Tailwind
CSS reutilizando los tokens de color que ya definimos (`primary`,
`surface-container-lowest`, `on-surface`, `secondary`, etc.).

---

## Notas para cuando regreses con el resultado de Stitch

- Trae el export (imágenes o el código/CSS que te dé Stitch).
- Ya tenemos construida la barra lateral (`BackofficeLayout.tsx`) y la
  lista de empleados (`EmployeesListPage.tsx`) — lo nuevo por construir es
  `BackofficeHomePage.tsx` (Resumen), y los módulos de Menú, Cortes de
  Caja y Propinas, que hoy no existen todavía como pantallas.
- Si Stitch usa colores fuera de la paleta ya definida en `src/index.css`,
  avísame para decidir si los agregamos al `@theme` o los ajustamos a los
  tokens existentes.
