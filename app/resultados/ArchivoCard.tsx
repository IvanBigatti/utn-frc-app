'use client'

import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import StarRating from '@/app/components/StarRating/StarRating'
import { incrementarDescargas } from '@/app/actions/archivos'
import { getDriveViewUrl, getDriveDownloadUrl } from '@/app/lib/driveUrls'

type Archivo = {
  id: number
  nombre: string
  tipo: string
  descripcion: string | null
  created_at: string
  drive_file_id: string
  auth_user_id: string
  descargas: number
  rating_promedio: number
  total_votos: number
  materia_nombre: string
}

type Props = {
  archivo: Archivo
  usuarioLogueado: boolean
  usuarioId: string | null
  esModerador: boolean
}

const TIPO_STYLES: Record<string, string> = {
  resumen: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  parcial: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  tp:      'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
}

const TIPO_LABELS: Record<string, string> = {
  resumen: 'Resumen',
  parcial: 'Parcial',
  tp: 'TP',
}

export default function ArchivoCard({ archivo, usuarioLogueado, usuarioId, esModerador }: Props) {
  const [, startTransition] = useTransition()
  const [reportado, setReportado] = useState(false)
  const [eliminado, setEliminado] = useState(false)
  const [reportando, setReportando] = useState(false)
  const [eliminandoMod, setEliminandoMod] = useState(false)
  const [eliminandoPropio, setEliminandoPropio] = useState(false)

  useEffect(() => {
    if (!usuarioId) return
    const supabase = createClient()
    supabase
      .from('archivo_report')
      .select('id')
      .eq('archivo_id', archivo.id)
      .eq('auth_user_id', usuarioId)
      .maybeSingle()
      .then(({ data }) => { if (data) setReportado(true) })
  }, [archivo.id, usuarioId])

  const fecha = new Date(archivo.created_at).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  const handleDescargar = () => {
    startTransition(async () => {
      await incrementarDescargas(archivo.id)
    })
    window.open(getDriveDownloadUrl(archivo.drive_file_id), '_blank')
  }

  const handleReportar = async () => {
    if (reportado) {
      setReportando(true)
      const res = await fetch(`/api/report-archivo?archivoId=${archivo.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      setReportando(false)
      if (data.error) { alert(data.error); return }
      setReportado(false)
      return
    }
    if (!window.confirm('¿Querés reportar este archivo como contenido inapropiado?')) return
    setReportando(true)
    const res = await fetch('/api/report-archivo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archivoId: archivo.id }),
    })
    const data = await res.json()
    setReportando(false)
    if (data.error) { alert(data.error); return }
    if (data.deleted) { setEliminado(true); return }
    setReportado(true)
  }

  const handleEliminarPropio = async () => {
    if (!window.confirm('¿Eliminar este archivo? Esta acción no se puede deshacer.')) return
    setEliminandoPropio(true)
    const res = await fetch(`/api/delete-archivo?archivoId=${archivo.id}`, { method: 'DELETE' })
    const data = await res.json()
    setEliminandoPropio(false)
    if (data.error) { alert(data.error); return }
    setEliminado(true)
  }

  const handleEliminarMod = async () => {
    if (!window.confirm('¿Eliminar este archivo como moderador?')) return
    setEliminandoMod(true)
    const res = await fetch(`/api/mod-archivo?archivoId=${archivo.id}`, { method: 'DELETE' })
    const data = await res.json()
    setEliminandoMod(false)
    if (data.error) { alert(data.error); return }
    setEliminado(true)
  }

  if (eliminado) return null

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TIPO_STYLES[archivo.tipo]}`}>
              {TIPO_LABELS[archivo.tipo]}
            </span>
            <span className="text-xs text-gray-400">{fecha}</span>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{archivo.nombre}</h3>
          {archivo.descripcion && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{archivo.descripcion}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <StarRating
            archivoId={archivo.id}
            promedio={Number(archivo.rating_promedio)}
            totalVotos={Number(archivo.total_votos)}
            usuarioLogueado={usuarioLogueado}
          />
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <span aria-hidden="true">↓</span>
            <span className="sr-only">Descargas: </span>
            {archivo.descargas}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {usuarioId === archivo.auth_user_id && (
            <button
              onClick={handleEliminarPropio}
              disabled={eliminandoPropio}
              className="text-xs px-3 py-1.5 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 hover:border-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Eliminar mi archivo"
            >
              {eliminandoPropio ? '...' : 'Eliminar'}
            </button>
          )}
          {esModerador && usuarioId !== archivo.auth_user_id && (
            <button
              onClick={handleEliminarMod}
              disabled={eliminandoMod}
              className="text-xs px-2 py-1.5 border border-red-200 rounded-lg text-red-400 hover:text-red-600 hover:border-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={eliminandoMod ? 'Eliminando...' : 'Eliminar como moderador'}
            >
              <span aria-hidden="true">{eliminandoMod ? '...' : '🗑'}</span>
            </button>
          )}
          {usuarioId && (
            <button
              onClick={handleReportar}
              disabled={reportando}
              className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={reportando ? 'Procesando...' : reportado ? 'Quitar reporte de este archivo' : 'Reportar este archivo'}
              aria-pressed={reportado}
            >
              <span aria-hidden="true">{reportando ? '...' : reportado ? '⚑ Quitar reporte' : '⚑'}</span>
            </button>
          )}
          <a
            href={getDriveViewUrl(archivo.drive_file_id)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Ver
          </a>
          <button
            onClick={handleDescargar}
            className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Descargar
          </button>
        </div>
      </div>
    </div>
  )
}
