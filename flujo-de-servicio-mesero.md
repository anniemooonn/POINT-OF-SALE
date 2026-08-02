# Flujo de servicio del mesero — de la captura al cierre de cuenta

Paso a paso del ciclo completo de una mesa, tal como lo debe seguir un mesero.

Cada paso indica **qué hace la persona**, **qué toca en la app** y **en qué estado
queda la mesa**. La columna de estado importa: el mapa de mesas es el tablero que
ve todo el equipo en tiempo real.

Desde que existe la toma de orden, **el mesero ya no mueve los estados a mano**:
los mueve el flujo. Abrir la mesa la pone en Ocupada, enviar a cocina la pone en
Esperando, cobrar la pone en Sucia. El cambio manual sigue disponible detrás del
interruptor **Estados** del mapa, para las excepciones.

**Leyenda de disponibilidad**

| Marca | Significado |
|---|---|
| ✅ | Funciona en la app |
| 🔨 | Todavía no existe: se resuelve con proceso manual |

---

## Paso 0 — Entrar al turno

**Antes de tocar una mesa.**

1. En la tablet, la pantalla muestra la lista de empleados del local. ✅
2. El mesero toca su nombre y escribe su **PIN**. ✅
3. La app abre su turno automáticamente y lo lleva al **Mapa de mesas**. ✅

> El turno se abre al entrar con PIN y se cierra al dejar el dispositivo. No hay
> botón aparte de "iniciar turno".

**Regla:** nunca trabajar con la sesión de otro compañero. Todo lo que se capture
queda registrado a nombre de quien inició sesión — incluye las propinas.

**Requisito del local:** la **caja debe estar abierta** antes del primer cobro en
efectivo del día (Backoffice → Cortes de caja → Abrir caja, lo hace admin o caja).
✅ Si la caja está cerrada, la app **rechaza el cobro en efectivo**: no hay dónde
registrar el dinero que entra al cajón.

---

## Paso 1 — Recibir y sentar comensales

**Estado resultante: `Ocupada`** 🟥

1. Llegan comensales, el mesero los acomoda en una mesa **Libre** del mapa.
2. Tocar la mesa en el mapa → **Abrir mesa**. ✅
3. Capturar **cuántos comensales** se sentaron con los botones + / −. ✅
4. La app registra la hora de llegada, deja la mesa en **Ocupada** y abre
   directo la comanda. ✅

> Si te equivocaste de número, se corrige tocando los comensales en la barra
> superior de la comanda. La hora de llegada no se toca: la pone el servidor.

**Por qué importa:** la mesa en Ocupada le avisa al resto del piso que ya tiene
gente aunque todavía no haya pedido nada. Evita que otro mesero la ofrezca.

---

## Paso 2 — Captura de la orden

**Estado resultante: `Ocupada` (la comanda es borrador)**

1. En la comanda, buscar el platillo por **categoría** o con el **buscador**. ✅
2. Tocar el producto para agregarlo. Tocarlo otra vez sube la cantidad. ✅
3. Ajustar cantidades con + / −, o quitar la línea con el bote de basura. ✅
4. Agregar **nota** a una línea ("sin cebolla", "término medio"). ✅

**Reglas de captura:**

- Capturar **en la mesa, frente al comensal** — no de memoria camino a la cocina.
- Repetir la orden en voz alta antes de enviarla.
- Las notas van en el producto, no en la orden completa: si el término de la carne
  es para un solo plato, va en ese plato.
- Solo aparecen productos **activos y con existencia**: un platillo agotado no se
  puede capturar aunque el mesero lo recuerde de memoria.
- Mientras la línea diga **Sin enviar**, es borrador y se puede editar. En cuanto
  sale a cocina se bloquea.

---

## Paso 3 — Enviar la orden a cocina

**Estado resultante: `Esperando`** 🟨

1. Revisar la comanda completa en el panel derecho.
2. Presionar **Enviar a cocina (n)**. ✅
3. La comanda aparece en el **KDS** de cocina en el momento, ordenada por hora
   de entrada. ✅
