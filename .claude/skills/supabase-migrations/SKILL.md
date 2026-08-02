---
name: supabase-migrations
description: Aplica migraciones SQL de supabase/migrations a la base de Supabase del proyecto, o verifica cuáles ya están aplicadas. Úsalo cuando el usuario pida "aplica la migración", "sube la 0007 a Supabase", "corre el SQL", "apply migration", o pregunte qué migraciones faltan.
---

# Aplicar migraciones a Supabase

Este proyecto no usa el CLI de Supabase enlazado. Las migraciones se aplican
con la Management API, autenticada con un **personal access token** del usuario
que vive **fuera del repositorio**.

## Dónde está el token

Por orden de preferencia:

1. Variable de entorno `SUPABASE_ACCESS_TOKEN`.
2. Archivo `~/.claude/secrets/supabase.token` (en Windows,
   `C:\Users\<usuario>\.claude\secrets\supabase.token`), una sola línea.

**Nunca** copies el token a un archivo dentro del repositorio, ni lo pases como
argumento de un comando, ni lo imprimas en la salida. Si no existe, pídele al
usuario que lo genere en https://supabase.com/dashboard/account/tokens y lo
guarde él mismo en esa ruta — así el token no pasa por el historial del chat.

El `project ref` se deduce solo de `VITE_SUPABASE_URL` en el `.env`.

## Cómo aplicar una migración

```bash
node .claude/skills/supabase-migrations/apply.mjs supabase/migrations/0007_location_settings_and_categories.sql
```

Se pueden pasar varias en orden. Si una falla, el script se detiene ahí y dice
cuál fue; las migraciones del proyecto son idempotentes, así que corregir y
volver a correr desde la que falló es seguro.

## Cómo saber qué falta

```bash
node .claude/skills/supabase-migrations/apply.mjs --tables
```

Lista las tablas de `public`. Contra lo que documenta `supabase/README.md`:

| Si falta la tabla | Falta correr |
| --- | --- |
| `locations`, `employees` | `0001` |
| `products` | `0004` |
| `employee_shifts` | `0006` |
| `location_settings`, `menu_categories` | `0007` |

Alternativa sin token, solo para saber si una tabla existe (PostgREST responde
404 cuando no la encuentra):

```bash
curl -s -o /dev/null -w "%{http_code}" \
  "$VITE_SUPABASE_URL/rest/v1/menu_categories?select=*&limit=1" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY"
```

## Reglas

- Aplicar una migración escribe en la base de datos real del usuario.
  Confírmalo antes de correrlo, salvo que en ese mismo turno ya te lo hayan
  pedido explícitamente.
- Aplica solo archivos de `supabase/migrations/`, en orden alfabético de nombre
  (las históricas `0001`–`0008` primero, luego las de timestamp). Si vas a
  correr SQL que no está en un archivo del repo, enséñaselo antes al usuario.
- Antes de aplicar un lote, corre
  `node .claude/skills/nueva-migracion/new.mjs --check`: si dos archivos
  comparten prefijo, el orden es ambiguo y hay que resolverlo primero.
- Después de aplicar, verifica con `--tables` y di qué quedó creado.
- Si el token da 401, no lo debuguees imprimiéndolo: dile al usuario que lo
  regenere y vuelva a guardarlo en la ruta de arriba.
