'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { deleteFromDrive } from '@/app/lib/googleDrive'
import { headers } from 'next/headers'

function safeNextPath(raw: string | null): string {
  if (!raw) return '/'
  try {
    const parsed = new URL(raw, 'http://localhost')
    return parsed.pathname === raw ? raw : '/'
  } catch {
    return '/'
  }
}

type ActionResult = { error?: string; message?: string } | undefined

const ALLOWED_DOMAINS = [
  'gmail.com',
  'hotmail.com', 'hotmail.com.ar', 'hotmail.es',
  'outlook.com', 'outlook.com.ar', 'outlook.es',
  'yahoo.com', 'yahoo.com.ar', 'yahoo.es',
  'live.com', 'live.com.ar',
  'icloud.com', 'me.com',
  'protonmail.com', 'proton.me',
  'msn.com',
  'frc.utn.edu.ar', 'utn.edu.ar',
]

export async function signInWithEmail(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) return { error: error.message }

  redirect(safeNextPath(formData.get('next') as string | null))
}

export async function signUpWithEmail(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!formData.get('acceptTerms')) {
    return { error: 'Debés aceptar los Términos y Condiciones para registrarte.' }
  }

  const email = formData.get('email') as string
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain || !ALLOWED_DOMAINS.includes(domain)) {
    return { error: 'Registrate con un email de Gmail, Hotmail, Outlook, Yahoo u otro proveedor conocido.' }
  }

  const supabase = await createClient()
  const headerStore = await headers()
  const origin = headerStore.get('origin')

  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) return { error: error.message }

  return { message: 'Revisá tu email para confirmar tu cuenta.' }
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient()
  const headerStore = await headers()
  const origin = headerStore.get('origin')

  const next = safeNextPath(formData.get('next') as string | null)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  })

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`)

  redirect(data.url)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function eliminarCuenta(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const uid = user.id

  // Eliminar archivos de Google Drive
  const { data: archivos } = await supabase
    .from('archivos')
    .select('drive_file_id')
    .eq('auth_user_id', uid)

  if (archivos?.length) {
    await Promise.allSettled(
      archivos.map((a) => deleteFromDrive(a.drive_file_id))
    )
  }

  // Eliminar datos del usuario en orden (respetando FK)
  const admin = createAdminClient()
  await admin.from('foro_vote').delete().eq('auth_user_id', uid)
  await admin.from('foro_comment_report').delete().eq('auth_user_id', uid)
  await admin.from('foro_report').delete().eq('auth_user_id', uid)
  await admin.from('puntuaciones').delete().eq('usuario_id', uid)
  await admin.from('foro_comment').delete().eq('auth_user_id', uid)
  await admin.from('archivos').delete().eq('auth_user_id', uid)
  await admin.from('foro_post').delete().eq('auth_user_id', uid)
  await admin.from('progreso').delete().eq('user_id', uid)
  await admin.from('moderadores').delete().eq('user_id', uid)
  await admin.from('profiles').delete().eq('id', uid)

  // Eliminar el usuario de auth
  const { error } = await admin.auth.admin.deleteUser(uid)
  if (error) return { error: 'Error al eliminar la cuenta. Intentá de nuevo.' }

  await supabase.auth.signOut()
  redirect('/login')
}
