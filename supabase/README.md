# Migraciones

No usamos todavía el CLI de Supabase enlazado al proyecto: estos archivos se
aplican **a mano y en orden** sobre la base de datos del proyecto.

| Archivo | Qué crea |
| --- | --- |
| `0001_init_locations_employees.sql` | `locations`, `employees`, `create_employee`, `verify_employee_pin`, `verify_manager_pin` |
| `0002_fix_create_employee_ambiguous_id.sql` | Arregla `create_employee` |
| `0003_fix_pgcrypto_schema.sql` | Califica `crypt`/`gen_salt` como `extensions.*` |
| `0004_menu_products.sql` | `products` + RLS |
| `0005_menu_photos_cost_and_stock.sql` | Bucket `product-photos`, columnas `cost` e `in_stock` |
| `0006_employee_shifts.sql` | `employee_shifts` (entradas/salidas de turno) + RLS |
| `0007_location_settings_and_categories.sql` | `location_settings`, `menu_categories`, datos fiscales en `locations`, `rename_menu_category`, `delete_menu_category` |
| `0008_sections_and_tables.sql` | `sections`, `restaurant_tables`, `table_states` + RLS + `seed_table_state` |
| `20260802020833_cash_sessions.sql` | `cash_sessions` (aperturas y cortes de caja) + RLS + `close_cash_session` |

## Cómo se nombran

Las nuevas migraciones llevan **timestamp UTC**, no número consecutivo:

```text
YYYYMMDDHHMMSS_descripcion_en_snake_case.sql
```

Dos ramas en paralelo no pueden elegir el mismo timestamp, mientras que sí
eligen el mismo consecutivo: al mezclar dos ramas quedaron dos `0008`, y se
resolvió renombrando la de caja, que era la que todavía no se había aplicado.
Los archivos `0001`–`0008` ya aplicados se conservan tal cual y siguen
ordenando primero (`0` < `2`).

Créalas con el skill, que pone el nombre correcto y avisa de duplicados:

```bash
node .claude/skills/nueva-migracion/new.mjs "órdenes y comandas de mesa"
node .claude/skills/nueva-migracion/new.mjs --check   # audita duplicados
```

El turno se abre solo cuando el empleado entra con su PIN y se cierra al
cambiar de usuario o cerrar el dispositivo; el botón de Backoffice → Empleados
sirve para corregirlo a mano.

La `0007` es la que da de alta la pantalla de Configuración. Ojo con dos
efectos que tiene sobre el menú:

- Quita el CHECK que amarraba `products.category` a las cuatro categorías
  fijas; a partir de ahí la lista válida vive en `menu_categories`.
- Siembra esas cuatro categorías en cada local existente, más cualquier otra
  que algún producto ya estuviera usando, para que ningún producto quede
  apuntando a una categoría inexistente.

Renombrar una categoría pasa por `rename_menu_category` (mueve también sus
productos, en la misma transacción) y borrarla por `delete_menu_category`, que
la rechaza si todavía tiene productos.

La de `cash_sessions` da de alta la pantalla de Cortes de Caja: guarda una
fila por sesión de caja: fondo inicial al abrir y efectivo contado al cerrar.
Un corte cerrado no se edita ni se borra (la tabla no tiene policy de update ni
de delete); el cierre pasa por `close_cash_session`, que calcula el esperado
—fondo inicial más ventas en efectivo— dentro de la misma transacción. La
columna `cash_sales` existe ya pero se queda en 0 hasta que el módulo de cobro
empiece a sumarle las ventas en efectivo del turno.

## Cómo aplicarlas

**Opción A — SQL Editor (la más rápida):**

1. Entra al proyecto en [supabase.com](https://supabase.com) → **SQL Editor** → **New query**.
2. Pega el contenido del archivo y dale **Run**.
3. Repite con cada migración pendiente, en orden numérico.

De la `0003` en adelante los archivos son idempotentes (`if not exists`,
`create or replace`, `drop policy if exists`), así que volver a correr uno ya
aplicado no rompe nada.

**Opción B — CLI de Supabase:**

```bash
npx supabase login
npx supabase link --project-ref <tu-project-ref>   # pide la contraseña de la base
npx supabase db push
```

El `project-ref` es la parte del subdominio de tu `VITE_SUPABASE_URL`
(`https://<project-ref>.supabase.co`).

## Cómo saber si falta alguna

La app avisa cuando algo no está aplicado: si abres **Backoffice → Empleados**
y aparece el mensaje "La tabla de turnos todavía no existe en Supabase", es que
falta correr la `0006`. Lo mismo en **Backoffice → Configuración** con "Las
tablas de configuración todavía no existen en Supabase" para la `0007`.
