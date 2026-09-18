'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from '@/app/actions/auth'
import { getAvatarSrc } from '@/app/components/avatars'
import SearchModal from '@/app/components/SearchModal/SearchModal'
import './navbar.css'

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
  const [searchOpen, setSearchOpen] = useState(false)
  const pathname = usePathname()
  const resolvedSrc = avatarSrc ?? getAvatarSrc(avatarKey)

  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // A section stays current while you are inside it, so /foro/123 still
  // highlights Foro. Exact match only for the root, which every path prefixes.
  const isCurrent = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')

  // Navigating away must close the panel. The links' own onClick covers taps,
  // but not the back button or any programmatic push.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // Opening search closes the hamburger panel. Reaching the search button by
  // keyboard fires no pointerdown, so without this both could be open at once
  // and their two Escape handlers would fight over where focus lands.
  useEffect(() => {
    if (searchOpen) setOpen(false)
  }, [searchOpen])

  // Escape closes the panel and hands focus back to the control that opened it.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      toggleRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  // Tapping anywhere else dismisses it, the way a disclosure is expected to
  // behave. The toggle is excluded so its own click is not handled twice.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (panelRef.current?.contains(target) || toggleRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  return (
    <>
      {/* Derecha: buscar + avatar + cerrar sesión (desktop) + hamburger (mobile) */}
      <div className="flex items-center gap-2 md:order-2">

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="nav-search"
          aria-label="Buscar material"
          aria-haspopup="dialog"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="nav-search__label">Buscar material</span>
        </button>

        {email ? (
          <div className="hidden md:flex items-center gap-3">
            <Link href="/perfil" className="flex-shrink-0">
              <img src={resolvedSrc} alt="Mi perfil" className="nav-avatar" />
            </Link>
            <form action={signOut}>
              <button type="submit" className="nav-logout">
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
          ref={toggleRef}
          onClick={() => setOpen(o => !o)}
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="navbar-menu"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="M5 7h14M5 12h14M5 17h14" />
          </svg>
        </button>
      </div>

      {/* Links de navegación */}
      <div
        ref={panelRef}
        className={`${open ? 'block' : 'hidden'} w-full md:flex md:w-auto md:order-1`}
        id="navbar-menu"
      >
        <ul className="nav-panel">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                className="nav-link"
                aria-current={isCurrent(href) ? 'page' : undefined}
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
                className="nav-link nav-link--mod"
                aria-current={isCurrent('/mod') ? 'page' : undefined}
              >
                Moderación
              </Link>
            </li>
          )}

          {/* Mobile: perfil + email + logout */}
          {email && (
            <li className="md:hidden border-t border-[var(--color-border)] mt-2 pt-2 flex flex-col gap-1">
              <Link
                href="/perfil"
                onClick={() => setOpen(false)}
                className="nav-link"
                aria-current={isCurrent('/perfil') ? 'page' : undefined}
              >
                <img src={resolvedSrc} alt="" className="w-6 h-6 rounded-full mr-2 bg-[var(--color-surface)]" />
                Mi perfil
              </Link>
              <span className="nav-email px-3 py-1">{email}</span>
              <form action={signOut}>
                <button type="submit" className="nav-logout w-full">
                  Cerrar sesión
                </button>
              </form>
            </li>
          )}
          {!email && (
            <li className="md:hidden border-t border-[var(--color-border)] mt-2 pt-2">
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

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
