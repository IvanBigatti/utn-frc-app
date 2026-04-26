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
  resumen: 'bg-blue-100 text-blue-700',
  parcial: 'bg-orange-100 text-orange-700',
  tp:      'bg-green-100 text-green-700',
}

const TIPO_LABELS: Record<string, string> = {
  resumen: 'Resumen',
  parcial: 'Parcial',
  tp: 'TP',
}

const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
)

export default function ArchivoCard({ archivo, usuarioLogueado, usuarioId, esModerador }: Props) {
  const [, startTransition] = useTransition()
  const [reportado, setReportado] = useState(false)
  const [eliminado, setEliminado] = useState(false)
  const [reportando, setReportando] = useState(false)
  const [eliminandoMod, setEliminandoMod] = useState(false)
  const [eliminandoPropio, setEliminandoPropio] = useState(false)
  const [confirming, setConfirming] = useState<'reporte' | 'propio' | 'mod' | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const showError = (msg: string) => {
    setErrorMsg(msg)
    setTimeout(() => setErrorMsg(null), 4000)
  }

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
      const res = await fetch(`/api/report-archivo?archivoId=${archivo.id}`, { method: 'DELETE' })
      const data = await res.json()
      setReportando(false)
      if (data.error) { showError(data.error); return }
      setReportado(false)
      return
    }
    setConfirming('reporte')
  }

  const handleConfirmar = async (tipo: 'reporte' | 'propio' | 'mod') => {
    setConfirming(null)
    if (tipo === 'reporte') {
      setReportando(true)
      const res = await fetch('/api/report-archivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archivoId: archivo.id }),
      })
      const data = await res.json()
      setReportando(false)
      if (data.error) { showError(data.error); return }
      if (data.deleted) { setEliminado(true); return }
      setReportado(true)
    } else if (tipo === 'propio') {
      setEliminandoPropio(true)
      const res = await fetch(`/api/delete-archivo?archivoId=${archivo.id}`, { method: 'DELETE' })
      const data = await res.json()
      setEliminandoPropio(false)
      if (data.error) { showError(data.error); return }
      setEliminado(true)
    } else {
      setEliminandoMod(true)
      const res = await fetch(`/api/mod-archivo?archivoId=${archivo.id}`, { method: 'DELETE' })
      const data = await res.json()
      setEliminandoMod(false)
      if (data.error) { showError(data.error); return }
      setEliminado(true)
    }
  }

  if (eliminado) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TIPO_STYLES[archivo.tipo]}`}>
              {TIPO_LABELS[archivo.tipo]}
            </span>
            <span className="text-xs text-gray-400">{fecha}</span>
          </div>
          <h3 className="font-semibold text-gray-900 text-sm truncate">{archivo.nombre}</h3>
          {archivo.descripcion && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{archivo.descripcion}</p>
          )}
        </div>
      </div>

      {errorMsg && (
        <p className="text-xs text-[var(--color-danger)]" role="alert">{errorMsg}</p>
      )}

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

        <div className="flex items-center gap-2 flex-wrap">
          {usuarioId === archivo.auth_user_id && (
            confirming === 'propio' ? (
              <span className="flex items-center gap-1 text-xs text-red-600">
                <span>¿Eliminar?</span>
                <button onClick={() => handleConfirmar('propio')} className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">Sí</button>
                <button onClick={() => setConfirming(null)} className="px-2 py-1 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition-colors">No</button>
              </span>
            ) : (
              <button
                onClick={() => setConfirming('propio')}
                disabled={eliminandoPropio}
                className="text-xs px-3 py-2 border border-red-200 rounded-lg text-red-500 hover:bg-red-50 hover:border-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {eliminandoPropio ? '...' : 'Eliminar'}
              </button>
            )
          )}
          {esModerador && usuarioId !== archivo.auth_user_id && (
            confirming === 'mod' ? (
              <span className="flex items-center gap-1 text-xs text-red-600">
                <span>¿Eliminar (mod)?</span>
                <button onClick={() => handleConfirmar('mod')} className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">Sí</button>
                <button onClick={() => setConfirming(null)} className="px-2 py-1 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition-colors">No</button>
              </span>
            ) : (
              <button
                onClick={() => setConfirming('mod')}
                disabled={eliminandoMod}
                className="text-xs px-2 py-2 border border-red-200 rounded-lg text-red-400 hover:text-red-600 hover:border-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={eliminandoMod ? 'Eliminando...' : 'Eliminar como moderador'}
              >
                {eliminandoMod ? '...' : <TrashIcon />}
              </button>
            )
          )}
          {usuarioId && (
            confirming === 'reporte' ? (
              <span className="flex items-center gap-1 text-xs text-gray-600">
                <span>¿Reportar?</span>
                <button onClick={() => handleConfirmar('reporte')} className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">Sí</button>
                <button onClick={() => setConfirming(null)} className="px-2 py-1 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50 transition-colors">No</button>
              </span>
            ) : (
              <button
                onClick={handleReportar}
                disabled={reportando}
                className="text-xs px-3 py-2 border border-gray-200 rounded-lg text-gray-400 hover:text-red-500 hover:border-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={reportando ? 'Procesando...' : reportado ? 'Quitar reporte de este archivo' : 'Reportar este archivo'}
                aria-pressed={reportado}
              >
                <span aria-hidden="true">{reportando ? '...' : reportado ? '⚑ Quitar reporte' : '⚑'}</span>
              </button>
            )
          )}
          <a
            href={getDriveViewUrl(archivo.drive_file_id)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Ver
          </a>
          <button
            onClick={handleDescargar}
            className="text-xs px-3 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white rounded-lg transition-colors"
          >
            Descargar
          </button>
        </div>
      </div>
    </div>
  )
}
