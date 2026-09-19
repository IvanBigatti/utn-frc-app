#!/usr/bin/env node
/**
 * Carga masiva de material de estudio.
 *
 * Lee una carpeta local `material/` organizada así:
 *
 *   material/<ingenieria>/<año>/<materia>/<tipo>/archivo.pdf
 *
 * y por cada archivo: lo sube a Google Drive, lo hace público e inserta
 * la fila correspondiente en la tabla `archivos`.
 *
 * Uso:
 *   node --env-file=.env.local scripts/subir-materiales.mjs --esqueleto sistemas
 *       Crea el árbol de carpetas de esa ingeniería leyendo las materias de la base.
 *       El id de cada materia queda fijado en el nombre de la carpeta (`... #123`).
 *
 *   node --env-file=.env.local scripts/subir-materiales.mjs
 *       Simulación: resuelve todo contra la base y muestra qué se subiría. No toca nada.
 *
 *   node --env-file=.env.local scripts/subir-materiales.mjs --go
 *       Sube de verdad.
 *
 * Flags:
 *   --go                  Ejecuta la subida (sin esto es simulación).
 *   --solo <ingenieria>   Procesa una sola carpeta de ingeniería.
 *   --user <uuid>         Autor de los archivos. Por defecto: MATERIAL_AUTH_USER_ID.
 *   --concurrencia <n>    Subidas en paralelo (por defecto 3).
 *   --permitir-grandes    No corta en 20 MB.
 *
 * Variables de entorno (las mismas que usa la app):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GOOGLE_DRIVE_FOLDER_ID,
 *   MATERIAL_AUTH_USER_ID
 */

import { createHash } from 'node:crypto'
import { readdir, readFile, mkdir, writeFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

// ---------------------------------------------------------------- configuración

const RAIZ = path.resolve(process.cwd(), 'material')
const LEDGER = path.join(RAIZ, '.subidos.json')
const ANIOS = [1, 2, 3, 4, 5, 6]
const TIPOS = ['resumen', 'parcial', 'tp']

// Alias tolerantes para las carpetas de tipo.
const ALIAS_TIPO = {
  resumen: 'resumen', resumenes: 'resumen', apunte: 'resumen', apuntes: 'resumen',
  parcial: 'parcial', parciales: 'parcial', final: 'parcial', finales: 'parcial',
  tp: 'tp', tps: 'tp', practico: 'tp', practicos: 'tp', trabajos: 'tp',
}

const MIMES = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
}

const MAX_BYTES = 20 * 1024 * 1024
const IGNORAR = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini'])

// ---------------------------------------------------------------- argumentos

const args = process.argv.slice(2)
const tieneFlag = (n) => args.includes(`--${n}`)
const valorFlag = (n, porDefecto = null) => {
  const i = args.indexOf(`--${n}`)
  if (i === -1) return porDefecto
  const v = args[i + 1]
  return v && !v.startsWith('--') ? v : porDefecto
}

const EJECUTAR = tieneFlag('go')
const SOLO = valorFlag('solo')
const ESQUELETO = valorFlag('esqueleto')
const CONCURRENCIA = Math.max(1, Number(valorFlag('concurrencia', '3')) || 3)
const PERMITIR_GRANDES = tieneFlag('permitir-grandes')
const AUTOR = valorFlag('user', process.env.MATERIAL_AUTH_USER_ID)

// ---------------------------------------------------------------- utilidades

const normalizar = (s) =>
  s.normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

