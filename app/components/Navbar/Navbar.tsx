import Link from 'next/link'
import { createClient } from '@/app/lib/supabase/server'
import NavMenu from './NavMenu'

export default async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <nav className="bg-white fixed w-full z-20 top-0 start-0 border-b border-gray-200">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto px-4 h-14">

        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-gray-900 tracking-tight">TUTN</span>
        </Link>

        <NavMenu email={user?.email ?? null} />

      </div>
    </nav>
  )
}
