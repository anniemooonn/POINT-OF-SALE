# Backlog MVP — POS Restaurante (React + Vite)

Basado en la sesión de research (competencia, flujo de servicio, manejo de dinero,
autogestión del cliente). Este documento define **qué entra en el MVP**, con qué
prioridad, y la estructura técnica propuesta para arrancar el desarrollo.

---

## 1. Alcance del MVP

El MVP debe cubrir **un ciclo completo de servicio operable en el mundo real**:
mesero abre mesa → toma orden → cocina prepara → se sirve → se cobra → se hace
corte de caja. Todo lo que no sea indispensable para ese ciclo (pagos en línea,
QR de autogestión, inventario por receta, offline-first, diseñador drag & drop)
se empuja a fases posteriores, aunque ya quedó definido en la conversación previa
y se documenta como backlog de V2/V3.

**Criterio de "Alta prioridad":** sin esto, el restaurante no puede operar un
turno completo con el sistema.
**Criterio de "Media":** mejora fuerte de calidad/velocidad, pero se puede
operar sin ello el primer mes (con proceso manual de respaldo).
**Criterio de "Baja":** diferenciador de producto a mediano plazo, no bloquea
la operación diaria.

---

## 2. Estructura técnica propuesta

### Frontend
- **React + Vite + TypeScript** (TS recomendado: el modelo de datos —mesas,
  tickets, productos, roles— se beneficia mucho de tipado fuerte).
- **Routing:** React Router, con 3 áreas separadas por rol (ver módulos abajo).
- **Estado servidor:** TanStack Query (React Query) para cache + refetch +
  sincronización con el backend en tiempo real.
- **Estado UI local:** Zustand (ligero, evita boilerplate de Redux para algo
  de este tamaño).
- **Estilos:** Tailwind CSS — permite iterar rápido en los estados visuales
  del mapa de mesas (íconos + texto, como acordamos) sin pelear con CSS.
- **Íconos:** Lucide o Heroicons (sets consistentes, ligeros).

### Backend / datos
Recomiendo **Supabase** (Postgres + Auth + Realtime + Storage) para el MVP:
- El mapa de mesas y el KDS necesitan "misma base de datos en tiempo real"
  (mencionado varias veces en la sesión) — Supabase Realtime resuelve esto
  sin construir WebSockets a mano.
- Auth con roles (admin, mesero, cocina, caja) ya viene integrado con RLS
  (Row Level Security) — clave para el requisito de "permisos escalonados"
  (ocultar utilidades/propinas a meseros).
- Storage para fotos del menú.
- Postgres da un camino claro a futuro para reportes/COGS sin migrar de motor.

Alternativa si prefieren no depender de un BaaS: Node/Express + PostgreSQL +
Socket.io. Es más trabajo de infraestructura para el mismo resultado en el MVP,
lo dejaría solo si ya tienen preferencia por controlar el backend.

### Estructura de carpetas sugerida
```
src/
  modules/
    foh/          # Front-of-House: mapa de mesas, toma de orden, cobro
    kds/          # Back-of-House: pantalla de cocina
    backoffice/   # Admin: menú, cortes, reportes, config de propinas
  components/      # UI compartida (botones, iconografía de estados, etc.)
  hooks/
  lib/             # cliente supabase, formatters, utils
  stores/          # zustand stores
  types/
```

### Dispositivos objetivo (según el análisis de hardware ya hecho)
- FOH (meseros): responsive para tablet 8"–11", también usable en celular.
- Caja: tablet 10"–12" o pantalla táctil, misma web app.
- KDS: pantalla fija (puede ser una tablet o monitor con navegador en modo kiosco).
- Todo es **una sola web app responsive** — evita mantener 3 apps nativas
  separadas y encaja con el requisito de "curva de aprendizaje cero".

---

## 3. Backlog

### 🔴 Prioridad Alta — Fase 1 (MVP funcional)