4. La mesa pasa sola a **Esperando**. ✅

**Punto de no retorno:** una vez enviada, la orden ya está en producción. Las
líneas enviadas ya no se editan desde la comanda; cancelar implica avisar a
cocina directamente. 🔨 *La cancelación en sistema con autorización de admin es
de Fase 2.*

### Órdenes por tiempos

Si la mesa pide por tiempos (entradas primero, fuertes después):

- Se envía la primera tanda y la mesa queda en **Esperando**.
- Al capturar el siguiente tiempo, las nuevas líneas nacen como borrador y se
  envían igual. Cocina las ve como **una comanda separada**, con su propio
  cronómetro. ✅
- Todo lo enviado se acumula en la misma cuenta de la mesa.

---

## Paso 4 — Cocina prepara y marca listo

**El mesero no hace nada aquí, solo observa.**

1. Cada envío aparece en el KDS como una tarjeta con el **tiempo que lleva
   esperando**. La tarjeta se pone ámbar a los 12 minutos y roja a los 20. ✅
2. Cocina marca listo **platillo por platillo** (botón ✓ de cada línea) o la
   **comanda completa**. ✅
3. La tarjeta pasa a **Listos para recoger** y el mesero ve el contador de
   platillos listos en la barra de su comanda. ✅

---

## Paso 5 — Servir a la mesa

**Estado resultante: `Servida`** 🟩

1. Entregar los platillos a la mesa.
2. Presionar **Marcar como servida (n)** en la comanda. ✅

**Regla de oro, ya aplicada por el sistema:** si todavía queda algo en cocina, la
mesa **no** pasa a Servida — se queda en **Esperando** y la app lo avisa. Solo
cambia cuando ya no hay nada pendiente. Así el equipo sabe que la mesa sigue
esperando comida.

---

## Paso 6 — Pedir la cuenta

**Estado resultante: `Por pagar`** 🟪

1. El comensal pide la cuenta.
2. Presionar **Pedir la cuenta** en la comanda. ✅ La mesa pasa a **Por pagar** y
   el panel muestra subtotal, IVA y total.
3. Llevar la cuenta a la mesa.

**Estado `Por pagar` = "esta mesa ya no consume, está esperando cobrar".** Es la
señal para que caja y el resto del piso sepan que la mesa está por liberarse.

**El total lo calcula la app** según la configuración del local (Backoffice →
Configuración): si los precios del menú ya traen el IVA, se desglosa hacia atrás;
si no, se suma encima. ✅

**Antes de llevar la cuenta, verificar:**

- Que estén todos los consumos (¿la última ronda de bebidas se capturó?).
- Que no quede nada **Sin enviar**: la app no deja cobrar con platillos
  capturados que nunca salieron a cocina. ✅
- Si el comensal pide **cuenta separada**: 🔨 la división de cuenta es de Fase 2.
  Hoy se cobra la cuenta completa y la división se hace entre los comensales.

---

## Paso 7 — Cobro y propina

**Estado resultante: `Sucia`** ⬜

1. Presionar **Cobrar**. ✅
2. Capturar la **propina**: 10%, 15%, 20%, sin propina, o un monto libre. ✅
   El total se actualiza en pantalla al elegirla.
3. Elegir el **método de pago**: ✅
   - **Efectivo:** capturar el monto recibido. La app calcula el cambio y suma
     el dinero al turno de caja abierto.
   - **Tarjeta:** cobrar en la terminal física y confirmar aquí **solo con el
     voucher aprobado**.
4. Presionar **Cobrar $X**. El ticket se cierra y muestra el **cambio a devolver**
   en grande. ✅
5. Presionar **Listo, liberar mesa**: la mesa pasa a **Sucia** y vuelves al mapa. ✅

**Sobre la propina:** se captura **al cobrar**, nunca después ni "de memoria al
cierre". Si el comensal la deja en efectivo, se registra igual — es lo que hace
que el corte del turno cuadre y que el reparto sea correcto.