// "Análisis Matemático I" y "analisis-matematico-1" tienen que dar lo mismo.
const ROMANOS = { i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6' }
const clave = (s) =>
  normalizar(s)
    .split(' ')
    .map((p) => ROMANOS[p] ?? p)
    .join(' ')

const slug = (s) => normalizar(s).replace(/ /g, '-')

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex')

const mimeDe = (archivo) => MIMES[path.extname(archivo).toLowerCase()] ?? null

// El nombre que ve el usuario en la app, derivado del nombre del archivo.
const nombreVisible = (archivo) =>
  path.basename(archivo, path.extname(archivo))
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

// Una carpeta puede fijar el id con el sufijo `#123`, que gana sobre el nombre.
const idFijado = (carpeta) => {
  const m = carpeta.match(/#(\d+)\s*$/)
  return m ? Number(m[1]) : null
}
const sinId = (carpeta) => carpeta.replace(/#\d+\s*$/, '').trim()

// "3", "3ro", "3er año" → 3
const anioDe = (carpeta) => {
  const m = carpeta.match(/\d+/)
  const n = m ? Number(m[0]) : NaN
  return ANIOS.includes(n) ? n : null
}

const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1)

async function listarCarpetas(dir) {
  const entradas = await readdir(dir, { withFileTypes: true })
  return entradas.filter((e) => e.isDirectory() && !e.name.startsWith('.')).map((e) => e.name)
}

async function listarArchivos(dir) {
  const entradas = await readdir(dir, { withFileTypes: true })
  return entradas
    .filter((e) => e.isFile() && !e.name.startsWith('.') && !IGNORAR.has(e.name))
    .map((e) => e.name)
}

// ---------------------------------------------------------------- clientes

function exigirEnv(...nombres) {
  const faltan = nombres.filter((n) => !process.env[n])
  if (faltan.length) {
    console.error(`\nFaltan variables de entorno: ${faltan.join(', ')}`)
    console.error('Corré el script con: node --env-file=.env.local scripts/subir-materiales.mjs\n')
    process.exit(1)
  }
}

function clienteSupabase() {
  exigirEnv('NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function clienteDrive() {
  exigirEnv('GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'GOOGLE_DRIVE_FOLDER_ID')
  const oauth2 = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
  oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return google.drive({ version: 'v3', auth: oauth2 })
}

// ---------------------------------------------------------------- catálogo

// ingenieria → comision (por año) → ComisionMaterias → materia
// Es la misma cadena que usa app/upload/UploadForm.tsx.

async function traerIngenierias(sb) {
  const { data, error } = await sb.from('ingenieria').select('id, nombre').order('nombre')
  if (error) throw new Error(`No pude leer ingenierias: ${error.message}`)
  return data ?? []
}

const cacheMaterias = new Map()

async function traerMaterias(sb, ingenieriaId, anio) {
  const k = `${ingenieriaId}:${anio}`
  if (cacheMaterias.has(k)) return cacheMaterias.get(k)

  const { data: comisiones, error: e1 } = await sb
    .from('comision').select('id')
    .eq('ingenieria_id', ingenieriaId).eq('año', anio)
  if (e1) throw new Error(`No pude leer comisiones: ${e1.message}`)

  let materias = []
  if (comisiones?.length) {
    const { data: relaciones, error: e2 } = await sb
      .from('ComisionMaterias').select('materia(id, nombre)')
      .in('idComision', comisiones.map((c) => c.id))
    if (e2) throw new Error(`No pude leer ComisionMaterias: ${e2.message}`)

    const unicas = new Map()
    for (const r of relaciones ?? []) if (r.materia) unicas.set(r.materia.id, r.materia)
    materias = [...unicas.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }

  cacheMaterias.set(k, materias)
  return materias
}

// Busca por nombre normalizado; si no hay exacto, intenta una única coincidencia parcial.
function resolverPorNombre(candidatos, texto) {
  const buscado = clave(texto)
  const exactos = candidatos.filter((c) => clave(c.nombre) === buscado)
  if (exactos.length === 1) return { ok: true, valor: exactos[0] }
  if (exactos.length > 1) return { ok: false, motivo: 'ambiguo', candidatos: exactos }

  const parciales = candidatos.filter((c) => {
    const k = clave(c.nombre)
    return k.startsWith(buscado) || buscado.startsWith(k) || k.includes(buscado)
  })
  if (parciales.length === 1) return { ok: true, valor: parciales[0], aproximado: true }
  if (parciales.length > 1) return { ok: false, motivo: 'ambiguo', candidatos: parciales }

  return { ok: false, motivo: 'sin-coincidencia', candidatos }
}

// ---------------------------------------------------------------- esqueleto

async function crearEsqueleto(sb, nombreIngenieria) {
  const ingenierias = await traerIngenierias(sb)
  const r = resolverPorNombre(ingenierias, nombreIngenieria)
  if (!r.ok) {
    console.error(`\nNo encontré la ingeniería "${nombreIngenieria}".`)
    console.error('Disponibles:')
    for (const i of ingenierias) console.error(`  - ${i.nombre}`)
    process.exit(1)
  }

  const ing = r.valor
  const base = path.join(RAIZ, slug(ing.nombre))
  let creadas = 0

  for (const anio of ANIOS) {
    const materias = await traerMaterias(sb, ing.id, anio)
    if (!materias.length) continue
    for (const m of materias) {
      for (const tipo of TIPOS) {
        await mkdir(path.join(base, String(anio), `${slug(m.nombre)} #${m.id}`, tipo), { recursive: true })
      }
      creadas++
    }
    console.log(`  ${anio}° año: ${materias.length} materias`)
  }

  console.log(`\nListo. ${creadas} materias bajo material/${slug(ing.nombre)}/`)
  console.log('Tirá los archivos en la subcarpeta resumen/, parcial/ o tp/ que corresponda.')
  console.log('No renombres las carpetas: el "#id" es lo que fija la materia en la base.\n')
}

// ---------------------------------------------------------------- recorrido

async function armarPlan(sb) {
  if (!existsSync(RAIZ)) {
    console.error(`\nNo existe la carpeta material/ en ${RAIZ}`)
    console.error('Creala con: node --env-file=.env.local scripts/subir-materiales.mjs --esqueleto sistemas\n')
    process.exit(1)
  }

  const ingenierias = await traerIngenierias(sb)
  const plan = []
  const problemas = []

  for (const carpetaIng of await listarCarpetas(RAIZ)) {
    if (SOLO && clave(carpetaIng) !== clave(SOLO)) continue

    const rIng = resolverPorNombre(ingenierias, sinId(carpetaIng))
    const idIng = idFijado(carpetaIng)
    const ing = idIng ? ingenierias.find((i) => i.id === idIng) : rIng.ok ? rIng.valor : null

    if (!ing) {
      problemas.push(`material/${carpetaIng} — ingeniería desconocida. Opciones: ${ingenierias.map((i) => i.nombre).join(', ')}`)
      continue
    }

    const dirIng = path.join(RAIZ, carpetaIng)
    for (const carpetaAnio of await listarCarpetas(dirIng)) {
      const anio = anioDe(carpetaAnio)
      if (!anio) {
        problemas.push(`material/${carpetaIng}/${carpetaAnio} — no pude leer el año (esperaba 1 a 6)`)
        continue
      }

      const materias = await traerMaterias(sb, ing.id, anio)
      const dirAnio = path.join(dirIng, String(carpetaAnio))

      for (const carpetaMat of await listarCarpetas(dirAnio)) {
        const fijado = idFijado(carpetaMat)
        let materia = fijado ? materias.find((m) => m.id === fijado) : null

        if (fijado && !materia) {
          problemas.push(`material/${carpetaIng}/${carpetaAnio}/${carpetaMat} — la materia #${fijado} no está en ${ing.nombre} ${anio}° año`)
          continue
        }
        if (!materia) {
          const r = resolverPorNombre(materias, sinId(carpetaMat))
          if (!r.ok) {
            const detalle = r.motivo === 'ambiguo'
              ? `ambiguo, coincide con: ${r.candidatos.map((c) => `${c.nombre} #${c.id}`).join(' | ')}`
              : `sin coincidencia entre las ${materias.length} materias de ${ing.nombre} ${anio}° año`
            problemas.push(`material/${carpetaIng}/${carpetaAnio}/${carpetaMat} — ${detalle}`)
            continue
          }
          materia = r.valor
        }

        const dirMat = path.join(dirAnio, carpetaMat)
        for (const carpetaTipo of await listarCarpetas(dirMat)) {
          const tipo = ALIAS_TIPO[normalizar(carpetaTipo)]
          if (!tipo) {
            problemas.push(`material/${carpetaIng}/${carpetaAnio}/${carpetaMat}/${carpetaTipo} — tipo inválido (resumen, parcial o tp)`)
            continue
          }

          const dirTipo = path.join(dirMat, carpetaTipo)
          for (const archivo of await listarArchivos(dirTipo)) {
            const absoluto = path.join(dirTipo, archivo)
            const relativo = path.relative(process.cwd(), absoluto)
            const mimeType = mimeDe(archivo)

            if (!mimeType) {
              problemas.push(`${relativo} — extensión no permitida (pdf, jpg o png)`)
              continue
            }

            const info = await stat(absoluto)
            if (!PERMITIR_GRANDES && info.size > MAX_BYTES) {
              problemas.push(`${relativo} — pesa ${mb(info.size)} MB, el límite de la app son 20 MB (--permitir-grandes para forzar)`)
              continue
            }

            plan.push({
              absoluto,
              relativo,
              mimeType,
              bytes: info.size,
              nombre: nombreVisible(archivo),
              tipo,
              materia_id: materia.id,
              materia_nombre: materia.nombre,
              ingenieria_id: ing.id,
              anio,
            })
          }
        }
      }
    }
  }

  return { plan, problemas }
}

// ---------------------------------------------------------------- ledger

async function leerLedger() {
  if (!existsSync(LEDGER)) return {}
  try {
    return JSON.parse(await readFile(LEDGER, 'utf8'))
  } catch {
    console.warn('El registro material/.subidos.json está corrupto. Arranco de cero.')
    return {}
  }
}

const guardarLedger = (ledger) => writeFile(LEDGER, JSON.stringify(ledger, null, 2))

// Misma huella = mismo archivo, en la misma materia y con el mismo tipo.
const huella = (item, hash) => `${hash}:${item.materia_id}:${item.tipo}`

// ---------------------------------------------------------------- subida

async function subirUno(sb, drive, item, ledger) {
  const buffer = await readFile(item.absoluto)
  const hash = sha256(buffer)
  const k = huella(item, hash)

  if (ledger[k]) return { estado: 'omitido', item }

  const nombreEnDrive = `${Date.now()}-${path.basename(item.absoluto).replace(/[^a-zA-Z0-9._-]/g, '_')}`

  const creado = await drive.files.create({
    requestBody: { name: nombreEnDrive, parents: [process.env.GOOGLE_DRIVE_FOLDER_ID] },
    media: { mimeType: item.mimeType, body: Readable.from(buffer) },
    fields: 'id',
  })

  const driveFileId = creado.data.id
  if (!driveFileId) throw new Error('Drive no devolvió el id del archivo')

  await drive.permissions.create({ fileId: driveFileId, requestBody: { role: 'reader', type: 'anyone' } })

  const { data, error } = await sb
    .from('archivos')
    .insert({
      nombre: item.nombre,
      tipo: item.tipo,
      materia_id: item.materia_id,
      ingenieria_id: item.ingenieria_id,
      drive_file_id: driveFileId,
      descripcion: null,
      auth_user_id: AUTOR,
    })
    .select('id')
    .single()

  // Si la fila no entra, el archivo en Drive queda huérfano: lo borramos.
  if (error) {
    await drive.files.delete({ fileId: driveFileId }).catch(() => {})
    throw new Error(`insert en archivos falló (${error.message}); borré el archivo de Drive`)
  }

  ledger[k] = { archivo_id: data.id, drive_file_id: driveFileId, ruta: item.relativo, fecha: new Date().toISOString() }
  await guardarLedger(ledger)

  return { estado: 'subido', item }
}

async function enTandas(items, n, tarea) {
  let i = 0
  const trabajadores = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const indice = i++
      await tarea(items[indice], indice)
    }
  })
  await Promise.all(trabajadores)
}

// ---------------------------------------------------------------- main

async function main() {
  const sb = clienteSupabase()

  if (ESQUELETO) {
    await crearEsqueleto(sb, ESQUELETO)
    return
  }

  const { plan, problemas } = await armarPlan(sb)

  if (problemas.length) {
    console.log(`\n${problemas.length} carpeta(s)/archivo(s) que no pude resolver:\n`)
    for (const p of problemas) console.log(`  ! ${p}`)
  }

  if (!plan.length) {
    console.log('\nNo hay nada para subir.\n')
    process.exit(problemas.length ? 1 : 0)
  }

  const ledger = await leerLedger()
  const pendientes = []
  let yaSubidos = 0

  for (const item of plan) {
    const hash = sha256(await readFile(item.absoluto))
    if (ledger[huella(item, hash)]) yaSubidos++
    else pendientes.push(item)
  }

  const totalBytes = pendientes.reduce((a, i) => a + i.bytes, 0)

  console.log(`\n${plan.length} archivo(s) encontrado(s) — ${yaSubidos} ya estaban subidos, ${pendientes.length} pendientes (${mb(totalBytes)} MB)\n`)

  for (const i of pendientes) {
    console.log(`  ${i.materia_nombre} #${i.materia_id} · ${i.anio}° · ${i.tipo.padEnd(7)} · "${i.nombre}" (${mb(i.bytes)} MB)`)
  }

  if (!EJECUTAR) {
    console.log('\nSimulación. Revisá que la materia y el tipo de cada archivo estén bien.')
    console.log('Si está todo ok, repetí el comando con --go\n')
    return
  }

  if (!AUTOR) {
    console.error('\nFalta el autor de los archivos: pasá --user <uuid> o definí MATERIAL_AUTH_USER_ID.\n')
    process.exit(1)
  }

  const drive = clienteDrive()
  const fallos = []
  let hechos = 0

  console.log(`\nSubiendo con concurrencia ${CONCURRENCIA}...\n`)

  await enTandas(pendientes, CONCURRENCIA, async (item) => {
    try {
      const r = await subirUno(sb, drive, item, ledger)
      hechos++
      const etiqueta = r.estado === 'omitido' ? 'ya estaba' : 'ok'
      console.log(`  [${hechos}/${pendientes.length}] ${etiqueta} — ${item.relativo}`)
    } catch (err) {
      fallos.push({ item, mensaje: err instanceof Error ? err.message : String(err) })
      console.log(`  [!] FALLÓ — ${item.relativo}: ${err instanceof Error ? err.message : err}`)
    }
  })

  console.log(`\n${hechos} subido(s), ${fallos.length} fallido(s).`)
  if (fallos.length) {
    console.log('\nFallidos (volvé a correr el script: los que ya subieron se saltean solos):')
    for (const f of fallos) console.log(`  ! ${f.item.relativo} — ${f.mensaje}`)
  }
  console.log()

  if (fallos.length) process.exit(1)
}

main().catch((err) => {
  console.error(`\nError: ${err instanceof Error ? err.message : err}\n`)
  process.exit(1)
})
