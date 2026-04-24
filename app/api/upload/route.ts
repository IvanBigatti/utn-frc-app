import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { uploadToDrive } from '@/app/lib/googleDrive'
import { optimizeFile } from '@/app/lib/fileOptimizer'

const VIRUSTOTAL_API_KEY = process.env.VIRUSTOTAL_API_KEY!
const MAX_SIZE_BYTES = 20 * 1024 * 1024 // 20 MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']

// 🔐 Escaneo con VirusTotal (versión corregida)
async function scanFileWithVirusTotal(file: File): Promise<boolean> {
  const buffer = Buffer.from(await file.arrayBuffer())

  const formData = new FormData()
  formData.append(
    'file',
    new Blob([buffer], { type: file.type }),
    file.name
  )

  // 1. Subir archivo
  const uploadRes = await fetch('https://www.virustotal.com/api/v3/files', {
    method: 'POST',
    headers: {
      'x-apikey': VIRUSTOTAL_API_KEY,
    },
    body: formData,
  })

  if (!uploadRes.ok) {
    throw new Error('Error al subir archivo a VirusTotal')
  }

  const uploadData = await uploadRes.json()
  const analysisId = uploadData.data.id

  // 2. Polling
  let status = 'queued'
  let report: any

  while (status !== 'completed') {
    await new Promise(res => setTimeout(res, 3000))

    const res = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
      headers: { 'x-apikey': VIRUSTOTAL_API_KEY },
    })

    if (!res.ok) {
      throw new Error('Error obteniendo análisis de VirusTotal')
    }

    report = await res.json()
    status = report.data.attributes.status
  }

  const stats = report.data.attributes.stats

  return stats.malicious === 0 && stats.suspicious === 0
}

// 🚀 Endpoint principal
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 🔐 Auth
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const formData = await request.formData()

    const file = formData.get('file') as File | null
    const nombre = formData.get('nombre') as string
    const tipo = formData.get('tipo') as string
    const materiaId = formData.get('materia_id') as string
    const ingenieriaId = formData.get('ingenieria_id') as string
    const descripcion = formData.get('descripcion') as string | null

    // 🧪 Validaciones
    if (!file) {
      return NextResponse.json({ error: 'No se envió archivo' }, { status: 400 })
    }

    if (!nombre?.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    if (!['resumen', 'parcial', 'tp'].includes(tipo)) {
      return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
    }

    if (!materiaId || isNaN(parseInt(materiaId, 10))) {
      return NextResponse.json({ error: 'La materia es requerida' }, { status: 400 })
    }

    if (ingenieriaId && isNaN(parseInt(ingenieriaId, 10))) {
      return NextResponse.json({ error: 'Ingeniería inválida' }, { status: 400 })
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'El archivo supera los 20 MB' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 })
    }

    // 🔐 SCAN
    const isSafe = await scanFileWithVirusTotal(file)

    if (!isSafe) {
      return NextResponse.json(
        { error: 'Archivo rechazado por seguridad (malicioso o sospechoso)' },
        { status: 400 }
      )
    }

    // ☁️ Subir a Drive
    const rawBuffer = Buffer.from(await file.arrayBuffer())
    const { buffer, mimeType: optimizedMimeType } = await optimizeFile(rawBuffer, file.type)
    const ext = optimizedMimeType === 'image/jpeg' && file.type === 'image/png' ? '.jpg' : ''
    const baseName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const safeName = `${Date.now()}-${ext ? baseName.replace(/\.png$/i, ext) : baseName}`

    const driveFileId = await uploadToDrive(buffer, safeName, optimizedMimeType)

    // 💾 Guardar en Supabase
    const { data, error } = await supabase
      .from('archivos')
      .insert({
        nombre: nombre.trim(),
        tipo,
        materia_id: parseInt(materiaId),
        ingenieria_id: ingenieriaId ? parseInt(ingenieriaId) : null,
        drive_file_id: driveFileId,
        descripcion: descripcion?.trim() || null,
        auth_user_id: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('[upload] Supabase insert error:', error)
      return NextResponse.json({ error: 'Error al guardar el archivo' }, { status: 500 })
    }

    return NextResponse.json({ archivo: data })

  } catch (err: any) {
    console.error('[upload] Unexpected error:', err)

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}