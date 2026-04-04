'use client'

import { useState, useTransition } from 'react'
import { puntuarArchivo } from '@/app/actions/archivos'

type Props = {
  archivoId: number
  promedio: number
  totalVotos: number
  usuarioLogueado: boolean
}

export default function StarRating({ archivoId, promedio, totalVotos, usuarioLogueado }: Props) {
  const [hovered, setHovered] = useState(0)
  const [seleccionado, setSeleccionado] = useState(0)
  const [isPending, startTransition] = useTransition()

  const displayValue = hovered || seleccionado || promedio

  const handleClick = (puntos: number) => {
    if (!usuarioLogueado) return
    setSeleccionado(puntos)
    startTransition(async () => {
      await puntuarArchivo(archivoId, puntos)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            disabled={!usuarioLogueado || isPending}
            onClick={() => handleClick(star)}
            onMouseEnter={() => usuarioLogueado && setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className={`text-xl transition-colors ${
              usuarioLogueado ? 'cursor-pointer hover:scale-110' : 'cursor-default'
            } ${star <= displayValue ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
            aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
          >
            ★
          </button>
        ))}
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {promedio > 0 ? promedio.toFixed(1) : '—'}
        {totalVotos > 0 && ` (${totalVotos})`}
      </span>
    </div>
  )
}
