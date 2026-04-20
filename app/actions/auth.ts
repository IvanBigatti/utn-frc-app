'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'
import { headers } from 'next/headers'

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

  redirect('/')
}

export async function signUpWithEmail(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
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

export async function signInWithGoogle() {
  const supabase = await createClient()
  const headerStore = await headers()
  const origin = headerStore.get('origin')

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
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
