import { redirect } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/server'
import UploadForm from './UploadForm'

export default async function UploadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900  mb-2">Subir material</h1>
      <p className="text-gray-500  mb-8 text-sm">
        Compartí tus apuntes con el resto de la facultad.
      </p>
      <UploadForm />
    </main>
  )
}
