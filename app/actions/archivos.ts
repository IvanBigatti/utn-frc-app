'use server'

import { createClient } from '@/app/lib/supabase/server'

export async function puntuarArchivo(archivoId: number, puntos: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Debés iniciar sesión para puntuar' }
  if (puntos < 1 || puntos > 5) return { error: 'Puntuación inválida' }

  const { error } = await supabase
    .from('puntuaciones')
    .upsert(
      { archivo_id: archivoId, usuario_id: user.id, puntos },
      { onConflict: 'archivo_id,usuario_id' }
    )

  if (error) return { error: 'Error al guardar la puntuación' }
  return { ok: true }
}

export async function incrementarDescargas(archivoId: number) {
  const supabase = await createClient()
  await supabase.rpc('incrementar_descargas', { archivo_id_param: archivoId })
}
