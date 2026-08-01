---
name: subir-cambios
description: Crea una rama, agrupa los cambios pendientes en commits con mensaje descriptivo, los sube y abre un pull request con descripción completa. Úsalo cuando el usuario pida "sube los cambios", "haz un PR", "crea una rama con esto", "commitea y publica", "abre el pull request" o "manda esto a GitHub".
---

# Subir cambios y abrir el PR

Flujo completo: rama → commits → push → pull request. El repo es
`anniemooonn/POINT-OF-SALE` y la rama base es siempre `main`.

## Antes de tocar nada

**1. Mira qué hay pendiente.**

```bash
git status --porcelain
git branch --show-current
```

**2. Comprueba que no se cuele nada sensible.** Esto es lo único que no tiene
vuelta atrás: una vez subido a GitHub, el secreto está quemado aunque borres el
commit después.

```bash
git status --porcelain --ignored | grep -E '^!!' | head   # confirma que .env y dist siguen ignorados
```

`.gitignore` ya cubre `.env`, `.env.local`, `dist`, `*.token` y
`.claude/secrets/`. Aun así, **antes de commitear un archivo que no escribiste
en esta sesión, léelo** — sobre todo scripts, `.json` de config y cualquier cosa
bajo `.claude/`. Si encuentras una credencial, para y avisa al usuario; no la
commitees "temporalmente".

**3. Si estás en `main`, crea rama.** Nunca commitees directo a `main`.

## Nombre de la rama

`<tipo>/<qué-toca>`, en kebab-case y español:

- `feat/` funcionalidad nueva — `feat/cortes-de-caja`
- `fix/` corrección — `fix/turno-medianoche`
- `refactor/`, `docs/`, `chore/` para el resto

```bash
git checkout -b feat/lo-que-sea
```

## Commits

Agrupa por tema, no por archivo suelto ni todo en un cajón de sastre. Un commit
debe poder explicarse en una frase.

Cuando el árbol de trabajo trae cosas entrelazadas en los mismos archivos (pasa
si se acumuló trabajo sin commitear), **no partas por hunks para fingir commits
limpios**: haz menos commits y descríbelos con honestidad. Un commit grande y
bien explicado es mejor que tres que mienten sobre su contenido.

Formato del mensaje:

```
Asunto en una linea, imperativo o sustantivo, sin punto final

Por que se hizo y que decisiones no obvias lleva dentro. El que ya
esta en el diff; aqui va lo que el diff no cuenta.

- Detalles concretos si ayudan a revisar.
- Trampas que el revisor no vería solo.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

El historial del repo escribe en español **sin tildes en el asunto**
(`Rediseno visual del flujo de auth`); mantén esa convención.

Para mensajes de varias líneas usa heredoc con comillas simples, que evita que
el shell expanda `$` y backticks:

```bash
git commit -m "$(cat <<'EOF'
Asunto

Cuerpo.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
)"
```

## Antes del push: que compile

No subas algo que no pasa lo básico. Corre y reporta el resultado real:

```bash
npx tsc -b --pretty false
npx oxlint
npm run build
```

Si algo falla, arréglalo antes de subir o dilo explícitamente en el PR. Nunca
uses `--no-verify` para saltarte hooks.

## Push y PR

```bash
git push -u origin <rama>
gh pr create --base main --title "..." --body "$(cat <<'EOF'
...
EOF
)"
```

`gh` está instalado en `C:\Program Files\GitHub CLI\gh.exe`. Si el comando
`gh` no se encuentra, llama a esa ruta completa — el PATH no se refresca en
sesiones ya abiertas.

### Plantilla del cuerpo del PR

```markdown
## Qué incluye

Dos o tres frases sobre qué resuelve, no una lista de archivos.

**Área** — qué cambió y qué puede hacer ahora el usuario.

## Detalles que pueden interesar al revisar

- Decisiones no obvias, trampas resueltas, cosas que el diff no explica solo.

## Verificación

Qué corriste y qué pasó. **Di también qué NO verificaste** y por qué.

## Pendientes que deja abiertos

- Lo que quedó fuera a propósito, para que no se pierda.
```

La sección **Verificación** es la que más se agradece y la más fácil de inflar:
escribe solo lo que realmente corriste. Si no pudiste probarlo en el navegador
(el backoffice está tras el login de Supabase), dilo en esa sección en vez de
dejarlo implícito.

## Si `gh` no tiene sesión

`gh auth login` abre el navegador: **no puedes hacerlo tú**, lo tiene que correr
el usuario. Mientras tanto, sube la rama igual y dale un enlace de PR ya
relleno, que se abre con un clic:

```bash
node .claude/skills/subir-cambios/compare-url.mjs <rama> "<titulo>" <archivo-con-el-cuerpo.md>
```

Escribe el cuerpo antes en un archivo temporal (usa el scratchpad de la sesión,
no el repo).

## Reglas

- Rama y PR solo cuando el usuario lo pida. Commitear no es publicar; publicar
  sí es irreversible.
- Nunca `git push --force` sobre una rama compartida, ni `reset --hard` sin
  haber mirado antes qué se pierde.
- Si no hay identidad de git configurada, usa la del historial del repo
  (`anniemooonn <annielun199703@gmail.com>`) con `git config --local`, nunca
  `--global`.
- Al terminar, di la URL del PR y qué quedó en cada commit. Si algo no se pudo
  verificar, dilo en la respuesta además de en el PR.
