import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

function safeNextPath(raw: string | null): string {
  if (!raw) return '/'
  try {
    const parsed = new URL(raw, 'http://localhost')
    return parsed.pathname === raw ? raw : '/'
  } catch {
    return '/'
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
