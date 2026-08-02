---
name: nueva-migracion
description: Crea un archivo de migración SQL en supabase/migrations con nomenclatura a prueba de colisiones, y audita las existentes buscando duplicados. Úsalo cuando el usuario pida "crea una migración", "nueva migración", "necesito una tabla nueva", "agrega una columna a la base", o pregunte si hay migraciones duplicadas o mal nombradas.
---

# Crear migraciones sin duplicados

Este proyecto aplica las migraciones **a mano y en orden** (ver el skill
`supabase-migrations`). No hay un registro en la base de qué se aplicó: el
orden lo da el **nombre del archivo**. Por eso el nombre importa.

## La nomenclatura

```
supabase/migrations/YYYYMMDDHHMMSS_descripcion_en_snake_case.sql
                    └── timestamp UTC de cuando se creó
```

Ejemplo: `20260802020319_ordenes_y_comandas_de_mesa.sql`

**Por qué timestamp y no un contador.** Con numeración secuencial
(`0008_...`), dos ramas que trabajan en paralelo eligen el mismo número sin
saberlo y al mezclar quedan dos `0008` — pasó en este repo, y se resolvió
renombrando la que aún no se había aplicado. Un timestamp de 14
dígitos no puede repetirse entre ramas, así que el conflicto desaparece por
construcción. Es además el formato del CLI de Supabase, por si algún día se
enlaza el proyecto.

**Los archivos `0001`–`0008` se quedan como están.** Son historia ya aplicada
y el `README` los nombra así. Ordenan bien junto a los nuevos: `0` < `2`, así
que lo histórico siempre va primero. Solo no crees más con ese formato.

## Crear una

```bash
node .claude/skills/nueva-migracion/new.mjs "órdenes y comandas de mesa"
```

Genera el archivo con el timestamp puesto y una cabecera recordando que el SQL
debe ser **idempotente** (`create table if not exists`, `drop policy if exists`
antes de cada `create policy`, `add column if not exists`). Se niega a crear el
archivo si ya existe una migración con el mismo slug — casi siempre eso
significa que el trabajo ya está hecho en otra rama.

Después de escribir el SQL:

1. Agrega la fila correspondiente a la tabla de `supabase/README.md`.
2. Aplícala con `node .claude/skills/supabase-migrations/apply.mjs <archivo>`.

## Auditar las existentes

```bash
node .claude/skills/nueva-migracion/new.mjs --check
```

Sale con código 1 si encuentra:

- **Prefijo repetido** — dos archivos que reclaman la misma posición en el
  orden.
- **Slug repetido** — la misma migración escrita dos veces.
- **La misma tabla creada en dos migraciones** — trabajo duplicado entre ramas,
  aunque los nombres de archivo sean distintos.
- **Nombres que no siguen ninguna de las dos nomenclaturas.**

Córrelo después de cada `git pull` o `git merge` que traiga migraciones, y
antes de abrir un PR que incluya una.

## Reglas

- Si `--check` reporta un prefijo repetido, **renombra la que todavía no se ha
  aplicado a la base**, no la que ya corrió: el README y el historial ya la
  nombran. Pregúntale al usuario cuál es si no lo sabes con certeza.
- Renombra siempre con `git mv`, para que el historial siga al archivo.
- Nunca edites una migración ya aplicada: escribe una nueva encima. Editar la
  vieja deja las bases de los demás en un estado distinto al del repo.
- Este skill solo escribe archivos locales. Aplicar a la base es el otro skill,
  y eso sí toca la base real del usuario.
