import type { Metadata } from 'next'
import { createClient } from '@/app/lib/supabase/server'
import { signOut } from '@/app/actions/auth'
import './baneado.css'

export const metadata: Metadata = {
  title: 'Cuenta suspendida — UTN FRC',
}

export default async function BaneadoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let banReason: string | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('ban_reason')
      .eq('id', user.id)
      .maybeSingle()
    banReason = data?.ban_reason ?? null
  }

  return (
    <div className="baneado-page">
      <div className="baneado-card">
        <div className="baneado-icon" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        </div>
        <h1>Cuenta suspendida</h1>
        <p>Tu cuenta fue suspendida por un moderador y no podés acceder a la plataforma por el momento.</p>
        {banReason && (
          <div className="baneado-reason">
            <span className="baneado-reason__label">Motivo</span>
            <span className="baneado-reason__text">{banReason}</span>
          </div>
        )}
        <p className="baneado-contact">
          Si creés que fue un error, escribinos a{' '}
          <a href="mailto:ivanbigatti@gmail.com">ivanbigatti@gmail.com</a>.
        </p>
        <form action={signOut}>
          <button type="submit" className="baneado-signout">Cerrar sesión</button>
        </form>
      </div>
    </div>
  )
}
