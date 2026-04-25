'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ALLOWED_PATHS = ['/', '/resultados']

export default function FloatingUploadButton() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  if (!ALLOWED_PATHS.includes(pathname)) return null

  return (
    <div className="fixed right-4 sm:right-6 z-50 flex flex-col items-center gap-2 sm:gap-3" style={{ bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))' }}>

      {/* Botón secundario: "Subir material" */}
      <div
        className={`flex flex-col items-center gap-1 transition-all duration-300 ease-out ${
          open
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <Link
          href="/upload"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 sm:py-2.5 rounded-full shadow-lg transition-colors whitespace-nowrap"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0-12l-4 4m4-4l4 4" />
          </svg>
          Subir material
        </Link>
        {/* Flecha indicadora */}
        <div className="w-0.5 h-3 bg-blue-400 rounded-full" />
      </div>

      {/* Botón principal: + */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Cerrar' : 'Agregar material'}
        className={`w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300 ${
          open ? 'rotate-45 bg-blue-700' : 'rotate-0'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:w-7 sm:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

    </div>
  )
}
