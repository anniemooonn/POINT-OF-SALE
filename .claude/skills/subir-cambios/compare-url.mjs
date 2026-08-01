#!/usr/bin/env node
// Genera el enlace de GitHub para abrir un PR con titulo y cuerpo ya rellenos.
// Sirve de plan B cuando `gh` no tiene sesion iniciada: la rama ya esta subida
// y al usuario solo le queda revisar y pulsar "Create pull request".
//
//   node .claude/skills/subir-cambios/compare-url.mjs feat/mi-rama "Mi titulo" cuerpo.md
//
// El cuerpo se pasa como archivo, no como argumento: lleva saltos de linea,
// comillas y markdown, y pelearse con el escapado del shell no vale la pena.

import { readFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

// GitHub corta las URLs muy largas con un 414. El limite real ronda los 8 KB;
// avisamos antes para que el cuerpo se recorte a mano y no se pierda texto.
const MAX_URL = 7000

/**
 * Codifica la rama para meterla en la *ruta* de la URL. Las barras de
 * `feat/lo-que-sea` tienen que sobrevivir: si se convierten en %2F, GitHub ya
 * no encuentra la rama. Por eso se codifica segmento a segmento.
 */
function encodeBranch(branch) {
  return branch.split('/').map(encodeURIComponent).join('/')
}

/** Saca `owner/repo` del remote, sirva https o ssh. */
async function readRepoSlug() {
  const { stdout } = await run('git', ['remote', 'get-url', 'origin'])
  const match = stdout.trim().match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/i)
  if (!match) throw new Error(`No reconozco el remote como GitHub: ${stdout.trim()}`)
  return match[1]
}

async function main() {
  const [branch, title, bodyFile] = process.argv.slice(2)
  if (!branch || !title) {
    console.error('Uso: compare-url.mjs <rama> "<titulo>" [archivo-cuerpo.md]')
    process.exitCode = 2
    return
  }

  const slug = await readRepoSlug()
  const body = bodyFile ? await readFile(bodyFile, 'utf8') : ''

  const url =
    `https://github.com/${slug}/compare/main...${encodeBranch(branch)}?expand=1` +
    `&title=${encodeURIComponent(title)}` +
    (body ? `&body=${encodeURIComponent(body)}` : '')

  console.log(url)

  if (url.length > MAX_URL) {
    console.error(
      `\n⚠ La URL mide ${url.length} caracteres y GitHub puede rechazarla. ` +
        `Acorta el cuerpo o pega esa parte a mano tras abrir el PR.`,
    )
  }
}

// `exitCode` en vez de `process.exit()`: en Windows, salir de golpe puede
// abortar con sockets todavia abiertos.
main().catch((error) => {
  console.error(`\n✖ ${error.message}`)
  process.exitCode = 1
})
