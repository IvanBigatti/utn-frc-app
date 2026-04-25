import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'
import type { AvatarConfig } from '@/app/components/avatars'
import AvatarAdminClient from './AvatarAdminClient'

export default async function AdminAvatarPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: mod } = await supabase
    .from('moderadores')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!mod) redirect('/')

  const { data: avatars } = await supabase
    .from('avatar_configs')
    .select('*')
    .order('display_order')

  return <AvatarAdminClient avatars={(avatars ?? []) as AvatarConfig[]} />
}