- [x] **Auth y roles básicos** (admin, mesero, cocina, caja) con login simple (PIN o usuario/contraseña)
- [ ] **CRUD de menú**: categorías, productos, precio, foto opcional
- [ ] **Mapa de mesas (versión fija)**: layout predefinido por el sistema (no drag&drop todavía), con estados en **ícono + texto** (libre, ocupada, en captura, esperando, servida, por pagar, sucia)
- [ ] **Apertura de mesa**: registrar hora de llegada y número de comensales
- [ ] **Toma de orden**: selección de productos por categoría, cantidad, notas simples
- [ ] **Envío de orden a cocina**: pantalla KDS con comandas entrantes ordenadas por hora
- [ ] **Marcar platillo/orden como listo** desde KDS
- [ ] **Marcar orden como servida** desde FOH
- [ ] **Generar cuenta / ticket**: consolidar productos de la mesa, calcular total
- [ ] **Cobro básico**: registrar método de pago (efectivo / tarjeta, sin pasarela integrada aún), cerrar ticket
- [ ] **Liberar mesa** (pasar a limpia → libre)
- [ ] **Apertura y cierre de caja (turno)**: declarar fondo inicial, y al cierre captura de efectivo contado (corte ciego simplificado)
- [ ] **Captura de propina** al cobrar (monto libre o % sugerido) — aunque la distribución automática se deje para Fase 2
- [ ] **Permisos escalonados básicos**: ocultar reportes/finanzas a rol mesero/cocina

### 🟡 Prioridad Media — Fase 2 (Robustecer operación)

- [ ] **Modificadores de producto** (ej. término de cocción, extras) — con opción de marcarlos como obligatorios (poka-yoke)
- [ ] **Reglas de distribución de propina (tronco común)**: % configurable por rol (mesero/cocina/barra), cálculo automático al cierre
- [ ] **Registro de salidas de efectivo (petty cash)**: botón visible, categoría + monto, se descuenta del efectivo esperado
- [ ] **División de cuenta**: por comensal o en partes iguales
- [ ] **Unir mesas** (fusión temporal para grupos grandes)
- [ ] **Buscador de productos** (barra de búsqueda predictiva, además de categorías)
- [ ] **Timer de preparación en KDS**: alerta visual si un platillo excede tiempo configurado
- [ ] **Dashboard básico para el dueño**: ventas del día, ticket promedio, comparativo por turno
- [ ] **Historial de cortes de caja** (auditoría: quién cerró, cuánto declaró, diferencias)
- [ ] **Formato único de reporte de corte** (mismo formato para todos los turnos)

### 🟢 Prioridad Baja — Fase 3 (Diferenciadores / escalamiento)

- [ ] **Diseñador de mapa drag & drop**: dueño arma su propio croquis, zonas (terraza, barra, salón)
- [ ] **Autogestión del cliente vía QR**: web app pública, ver cuenta en vivo, llamar mesero, pedir cuenta
- [ ] **Pago en línea del cliente vía QR** (con propina y pasarela de pago)
- [ ] **Pasarela de pagos integrada** vs. enlace a terminal física (decisión pendiente de negocio)
- [ ] **Control de inventario por receta**: descuento automático de insumos por platillo vendido
- [ ] **Alertas de stock bajo / bloqueo de venta de producto sin insumo**
- [ ] **Márgenes de utilidad por platillo** (costo receta vs. precio venta)
- [ ] **Modo offline** (guardar comandas/cobros localmente y sincronizar al reconectar)
- [ ] **CRM básico**: historial de cliente frecuente, platillos favoritos
- [ ] **Reportes avanzados**: COGS, ventas brutas vs netas, gráficas por periodo

---

## 4. Notas de decisión pendientes (para definir antes de iniciar Fase 1)

1. **Backend:** ¿confirmamos Supabase o prefieren stack propio (Node + Postgres)?
2. **Impresión de comandas/tickets:** ¿KDS en pantalla es suficiente para el MVP, o necesitan impresora térmica desde el día uno?
3. **Multi-restaurante:** ¿el MVP es para un solo local o debe soportar múltiples sucursales desde el modelo de datos? (afecta el esquema desde ahora, aunque la funcionalidad se use después)
