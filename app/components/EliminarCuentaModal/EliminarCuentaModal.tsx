'use client'

import { useEffect, useRef, useState } from 'react'
import { eliminarCuenta } from '@/app/actions/auth'
import './EliminarCuentaModal.css'

type Props = {
  isOpen: boolean
  onClose: () => void
}

export default function EliminarCuentaModal({ isOpen, onClose }: Props) {
  const [confirmText, setConfirmText] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setConfirmText('')
      setError('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab' || !modalRef.current) return
      const focusable = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled])'
        )
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    if (isOpen) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleEliminar = async () => {
    if (confirmText !== 'ELIMINAR') return
    setPending(true)
    setError('')
    const result = await eliminarCuenta()
    if (result?.error) {
      setError(result.error)
      setPending(false)
    }
  }

  return (
    <>
      <div className="ecm-overlay" onClick={onClose} aria-hidden="true" />
      <div
        ref={modalRef}
        className="ecm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ecm-title"
      >
        <div className="ecm-icon" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </div>

        <h2 id="ecm-title" className="ecm-title">Eliminar cuenta</h2>
        <p className="ecm-body">
          Esta acción es <strong>permanente e irreversible</strong>. Se eliminarán todos tus datos:
          publicaciones, comentarios, archivos, progreso y perfil.
        </p>

        <div className="ecm-confirm-field">
          <label htmlFor="ecm-confirm" className="ecm-label">
            Escribí <strong>ELIMINAR</strong> para confirmar
          </label>
          <input
            ref={inputRef}
            id="ecm-confirm"
            type="text"
            className="ecm-input"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="ELIMINAR"
            disabled={pending}
            autoComplete="off"
          />
        </div>

        {error && <p className="ecm-error">{error}</p>}

        <div className="ecm-actions">
          <button className="ecm-btn ecm-btn--cancel" onClick={onClose} disabled={pending}>
            Cancelar
          </button>
          <button
            className="ecm-btn ecm-btn--delete"
            onClick={handleEliminar}
            disabled={confirmText !== 'ELIMINAR' || pending}
          >
            {pending ? 'Eliminando...' : 'Eliminar cuenta'}
          </button>
        </div>
      </div>
    </>
  )
}
