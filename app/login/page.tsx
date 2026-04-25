import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'
import LoginForm from './LoginForm'

type SearchParams = Promise<{ next?: string }>

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { next } = await searchParams

  if (user) {
    redirect(next && next.startsWith('/') && !next.startsWith('//') ? next : '/')
  }

  return <LoginForm next={next ?? '/'} />
}