**Un ticket cobrado no se reabre.** Nunca confirmes el cobro antes de tener el
dinero o el voucher aprobado en mano.

---

## Paso 8 — Liberar la mesa

**Estado resultante: `Libre`** 🟩

1. Limpiar y montar la mesa.
2. Tocar la mesa en el mapa → **Ya está limpia, liberar**. ✅
3. La mesa queda disponible para sentar nuevos comensales.

**No dejar mesas en `Sucia` al final del turno:** una mesa sucia en el mapa lee como
mesa no disponible, y el siguiente turno arranca a ciegas.

---

## Paso 9 — Salir del turno

1. Al terminar la jornada, salir de la sesión desde el menú del empleado. ✅
   Esto cierra su turno.
2. Todas sus mesas deben quedar en **Libre** o entregadas explícitamente a otro
   mesero.
3. El corte de caja lo hace admin o caja (Backoffice → Cortes de caja → Cerrar
   caja, con conteo ciego del efectivo). ✅ El esperado ya incluye las ventas y
   las propinas en efectivo del turno. El mesero entrega el efectivo que tenga
   antes de irse.

---

## Resumen: el ciclo de estados

```
Libre → Ocupada → Esperando → Servida → Por pagar → Sucia → Libre
  ↑      (abrir)   (enviar)    (servir)   (cuenta)  (cobrar) (limpiar)
  └───────────────────────────────────────────────────────────┘
```

| Estado | Significa | Lo pone… |
|---|---|---|
| **Libre** | Disponible | El mesero, al liberar la mesa limpia |
| **Ocupada** | Hay gente, aún sin pedir | La app, al abrir la mesa |
| **En captura** | Tomando el pedido | Manual (modo Estados), si se quiere señalar |
| **Esperando** | Cocina está preparando | La app, al enviar a cocina |
| **Servida** | Todo entregado, comiendo | La app, al marcar servida (si no queda nada en cocina) |
| **Por pagar** | Pidieron la cuenta | La app, al pedir la cuenta |
| **Sucia** | Ya se fueron, falta limpiar | La app, al cobrar |

La regla que sostiene todo: **el estado en el mapa siempre refleja la realidad de
la mesa.** Ahora el flujo lo hace solo; el modo **Estados** queda para corregir.

---

## Casos especiales

| Situación | Qué hacer |
|---|---|
| **Mesa se levanta sin consumir** | En la comanda vacía: **Cerrar mesa sin consumo**. Queda el rastro, no se borra ✅ |
| **Comensal cancela un platillo ya enviado** | Avisar a cocina de viva voz. 🔨 La cancelación en sistema con autorización de admin es de Fase 2 |
| **Mesa se cambia de lugar** | 🔨 Mover cuenta entre mesas es de Fase 2. Hoy: cobrar en la mesa original |
| **Grupo grande que ocupa 2 mesas** | 🔨 Unir mesas es de Fase 2. Hoy: una cuenta por mesa |
| **Cuenta separada** | 🔨 División de cuenta es de Fase 2. Hoy: cobro único |
| **Dos meseros abren la misma mesa** | La app lo impide: una mesa no puede tener dos cuentas abiertas ✅ |
| **Se cae el internet** | 🔨 El modo offline es de Fase 3. Hoy: comanda en papel y captura al reconectar |
| **Cliente se va sin pagar** | Avisar de inmediato a admin/caja: el ticket debe quedar registrado, no borrado |

---

## Lo que sigue pendiente

De Fase 2, en orden de impacto para el mesero:

- División de cuenta (por comensal o partes iguales)
- Unir mesas para grupos grandes
- Modificadores de producto obligatorios (término, extras)
- Cancelación de platillo enviado con autorización de admin
- Timer configurable por platillo en el KDS (hoy el umbral es fijo: 12 y 20 min)
- Reparto automático de propinas por rol

Ver [backlog-mvp.md](backlog-mvp.md) para la lista completa.
