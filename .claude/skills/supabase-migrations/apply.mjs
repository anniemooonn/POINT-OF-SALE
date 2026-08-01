#!/usr/bin/env node
// Aplica migraciones SQL a Supabase con la Management API.
//
//   node .claude/skills/supabase-migrations/apply.mjs supabase/migrations/0007_*.sql
//   node .claude/skills/supabase-migrations/apply.mjs --tables
//
// El token NUNCA se pasa por argumento (quedaría en el historial del shell):
// se lee de SUPABASE_ACCESS_TOKEN o del archivo de token, que vive fuera del
// repositorio. Este script tampoco lo imprime en ningún caso.

import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'

const TOKEN_FILE =
  process.env.SUPABASE_TOKEN_FILE ?? path.join(homedir(), '.claude', 'secrets', 'supabase.token')

const TABLES_QUERY = `
  select table_name
  from information_schema.tables
  where table_schema = 'public'
  order by table_name
`

async function readToken() {
  const fromEnv = process.env.SUPABASE_ACCESS_TOKEN?.trim()
  if (fromEnv) return fromEnv

  try {
    const fromFile = (await readFile(TOKEN_FILE, 'utf8')).trim()
    if (fromFile) return fromFile
  } catch {
    // Cae al mensaje de abajo: da igual si no existe o no se puede leer.
  }

  throw new Error(
    `No encontré el access token de Supabase.\n` +
      `Guárdalo en ${TOKEN_FILE} (una sola línea, sin comillas) ` +
      `o expórtalo como SUPABASE_ACCESS_TOKEN.`,
  )
}

/** El project ref es el subdominio de VITE_SUPABASE_URL en el .env del proyecto. */
async function readProjectRef() {
  const fromEnv = process.env.SUPABASE_PROJECT_REF?.trim()
  if (fromEnv) return fromEnv

  const env = await readFile('.env', 'utf8').catch(() => '')
  const match = env.match(/VITE_SUPABASE_URL\s*=\s*"?https:\/\/([a-z0-9]+)\.supabase\.co/i)
  if (!match) {
    throw new Error(
      'No pude deducir el project ref: falta VITE_SUPABASE_URL en .env. ' +
        'Pásalo con SUPABASE_PROJECT_REF.',
    )
  }
  return match[1]
}

async function runQuery(ref, token, query) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })

  const raw = await response.text()
  if (!response.ok) {
    let detail = raw
    try {
      const parsed = JSON.parse(raw)
      detail = parsed.message ?? parsed.error ?? raw
    } catch {
      // Respuesta no-JSON (HTML de error, por ejemplo): se muestra tal cual.
    }
    throw new Error(`HTTP ${response.status} — ${detail}`)
  }

  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error('Uso: node apply.mjs <archivo.sql...> | --tables')
    process.exitCode = 2
    return
  }

  const token = await readToken()
  const ref = await readProjectRef()
  console.log(`Proyecto: ${ref}\n`)

  if (args[0] === '--tables') {
    const rows = await runQuery(ref, token, TABLES_QUERY)
    console.log('Tablas en public:')
    for (const row of rows) console.log(`  - ${row.table_name}`)
    return
  }

  // En orden y una por una: si la tercera falla, se sabe que las dos primeras
  // sí entraron. Las migraciones del proyecto son idempotentes, así que
  // reintentar después de arreglar el error es seguro.
  for (const file of args) {
    const sql = await readFile(file, 'utf8')
    process.stdout.write(`▶ ${path.basename(file)} ... `)
    const result = await runQuery(ref, token, sql)
    const rows = Array.isArray(result) ? result : []
    console.log(`ok${rows.length ? ` (${rows.length} fila(s))` : ''}`)
    // Un archivo que termina en SELECT (verificaciones, conteos) devuelve
    // filas: se imprimen para no tener que lanzar una segunda consulta.
    if (rows.length) console.table(rows)
  }
}

// `exitCode` y no `process.exit()`: en Windows, salir de golpe con sockets de
// fetch todavía abiertos hace que libuv aborte con un assert.
main().catch((error) => {
  console.error(`\n✖ ${error.message}`)
  process.exitCode = 1
})
