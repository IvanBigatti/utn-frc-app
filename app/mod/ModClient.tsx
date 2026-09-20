'use client'

import { useState } from 'react'
import Link from 'next/link'
import { eliminarPostMod, eliminarComentarioMod, banearUsuario, buscarUsuarios } from '@/app/actions/moderador'
import './mod.css'

type ReportedPost = {
  postId: number
  titulo: string
  contenido: string
  auth_user_id: string
  anonimo: boolean
  created_at: string
  reportCount: number
}

type ReportedComment = {
  commentId: number
  contenido: string
  post_id: number
  auth_user_id: string
  anonimo: boolean
  created_at: string
  reportCount: number
}

export type ModData = {
  reportedPosts: ReportedPost[]
  reportedComments: ReportedComment[]
  authorMap: Record<string, string>
}

export default function ModClient({ data }: { data: ModData }) {

  // Llegan resueltos en el HTML. Antes eran cinco tandas encadenadas desde el
  // navegador — sesión, chequeo de moderador, tablas de reportes, resúmenes,
  // nombres — a ~200ms cada una desde Argentina. Siguen siendo estado porque
  // la pantalla los saca de la lista al eliminar o banear.
  const [reportedPosts, setReportedPosts] = useState<ReportedPost[]>(data.reportedPosts)
  const [reportedComments, setReportedComments] = useState<ReportedComment[]>(data.reportedComments)
  const authorMap = data.authorMap
  const [banForms, setBanForms] = useState<Record<string, string>>({})

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ id: string; email: string }[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchBanForms, setSearchBanForms] = useState<Record<string, string>>({})
  const [searchDone, setSearchDone] = useState(false)

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleEliminarPost = async (postId: number) => {
    const result = await eliminarPostMod(postId)
    if (result.error) { showToast(result.error); return }
    setReportedPosts(prev => prev.filter(p => p.postId !== postId))
    showToast('Post eliminado.', 'success')
  }

  const handleEliminarComment = async (commentId: number) => {
    const result = await eliminarComentarioMod(commentId)
    if (result.error) { showToast(result.error); return }
    setReportedComments(prev => prev.filter(c => c.commentId !== commentId))
    showToast('Comentario eliminado.', 'success')
  }

  const handleBanearDeReporte = async (uid: string) => {
    const reason = banForms[uid] ?? ''
    const result = await banearUsuario(uid, reason)
    if (result.error) { showToast(result.error); return }
    setBanForms(prev => { const n = { ...prev }; delete n[uid]; return n })
    setReportedPosts(prev => prev.filter(p => p.auth_user_id !== uid))
    setReportedComments(prev => prev.filter(c => c.auth_user_id !== uid))
    showToast('Usuario baneado.', 'success')
  }

  const handleBanearDeSearch = async (uid: string) => {
    const reason = searchBanForms[uid] ?? ''
    const result = await banearUsuario(uid, reason)
    if (result.error) { showToast(result.error); return }
    setSearchBanForms(prev => { const n = { ...prev }; delete n[uid]; return n })
    setSearchResults(prev => prev.filter(u => u.id !== uid))
    showToast('Usuario baneado.', 'success')
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    setSearchDone(false)
    const results = await buscarUsuarios(searchQuery)
    setSearchResults(results)
    setSearchLoading(false)
    setSearchDone(true)
  }

  const totalReportes = reportedPosts.length + reportedComments.length

  return (
    <div className="mod-page">
      <div className="mod-inner">
        <h1 className="mod-title">Panel de moderación</h1>

        {/* Resumen */}
        <div className="mod-summary">
          <div className="mod-summary__card">
            <span className="mod-summary__num">{reportedPosts.length}</span>
            <span className="mod-summary__label">Posts reportados</span>
          </div>
          <div className="mod-summary__card">
            <span className="mod-summary__num">{reportedComments.length}</span>
            <span className="mod-summary__label">Comentarios reportados</span>
          </div>
        </div>

        {totalReportes === 0 && (
          <p className="mod-empty mod-empty--hero">No hay contenido reportado actualmente.</p>
        )}

        {/* Posts reportados */}
        {reportedPosts.length > 0 && (
          <section className="mod-section">
            <h2 className="mod-section__title">Posts reportados</h2>
            {reportedPosts.map(post => (
              <div key={post.postId} className="mod-card">
                <div className="mod-card__header">
                  <span className="mod-card__author">
                    {post.anonimo ? 'Anónimo' : (authorMap[post.auth_user_id] ?? 'usuario')}
                  </span>
                  <span className="mod-card__date">
                    {new Date(post.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className={`mod-card__reports ${post.reportCount >= 2 ? 'mod-card__reports--high' : 'mod-card__reports--low'}`}>
                    {post.reportCount}/3 reportes
                  </span>
                  <Link href={`/foro/${post.postId}`} className="mod-card__view-link" target="_blank">
                    Ver →
                  </Link>
                </div>
                <p className="mod-card__titulo">{post.titulo}</p>
                <p className="mod-card__content">
                  {post.contenido.length > 200 ? post.contenido.slice(0, 200) + '…' : post.contenido}
                </p>
                <div className="mod-card__actions">
                  <button className="mod-btn mod-btn--delete" onClick={() => handleEliminarPost(post.postId)}>
                    Eliminar post
                  </button>
                  {!post.anonimo && (
                    banForms[post.auth_user_id] !== undefined ? (
                      <span className="mod-ban-inline">
                        <input
                          type="text"
                          className="mod-ban-input"
                          placeholder="Motivo (opcional)"
                          value={banForms[post.auth_user_id]}
                          onChange={(e) => setBanForms(prev => ({ ...prev, [post.auth_user_id]: e.target.value }))}
                          autoFocus
                        />
                        <button className="mod-btn mod-btn--ban-confirm" onClick={() => handleBanearDeReporte(post.auth_user_id)}>
                          Confirmar
                        </button>
                        <button className="mod-btn mod-btn--cancel" onClick={() => setBanForms(prev => { const n = { ...prev }; delete n[post.auth_user_id]; return n })}>
                          Cancelar
                        </button>
                      </span>
                    ) : (
                      <button className="mod-btn mod-btn--ban" onClick={() => setBanForms(prev => ({ ...prev, [post.auth_user_id]: '' }))}>
                        Banear autor
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Comentarios reportados */}
        {reportedComments.length > 0 && (
          <section className="mod-section">
            <h2 className="mod-section__title">Comentarios reportados</h2>
            {reportedComments.map(comment => (
              <div key={comment.commentId} className="mod-card">
                <div className="mod-card__header">
                  <span className="mod-card__author">
                    {comment.anonimo ? 'Anónimo' : (authorMap[comment.auth_user_id] ?? 'usuario')}
                  </span>
                  <span className="mod-card__date">
                    {new Date(comment.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  <span className={`mod-card__reports ${comment.reportCount >= 2 ? 'mod-card__reports--high' : 'mod-card__reports--low'}`}>
                    {comment.reportCount}/3 reportes
                  </span>
                  <Link href={`/foro/${comment.post_id}`} className="mod-card__view-link" target="_blank">
                    Ver post →
                  </Link>
                </div>
                <p className="mod-card__content">
                  {comment.contenido.length > 200 ? comment.contenido.slice(0, 200) + '…' : comment.contenido}
                </p>
                <div className="mod-card__actions">
                  <button className="mod-btn mod-btn--delete" onClick={() => handleEliminarComment(comment.commentId)}>
                    Eliminar comentario
                  </button>
                  {!comment.anonimo && (
                    banForms[comment.auth_user_id] !== undefined ? (
                      <span className="mod-ban-inline">
                        <input
                          type="text"
                          className="mod-ban-input"
                          placeholder="Motivo (opcional)"
                          value={banForms[comment.auth_user_id]}
                          onChange={(e) => setBanForms(prev => ({ ...prev, [comment.auth_user_id]: e.target.value }))}
                          autoFocus
                        />
                        <button className="mod-btn mod-btn--ban-confirm" onClick={() => handleBanearDeReporte(comment.auth_user_id)}>
                          Confirmar
                        </button>
                        <button className="mod-btn mod-btn--cancel" onClick={() => setBanForms(prev => { const n = { ...prev }; delete n[comment.auth_user_id]; return n })}>
                          Cancelar
                        </button>
                      </span>
                    ) : (
                      <button className="mod-btn mod-btn--ban" onClick={() => setBanForms(prev => ({ ...prev, [comment.auth_user_id]: '' }))}>
                        Banear autor
                      </button>
                    )
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Buscar usuario */}
        <section className="mod-section">
          <h2 className="mod-section__title">Buscar usuario</h2>
          <div className="mod-search">
            <input
              type="text"
              className="mod-search__input"
              placeholder="Escribí el email o parte del email..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSearchDone(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
            />
            <button className="mod-search__btn" onClick={handleSearch} disabled={searchLoading || !searchQuery.trim()}>
              {searchLoading ? '…' : 'Buscar'}
            </button>
          </div>
          {searchDone && searchResults.length === 0 && (
            <p className="mod-empty">No se encontraron usuarios.</p>
          )}
          {searchResults.length > 0 && (
            <div className="mod-user-list">
              {searchResults.map(u => (
                <div key={u.id} className="mod-user-row">
                  <div className="mod-user-row__info">
                    <span className="mod-user-row__name">{u.email.split('@')[0]}</span>
                    <span className="mod-user-row__email">{u.email}</span>
                  </div>
                  <div className="mod-user-row__actions">
                    <Link href={`/perfil?uid=${u.id}`} className="mod-btn mod-btn--view">
                      Ver perfil
                    </Link>
                    {searchBanForms[u.id] !== undefined ? (
                      <span className="mod-ban-inline">
                        <input
                          type="text"
                          className="mod-ban-input"
                          placeholder="Motivo (opcional)"
                          value={searchBanForms[u.id]}
                          onChange={(e) => setSearchBanForms(prev => ({ ...prev, [u.id]: e.target.value }))}
                          autoFocus
                        />
                        <button className="mod-btn mod-btn--ban-confirm" onClick={() => handleBanearDeSearch(u.id)}>
                          Confirmar
                        </button>
                        <button className="mod-btn mod-btn--cancel" onClick={() => setSearchBanForms(prev => { const n = { ...prev }; delete n[u.id]; return n })}>
                          Cancelar
                        </button>
                      </span>
                    ) : (
                      <button className="mod-btn mod-btn--ban" onClick={() => setSearchBanForms(prev => ({ ...prev, [u.id]: '' }))}>
                        Banear
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {toast && (
        <div className={`foro-toast foro-toast--${toast.type}`} role="alert" aria-live="assertive">
          {toast.msg}
        </div>
      )}
    </div>
  )
}
