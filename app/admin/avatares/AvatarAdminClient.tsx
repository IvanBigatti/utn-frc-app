'use client'

import { useState, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import { agregarAvatar, eliminarAvatar } from './actions'
import type { AvatarConfig, UnlockConditionType } from '@/app/components/avatars'

const CONDITION_LABELS: Record<UnlockConditionType, string> = {
  upload_files: 'Subir archivos',
  rate_files: 'Puntuar archivos',
  upvote_posts: 'Dar upvotes en el foro',
  post_forum: 'Publicar en el foro',
}

export default function AvatarAdminClient({ avatars }: { avatars: AvatarConfig[] }) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isFree, setIsFree] = useState(true)
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) { setPreviewSrc(null); setFileName(null); return }
    setPreviewSrc(URL.createObjectURL(file))
    setFileName(file.name)
  }

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const form = e.currentTarget
    const formData = new FormData(form)
    const key = (formData.get('key') as string).trim().toLowerCase().replace(/\s+/g, '_')
    const file = fileInputRef.current?.files?.[0]

    if (!file) { setError('Seleccioná una imagen.'); return }

    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${key}-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: false })

      if (uploadError) {
        setError('Error al subir la imagen: ' + uploadError.message)
        return
      }

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      formData.set('src', publicUrl)
      formData.set('is_free', isFree ? 'true' : 'false')

      startTransition(async () => {
        const res = await agregarAvatar(formData)
        if (res.error) {
          // Revertir upload si falla el guardado en DB
          await supabase.storage.from('avatars').remove([path])
          setError(res.error)
        } else {
          setSuccess('Avatar agregado correctamente.')
          form.reset()
          setPreviewSrc(null)
          setFileName(null)
          setIsFree(true)
          router.refresh()
        }
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (av: AvatarConfig) => {
    setError(null)
    // Extraer path del archivo desde la URL pública de Storage
    // Solo intentar borrar si la URL es de Supabase Storage
    const storagePath = av.src.includes('/storage/v1/object/public/avatars/')
      ? av.src.split('/storage/v1/object/public/avatars/')[1]
      : null

    startTransition(async () => {
      if (storagePath) {
        await supabase.storage.from('avatars').remove([storagePath])
      }
      const res = await eliminarAvatar(av.key)
      if (res.error) {
        setError(res.error)
      } else {
        setConfirmDelete(null)
        router.refresh()
      }
    })
  }

  const isLoading = isPending || uploading

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px 80px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Administrar avatares</h1>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 32 }}>Solo visible para moderadores.</p>

      {/* Lista de avatares existentes */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={sectionTitleStyle}>Avatares existentes</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {avatars.map((av) => (
            <div key={av.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10 }}>
              <img src={av.src} alt={av.name} style={{ width: 44, height: 44, borderRadius: '50%', background: '#f3f4f6', objectFit: 'cover', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {av.name}{' '}
                  <code style={{ fontSize: 11, color: '#9ca3af', background: '#f3f4f6', padding: '1px 5px', borderRadius: 4 }}>{av.key}</code>
                </div>
                <div style={{ fontSize: 12, color: av.is_free ? '#16a34a' : '#d97706', marginTop: 2 }}>
                  {av.is_free ? 'Libre' : `Bloqueado — ${av.unlock_condition?.description ?? ''}`}
                </div>
              </div>
              {confirmDelete === av.key ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleDelete(av)}
                    disabled={isLoading}
                    style={{ fontSize: 12, padding: '4px 10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    style={{ fontSize: 12, padding: '4px 10px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(av.key)}
                  style={{ fontSize: 12, padding: '4px 10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                >
                  Eliminar
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Formulario para agregar */}
      <section>
        <h2 style={sectionTitleStyle}>Agregar nuevo avatar</h2>
        <form onSubmit={handleAdd} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={labelStyle}>
              Key (único) *
              <input name="key" required placeholder="ej: dragon" style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Nombre *
              <input name="name" required placeholder="ej: Dragon" style={inputStyle} />
            </label>
          </div>

          {/* File upload */}
          <label style={labelStyle}>
            Imagen *
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed #d1d5db',
                borderRadius: 8,
                padding: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: '#fafafa',
                transition: 'border-color 0.15s',
              }}
            >
              {previewSrc ? (
                <img src={previewSrc} alt="preview" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', background: '#f3f4f6', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
              )}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  {fileName ?? 'Elegir imagen'}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                  JPG, PNG, WEBP, GIF, SVG — máx. 2 MB
                </div>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </label>

          <label style={{ ...labelStyle, flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>Libre (sin condición de desbloqueo)</span>
          </label>

          {!isFree && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 14, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
              <p style={{ fontSize: 12, color: '#92400e', margin: 0 }}>Configurá la misión para desbloquear este avatar:</p>
              <label style={labelStyle}>
                Tipo de misión *
                <select name="condition_type" required={!isFree} style={inputStyle}>
                  {(Object.entries(CONDITION_LABELS) as [UnlockConditionType, string][]).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <label style={labelStyle}>
                  Cantidad *
                  <input name="threshold" type="number" min={1} required={!isFree} placeholder="ej: 5" style={inputStyle} />
                </label>
                <label style={labelStyle}>
                  Descripción para el usuario *
                  <input name="description" required={!isFree} placeholder="ej: Subí 5 archivos al repositorio" style={inputStyle} />
                </label>
              </div>
            </div>
          )}

          {error && <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>{error}</p>}
          {success && <p style={{ fontSize: 13, color: '#16a34a', margin: 0 }}>{success}</p>}

          <button
            type="submit"
            disabled={isLoading}
            style={{ padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1, alignSelf: 'flex-start' }}
          >
            {uploading ? 'Subiendo imagen...' : isPending ? 'Guardando...' : 'Agregar avatar'}
          </button>
        </form>
      </section>
    </div>
  )
}

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  color: '#9ca3af',
  marginBottom: 12,
}

const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 13,
  fontWeight: 600,
  color: '#374151',
}

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 13,
  outline: 'none',
  background: '#fff',
}
