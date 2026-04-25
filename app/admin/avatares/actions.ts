'use server'

import { createClient } from '@/app/lib/supabase/server'
import type { UnlockConditionType } from '@/app/components/avatars'

async function checkMod() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase: null, error: 'No autenticado.' }
  const { data: mod } = await supabase.from('moderadores').select('user_id').eq('user_id', user.id).maybeSingle()
  if (!mod) return { supabase: null, error: 'No tenés permisos de moderador.' }
  return { supabase, error: null }
}

export async function agregarAvatar(formData: FormData): Promise<{ error?: string }> {
  const { supabase, error: authError } = await checkMod()
  if (authError || !supabase) return { error: authError ?? 'Error de autenticación.' }

  const key = (formData.get('key') as string).trim().toLowerCase().replace(/\s+/g, '_')
  const name = (formData.get('name') as string).trim()
  const src = (formData.get('src') as string).trim()
  const isFree = formData.get('is_free') === 'true'
  const conditionType = formData.get('condition_type') as UnlockConditionType | null
  const threshold = parseInt(formData.get('threshold') as string, 10)
  const description = (formData.get('description') as string ?? '').trim()

  if (!key || !name || !src) return { error: 'Key, nombre y URL son obligatorios.' }
  if (!/^[a-z0-9_]+$/.test(key)) return { error: 'La key solo puede tener letras minúsculas, números y guión bajo.' }

  const unlock_condition =
    !isFree && conditionType && threshold > 0 && description
      ? { type: conditionType, threshold, description }
      : null

  const { error } = await supabase.from('avatar_configs').insert({
    key,
    name,
    src,
    is_free: isFree,
    unlock_condition,
  })

  if (error) {
    if (error.code === '23505') return { error: `Ya existe un avatar con la key "${key}".` }
    return { error: 'Error al guardar el avatar.' }
  }
  return {}
}

export async function eliminarAvatar(key: string): Promise<{ error?: string }> {
  const { supabase, error: authError } = await checkMod()
  if (authError || !supabase) return { error: authError ?? 'Error de autenticación.' }

  const { error } = await supabase.from('avatar_configs').delete().eq('key', key)
  if (error) return { error: 'Error al eliminar el avatar.' }
  return {}
}
