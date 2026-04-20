'use client'

import { useState } from 'react'
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
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-dark hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Toggle de orden */}
        <div className="flex items-center gap-1 border border-gray-300 dark:border-gray-700 rounded-lg p-1">
          <button
            onClick={() => setOrden('rating')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              orden === 'rating' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Mejor puntuación
          </button>
          <button
            onClick={() => setOrden('reciente')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              orden === 'reciente' ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            Más reciente
          </button>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-1">No hay material todavía</p>
          <p className="text-sm">¡Sé el primero en subir algo para {materiaNombre}!</p>
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
