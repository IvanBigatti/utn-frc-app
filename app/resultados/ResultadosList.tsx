'use client'

import { useState } from 'react'
import Link from 'next/link'
import ArchivoCard from './ArchivoCard'

type Archivo = {
  id: number
  nombre: string
  tipo: string
  descripcion: string | null
  created_at: string
  drive_file_id: string
  descargas: number
  rating_promedio: number
  total_votos: number
  materia_nombre: string
  auth_user_id: string
}

type Props = {
  archivos: Archivo[]
  usuarioLogueado: boolean
  usuarioId: string | null
  esModerador: boolean
  materiaNombre: string
}

const FILTROS = [
  { value: 'todos', label: 'Todos' },
  { value: 'resumen', label: 'Resúmenes' },
  { value: 'parcial', label: 'Parciales' },
  { value: 'tp', label: 'TPs' },
]

export default function ResultadosList({ archivos, usuarioLogueado, usuarioId, esModerador, materiaNombre }: Props) {
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [orden, setOrden] = useState<'rating' | 'reciente'>('rating')

  const filtrados = archivos
    .filter(a => filtroTipo === 'todos' || a.tipo === filtroTipo)
    .sort((a, b) => {
      if (orden === 'rating') {
        const diff = Number(b.rating_promedio) - Number(a.rating_promedio)
        return diff !== 0 ? diff : b.descargas - a.descargas
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        {/* Chips de tipo */}
        <div className="flex gap-2 flex-wrap">
          {FILTROS.map(f => (
            <button
              key={f.value}
              onClick={() => setFiltroTipo(f.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filtroTipo === f.value
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'border border-gray-300 text-gray-900 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Toggle de orden */}
        <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1">
          <button
            onClick={() => setOrden('rating')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              orden === 'rating' ? 'bg-[var(--color-primary)] text-white' : 'text-gray-600'
            }`}
          >
            Mejor puntuación
          </button>
          <button
            onClick={() => setOrden('reciente')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              orden === 'reciente' ? 'bg-[var(--color-primary)] text-white' : 'text-gray-600'
            }`}
          >
            Más reciente
          </button>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="resultados-empty">
          <svg className="resultados-empty__icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p className="resultados-empty__title">No hay material para {materiaNombre} todavía</p>
          <p className="resultados-empty__body">Sé el primero en subir un resumen, parcial o TP.</p>
          <Link href="/upload" className="btn-primary" style={{ textDecoration: 'none' }}>
            Subir material
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtrados.map(archivo => (
            <ArchivoCard key={archivo.id} archivo={archivo} usuarioLogueado={usuarioLogueado} usuarioId={usuarioId} esModerador={esModerador} />
          ))}
        </div>
      )}
    </div>
  )
}
