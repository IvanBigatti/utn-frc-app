import Link from 'next/link'
import { createClient } from '@/app/lib/supabase/server'
import NavMenu from './NavMenu'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let avatarKey: string | null = null
  let avatarSrc: string | null = null
  let isMod = false
  if (user) {
    const [profileRes, modRes] = await Promise.all([
      supabase.from('profiles').select('avatar_key, avatar_src').eq('id', user.id).maybeSingle(),
      supabase.from('moderadores').select('user_id').eq('user_id', user.id).maybeSingle(),
    ])
    avatarKey = profileRes.data?.avatar_key ?? null
    avatarSrc = profileRes.data?.avatar_src ?? null
    isMod = !!modRes.data
  }

  return (
    <nav
      aria-label="Principal"
      className="navbar bg-[var(--color-card)] fixed w-full z-20 top-0 start-0 border-b border-[var(--color-border)]"
    >
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto px-4 h-14">

        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-[var(--color-text)] tracking-tight">TUTN</span>
        </Link>

        <NavMenu email={user?.email ?? null} avatarKey={avatarKey} avatarSrc={avatarSrc} isMod={isMod} />

      </div>
    </nav>
  )
}
