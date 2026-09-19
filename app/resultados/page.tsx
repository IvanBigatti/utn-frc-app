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
        <Link href="/" className="mt-4 inline-block text-[var(--color-primary)] hover:underline text-sm">
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

  // Ambas cosas dependen de `user`, así que van en la misma etapa.
  //
  // Los reportes se piden UNA vez para todos los archivos. Antes cada
  // ArchivoCard preguntaba por el suyo desde el navegador: con 20 archivos
  // eran 20 viajes Córdoba -> Virginia (~200ms cada uno, y el navegador
  // abre como mucho 6 en paralelo) para responder algo que el servidor
  // resuelve en una consulta de ~2ms mientras arma el HTML.
  let esModerador = false
  let reportadosIds: number[] = []
  if (user) {
    const archivoIds = (archivos ?? []).map(a => a.id)
    const [{ data: mod }, { data: reportes }] = await Promise.all([
      supabase
        .from('moderadores')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle(),
      archivoIds.length
        ? supabase
            .from('archivo_report')
            .select('archivo_id')
            .eq('auth_user_id', user.id)
            .in('archivo_id', archivoIds)
        : Promise.resolve({ data: [] as { archivo_id: number }[] }),
    ])
    esModerador = !!mod
    reportadosIds = (reportes ?? []).map((r: { archivo_id: number }) => r.archivo_id)
  }

  const materiaNombre = archivos?.[0]?.materia_nombre ?? 'esta materia'

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <div className="mb-8">
        <Link href="/" className="text-sm text-[var(--color-primary)] hover:underline">
          ← Volver a buscar
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{materiaNombre}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {archivos?.length ?? 0} archivo{archivos?.length !== 1 ? 's' : ''} disponible{archivos?.length !== 1 ? 's' : ''}
        </p>
      </div>

      <ResultadosList
        archivos={archivos ?? []}
        usuarioLogueado={!!user}
        usuarioId={user?.id ?? null}
        esModerador={esModerador}
        reportadosIds={reportadosIds}
        materiaNombre={materiaNombre}
      />
    </main>
  )
}
