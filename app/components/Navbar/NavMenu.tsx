'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signOut } from '@/app/actions/auth'
import { getAvatarSrc } from '@/app/components/avatars'

const NAV_LINKS = [
  { href: '/armadorHorarios', label: 'Armador de Horarios' },
  { href: '/foro', label: 'Foro' },
  { href: '/progreso', label: 'Progreso' },
  { href: '/upload', label: 'Subir material' },
]

type Props = {
  email: string | null
  avatarKey: string | null
  avatarSrc: string | null
  isMod?: boolean
}

export default function NavMenu({ email, avatarKey, avatarSrc, isMod }: Props) {
  const [open, setOpen] = useState(false)
  const resolvedSrc = avatarSrc ?? getAvatarSrc(avatarKey)

  return (
    <>
      {/* Derecha: avatar + cerrar sesión (desktop) + hamburger (mobile) */}
      <div className="flex items-center gap-2 md:order-2">
        {email ? (
          <div className="hidden md:flex items-center gap-3">
            <Link href="/perfil" className="flex-shrink-0" title="Mi perfil">
              <img
                src={resolvedSrc}
                alt="Mi perfil"
                className="w-8 h-8 rounded-full border-2 border-gray-200 hover:border-[var(--color-primary-light)] transition-colors object-cover bg-gray-100"
              />
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm font-medium text-gray-600 hover:text-red-600 transition-colors px-3 py-2"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="hidden md:inline-flex text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] px-4 py-2 rounded-lg transition-colors"
          >
            Iniciar sesión
          </Link>
        )}

        <button
          onClick={() => setOpen(o => !o)}
          className="inline-flex items-center justify-center p-2.5 w-11 h-11 text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
          aria-expanded={open}
          aria-controls="navbar-menu"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M5 7h14M5 12h14M5 17h14" />
          </svg>
        </button>
      </div>

      {/* Links de navegación */}
      <div
        className={`${open ? 'block' : 'hidden'} w-full md:flex md:w-auto md:order-1`}
        id="navbar-menu"
      >
        <ul className="flex flex-col font-medium p-4 md:p-0 mt-3 md:mt-0 border border-gray-100 rounded-lg bg-gray-50 md:flex-row md:gap-8 md:border-0 md:bg-transparent">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                className="block py-2 px-3 text-gray-700 rounded hover:bg-gray-100 md:hover:bg-transparent md:hover:text-[var(--color-primary)] md:p-0 text-sm transition-colors"
              >
                {label}
              </Link>
            </li>
          ))}
          {isMod && (
            <li>
              <Link
                href="/mod"
                onClick={() => setOpen(false)}
                className="block py-2 px-3 text-amber-600 rounded hover:bg-amber-50 md:hover:bg-transparent md:hover:text-amber-700 md:p-0 text-sm font-semibold transition-colors"
              >
                Moderación
              </Link>
            </li>
          )}

          {/* Mobile: perfil + email + logout */}
          {email && (
            <li className="md:hidden border-t border-gray-200 mt-2 pt-2 flex flex-col gap-1">
              <Link
                href="/perfil"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded"
              >
                <img
                  src={resolvedSrc}
                  alt=""
                  className="w-6 h-6 rounded-full border border-gray-200 bg-gray-100"
                />
                Mi perfil
              </Link>
              <span className="px-3 py-1 text-xs text-gray-400">{email}</span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-100 rounded"
                >
                  Cerrar sesión
                </button>
              </form>
            </li>
          )}
          {!email && (
            <li className="md:hidden border-t border-gray-200 mt-2 pt-2">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] rounded-lg text-center"
              >
                Iniciar sesión
              </Link>
            </li>
          )}
        </ul>
      </div>
    </>
  )
}
