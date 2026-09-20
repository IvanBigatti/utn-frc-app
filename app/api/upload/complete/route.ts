import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { uploadToDrive } from '@/app/lib/googleDrive'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await request.json() as {
    filePath: string
    mimeType: string
    nombre: string
    tipo: string
    materia_id: string
    ingenieria_id?: string
    descripcion?: string
  }

  const { filePath, mimeType, nombre, tipo, materia_id, ingenieria_id, descripcion } = body

  if (!filePath) return NextResponse.json({ error: 'filePath requerido' }, { status: 400 })
  if (!mimeType) return NextResponse.json({ error: 'mimeType requerido' }, { status: 400 })

  // filePath viene del cuerpo de la petición, o sea que lo elige quien llama.
  // Sin esta comprobación, un usuario autenticado podía mandar la ruta de otro
  // y quedarse con su archivo, o repetir la MISMA ruta muchas veces para que
  // se subiera a Drive una y otra vez, quemando la cuota compartida.
  //
  // La ruta la arma /initiate como `temp/<uid>/<archivo>`, así que el prefijo
  // es prueba de propiedad. Se compara el segmento completo para que un uid
  // que empiece igual que otro no pase.
  const prefijoPropio = `temp/${user.id}/`
  if (!filePath.startsWith(prefijoPropio) || filePath.includes('..')) {
    return NextResponse.json({ error: 'Ruta de archivo inválida' }, { status: 403 })
  }

  const supabaseAdmin = createAdminClient()

  // Reclamar la ruta ANTES de gastar nada. La clave primaria de upload_claim
  // vuelve imposible la carrera: si llegan diez peticiones concurrentes con la
  // misma ruta, sólo una inserta y las otras nueve rebotan acá, sin descargar
  // ni tocar Drive.
  //
  // Sin esto el límite de /initiate no servía para lo que existía: el borrado
  // del temporal es el ÚLTIMO paso, así que N llamadas paralelas descargaban
  // todas antes de que alguna borrara y cada una subía su propio archivo a la
  // cuota compartida de Drive. Una unidad de cuota, subidas ilimitadas.
  const { error: claimError } = await supabaseAdmin
    .from('upload_claim')
    .insert({ file_path: filePath, auth_user_id: user.id })

  if (claimError) {
    // 23505 = violación de unicidad, o sea que ya la reclamó otra petición.
    if (claimError.code === '23505') {
      return NextResponse.json({ error: 'Esta subida ya fue procesada.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'No se pudo procesar la subida.' }, { status: 500 })
  }

  try {
    const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
      .from('uploads-temp')
      .download(filePath)

    if (downloadError) return NextResponse.json({ error: downloadError.message }, { status: 500 })

    const buffer = Buffer.from(await fileBlob.arrayBuffer())
    const safeName = filePath.split('/').pop() ?? filePath

    const driveFileId = await uploadToDrive(buffer, safeName, mimeType)

    const { data, error } = await supabase
      .from('archivos')
      .insert({
        nombre: nombre.trim(),
        tipo,
        materia_id: parseInt(materia_id),
        ingenieria_id: ingenieria_id ? parseInt(ingenieria_id) : null,
        drive_file_id: driveFileId,
        descripcion: descripcion?.trim() || null,
        auth_user_id: user.id,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supabaseAdmin.storage.from('uploads-temp').remove([filePath])

    return NextResponse.json({ archivo: data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
