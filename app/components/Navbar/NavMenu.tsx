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
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const pathname = usePathname()
  const resolvedSrc = avatarSrc ?? getAvatarSrc(avatarKey)

  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const avatarRef = useRef<HTMLButtonElement>(null)

  // A section stays current while you are inside it, so /foro/123 still
  // highlights Foro. Exact match only for the root, which every path prefixes.
  const isCurrent = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')

  // Both disclosures can hold the logout confirmation, so closing either one
  // discards it. A pending confirm must never survive to the next opening.
  const closeUserMenu = () => {
    setUserMenuOpen(false)
    setConfirmingLogout(false)
  }

  const closePanel = () => {
    setOpen(false)
    setConfirmingLogout(false)
  }

  // Navigating away must clear both disclosures. Their own onClick handlers
  // cover link taps, but not the back button or any programmatic push.
  useEffect(() => {
    closePanel()
    closeUserMenu()
  }, [pathname])

  // Opening search closes the hamburger panel. Reaching the search button by
  // keyboard fires no pointerdown, so without this both could be open at once
  // and their two Escape handlers would fight over where focus lands.
  useEffect(() => {
    if (searchOpen) {
      closePanel()
      closeUserMenu()
    }
  }, [searchOpen])

  // Escape steps back one level at a time: it cancels a pending confirmation
  // before it closes the menu holding it.
  useEffect(() => {
    if (!open && !userMenuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (confirmingLogout) { setConfirmingLogout(false); return }
      if (userMenuOpen) { closeUserMenu(); avatarRef.current?.focus(); return }
      closePanel()
      toggleRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, userMenuOpen, confirmingLogout])

  // Tapping anywhere else dismisses them, the way a disclosure is expected to
  // behave. Each trigger is excluded so its own click is not handled twice.
  useEffect(() => {
    if (!open && !userMenuOpen) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (userMenuOpen && !userMenuRef.current?.contains(target)) closeUserMenu()
      if (open && !panelRef.current?.contains(target) && !toggleRef.current?.contains(target)) {
        closePanel()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, userMenuOpen])

  const logoutConfirm = (
    <div className="nav-confirm">
      <p className="nav-confirm__question">¿Querés cerrar sesión?</p>
      <div className="nav-confirm__actions">
        <form action={signOut} className="flex-1">
          <button type="submit" className="nav-confirm__yes">Sí, cerrar</button>
        </form>
        <button
          type="button"
          className="nav-confirm__no"
          onClick={() => setConfirmingLogout(false)}
        >
          No
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Derecha: buscar + menú de cuenta (desktop) + hamburger (mobile) */}
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
          <div className="nav-user hidden md:block" ref={userMenuRef}>
            <button
              ref={avatarRef}
              type="button"
              className="nav-user__trigger"
              aria-expanded={userMenuOpen}
              aria-controls="nav-user-menu"
              onClick={() => (userMenuOpen ? closeUserMenu() : setUserMenuOpen(true))}
            >
              <img src={resolvedSrc} alt="" className="nav-avatar" />
              <span className="sr-only">Mi cuenta</span>
            </button>

            {userMenuOpen && (
              <div className="nav-user__menu" id="nav-user-menu">
                <p className="nav-user__email">{email}</p>
                <Link href="/perfil" className="nav-user__item" onClick={closeUserMenu}>
                  Ver perfil
                </Link>
                {confirmingLogout ? logoutConfirm : (
                  <button
                    type="button"
                    className="nav-user__item"
                    onClick={() => setConfirmingLogout(true)}
                  >
                    Cerrar sesión
                  </button>
                )}
              </div>
            )}
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
          onClick={() => (open ? closePanel() : setOpen(true))}
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
                onClick={closePanel}
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
                onClick={closePanel}
                className="nav-link nav-link--mod"
                aria-current={isCurrent('/mod') ? 'page' : undefined}
              >
                Moderación
              </Link>
            </li>
          )}

          {/* Mobile: el panel ya es el menú, así que perfil y cerrar sesión
              van en la lista en vez de anidar otro desplegable. */}
          {email && (
            <li className="md:hidden border-t border-[var(--color-border)] mt-2 pt-2 flex flex-col gap-1">
              <Link
                href="/perfil"
                onClick={closePanel}
                className="nav-link"
                aria-current={isCurrent('/perfil') ? 'page' : undefined}
              >
                <img src={resolvedSrc} alt="" className="w-6 h-6 rounded-full mr-2 bg-[var(--color-surface)]" />
                Ver perfil
              </Link>
              <span className="nav-email px-3 py-1">{email}</span>
              {confirmingLogout ? logoutConfirm : (
                <button
                  type="button"
                  className="nav-logout w-full"
                  onClick={() => setConfirmingLogout(true)}
                >
                  Cerrar sesión
                </button>
              )}
            </li>
          )}
          {!email && (
            <li className="md:hidden border-t border-[var(--color-border)] mt-2 pt-2">
              <Link
                href="/login"
                onClick={closePanel}
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
