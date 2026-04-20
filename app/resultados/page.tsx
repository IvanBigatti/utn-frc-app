import { createClient } from '@/app/lib/supabase/server'
import ResultadosList from './ResultadosList'
import Link from 'next/link'

type SearchParams = Promise<{ materia_id?: string; carrera_id?: string; anio?: string }>

export default async function ResultadosPage({ searchParams }: { searchParams: SearchParams }) {
  const { materia_id } = await searchParams

  if (!materia_id) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-10 text-center">
        <p className="text-gray-500">Usá el buscador para encontrar material.</p>
        <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline text-sm">
          Ir al inicio
        </Link>
      </main>
    )
  }

  const supabase = await createClient()

  const [{ data: archivos }, { data: { user } }] = await Promise.all([
    supabase
      .from('archivos_con_rating')
      .select('*')
      .eq('materia_id', materia_id),
    supabase.auth.getUser(),
  ])

  let esModerador = false
  if (user) {
    const { data: mod } = await supabase
      .from('moderadores')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
    esModerador = !!mod
  }

  const materiaNombre = archivos?.[0]?.materia_nombre ?? 'esta materia'

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <Link href="/" className="text-sm text-blue-600 hover:text-blue-800 dark:hover:text-blue-400">
          ← Volver a buscar
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{materiaNombre}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {archivos?.length ?? 0} archivo{archivos?.length !== 1 ? 's' : ''} disponible{archivos?.length !== 1 ? 's' : ''}
        </p>
      </div>

      <ResultadosList
        archivos={archivos ?? []}
        usuarioLogueado={!!user}
        usuarioId={user?.id ?? null}
        esModerador={esModerador}
        materiaNombre={materiaNombre}
      />
    </main>
  )
}
