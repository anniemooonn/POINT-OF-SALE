#!/usr/bin/env node
// Crea migraciones con nombre a prueba de colisiones, y audita las existentes.
//
//   node .claude/skills/nueva-migracion/new.mjs "mesas y comandas"
//   node .claude/skills/nueva-migracion/new.mjs --check
//
// El prefijo es un timestamp UTC (YYYYMMDDHHMMSS), no un contador: dos ramas
// que crean una migración el mismo día no pueden elegir el mismo número, que
// es exactamente lo que pasó con las dos `0008`.

import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const DIR = 'supabase/migrations'

/** Nomenclatura vigente: 14 dígitos UTC + slug. */
const TIMESTAMP = /^(\d{14})_([a-z0-9_]+)\.sql$/
/** Nomenclatura histórica (0001..0008), congelada: no se crean más así. */
const LEGACY = /^(\d{4})_([a-z0-9_]+)\.sql$/

/** `create table [if not exists] [public.]nombre` — para detectar trabajo duplicado. */
const CREATE_TABLE = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z0-9_]+)"?/gi

function stamp(date = new Date()) {
  return date.toISOString().replace(/[-:T]/g, '').slice(0, 14)
}

/** "Cortes de caja" -> "cortes_de_caja". Sin acentos ni eñes: el nombre viaja por shell y URL. */
function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

async function listMigrations() {
  const entries = await readdir(DIR).catch(() => {
    throw new Error(`No encontré ${DIR}. Corre esto desde la raíz del repo.`)
  })
  return entries.filter((name) => name.endsWith('.sql')).sort()
}

function parse(name) {
  const asTimestamp = TIMESTAMP.exec(name)
  if (asTimestamp) return { name, prefix: asTimestamp[1], slug: asTimestamp[2], legacy: false }

  const asLegacy = LEGACY.exec(name)
  if (asLegacy) return { name, prefix: asLegacy[1], slug: asLegacy[2], legacy: true }

  return { name, prefix: null, slug: null, legacy: false }
}

/** Agrupa por una clave y devuelve solo los grupos con más de un elemento. */
function collisions(items, keyOf) {
  const groups = new Map()
  for (const item of items) {
    const key = keyOf(item)
    if (key == null) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(item)
  }
  return [...groups].filter(([, group]) => group.length > 1)
}

async function tablesCreatedBy(files) {
  const byTable = new Map()
  for (const file of files) {
    const sql = await readFile(path.join(DIR, file), 'utf8')
    for (const match of sql.matchAll(CREATE_TABLE)) {
      const table = match[1].toLowerCase()
      if (!byTable.has(table)) byTable.set(table, [])
      if (!byTable.get(table).includes(file)) byTable.get(table).push(file)
    }
  }
  return byTable
}

async function check() {
  const files = await listMigrations()
  const parsed = files.map(parse)
  let problems = 0

  const malformed = parsed.filter((item) => item.prefix === null)
  if (malformed.length) {
    problems += malformed.length
    console.log('✖ Nombres que no siguen ninguna nomenclatura:')
    for (const item of malformed) console.log(`    ${item.name}`)
    console.log(`    Renómbralos a ${stamp()}_descripcion.sql\n`)
  }

  for (const [prefix, group] of collisions(parsed, (item) => item.prefix)) {
    problems += 1
    console.log(`✖ Prefijo ${prefix} usado por ${group.length} archivos:`)
    for (const item of group) console.log(`    ${item.name}`)
    // Cuál renombrar lo decide el humano: la que ya se aplicó a la base se
    // queda con su nombre, porque el README y el historial ya la nombran así.
    console.log('    El orden de aplicación es ambiguo. Renombra la que NO hayas aplicado todavía:')
    for (const item of group) {
      console.log(`    git mv ${DIR}/${item.name} ${DIR}/${stamp()}_${item.slug}.sql`)
    }
    console.log('')
  }

  for (const [slug, group] of collisions(parsed, (item) => item.slug)) {
    problems += 1
    console.log(`✖ Dos migraciones con el mismo nombre "${slug}":`)
    for (const item of group) console.log(`    ${item.name}`)
    console.log('    Probablemente el mismo trabajo hecho dos veces.\n')
  }

  const byTable = await tablesCreatedBy(files)
  for (const [table, sources] of byTable) {
    if (sources.length < 2) continue
    problems += 1
    console.log(`✖ La tabla "${table}" se crea en ${sources.length} migraciones:`)
    for (const source of sources) console.log(`    ${source}`)
    console.log('    Revisa si una de las dos sobra.\n')
  }

  const legacy = parsed.filter((item) => item.legacy).length
  console.log(
    `${files.length} migraciones — ${legacy} con nomenclatura histórica, ` +
      `${files.length - legacy - malformed.length} con timestamp.`,
  )

  if (problems === 0) {
    console.log('✔ Sin duplicados.')
    return
  }
  console.log(`\n${problems} problema(s) por resolver.`)
  process.exitCode = 1
}

async function create(words) {
  const slug = slugify(words.join(' '))
  if (!slug) throw new Error('Dale un nombre descriptivo: node new.mjs "cortes de caja"')

  const files = await listMigrations()

  // Un slug repetido casi siempre significa que la migración ya existe y se
  // está reescribiendo por accidente: mejor parar y que decida el usuario.
  const existing = files.map(parse).filter((item) => item.slug === slug)
  if (existing.length) {
    throw new Error(
      `Ya existe una migración llamada "${slug}":\n` +
        existing.map((item) => `    ${item.name}`).join('\n') +
        `\nSi de verdad es otra cosa, dale un nombre más específico.`,
    )
  }

  const prefix = stamp()
  const file = path.join(DIR, `${prefix}_${slug}.sql`)
  const iso = new Date().toISOString()

  const template = `-- ${words.join(' ')}
-- Creada: ${iso}
--
-- Idempotente: debe poder correrse dos veces sin romper nada.
--   create table if not exists ...
--   drop policy if exists ... antes de cada create policy
--   alter table ... add column if not exists ...

`

  await writeFile(file, template, { flag: 'wx' })
  console.log(`✔ ${file}`)
  console.log('\nCuando la termines:')
  console.log(`  1. Agrégala a la tabla de supabase/README.md`)
  console.log(`  2. node .claude/skills/supabase-migrations/apply.mjs ${file}`)
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error('Uso: node new.mjs "<descripción>" | --check')
    process.exitCode = 2
    return
  }

  if (args[0] === '--check') return check()
  return create(args)
}

main().catch((error) => {
  console.error(`\n✖ ${error.message}`)
  process.exitCode = 1
})
