'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import './uploadForm.css'

type Ingenieria = { id: number; nombre: string }
type Materia = { id: number; nombre: string }

const TIPOS = [
  { value: 'resumen', label: 'Resumen' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'tp', label: 'TP' },
]

const supabase = createClient()

export default function UploadForm() {
  const router = useRouter()

  const [ingenierias, setIngenierias] = useState<Ingenieria[]>([])
  const [materias, setMaterias] = useState<Materia[]>([])
  const [carreraId, setCarreraId] = useState<number | null>(null)
  const [anio, setAnio] = useState<number | null>(null)
  const [materiaId, setMateriaId] = useState<number | null>(null)
  const [tipo, setTipo] = useState('resumen')
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loadingMaterias, setLoadingMaterias] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    supabase.from('ingenieria').select('id, nombre').order('nombre')
      .then(({ data }) => { if (data) setIngenierias(data) })
  }, [])

  useEffect(() => {
    if (!carreraId || !anio) { setMaterias([]); return }
    setLoadingMaterias(true)
    const fetch = async () => {
      const { data: comisiones } = await supabase
        .from('comision').select('id')
        .eq('ingenieria_id', carreraId).eq('año', anio)
      if (!comisiones?.length) { setMaterias([]); setLoadingMaterias(false); return }
      const ids = comisiones.map(c => c.id)
      const { data: relaciones } = await supabase
        .from('ComisionMaterias').select('materia(id, nombre)').in('idComision', ids)
      if (!relaciones) { setMaterias([]); setLoadingMaterias(false); return }
      const todas = relaciones.map((r: any) => r.materia).filter(Boolean)
      const unicas = Array.from(new Map(todas.map((m: Materia) => [m.id, m])).values()) as Materia[]
      setMaterias(unicas.sort((a, b) => a.nombre.localeCompare(b.nombre)))
      setLoadingMaterias(false)
    }
    fetch()
  }, [carreraId, anio])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !materiaId || !nombre.trim()) return
    setUploading(true)
    setError('')
    setProgress(10)

    // Paso 1: obtener session URI de Google Drive
    let sessionUri: string
    try {
      const res = await fetch('/api/upload/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          nombre: nombre.trim(),
          tipo,
          materia_id: String(materiaId),
          ingenieria_id: carreraId ? String(carreraId) : undefined,
          descripcion: descripcion.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Error al iniciar la subida'); setUploading(false); setProgress(0); return }
      sessionUri = json.sessionUri
      setProgress(25)
    } catch {
      setError('Error de conexión. Intentá de nuevo.'); setUploading(false); setProgress(0); return
    }

    // Paso 2: subir archivo directo a Google Drive (bypass Vercel)
    let fileId: string
    try {
      fileId = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgress(25 + Math.round((event.loaded / event.total) * 60))
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const data = JSON.parse(xhr.responseText)
              if (data.id) resolve(data.id)
              else reject(new Error('Google Drive no devolvió el ID del archivo'))
            } catch {
              reject(new Error('Respuesta inesperada de Google Drive'))
            }
          } else {
            reject(new Error(`Error al subir a Drive: ${xhr.status}`))
          }
        }
        xhr.onerror = () => reject(new Error('Error de red al subir el archivo'))
        xhr.ontimeout = () => reject(new Error('Tiempo de espera agotado'))
        xhr.open('PUT', sessionUri)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })
      setProgress(85)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir el archivo')
      setUploading(false); setProgress(0); return
    }

    // Paso 3: guardar metadata en Supabase
    try {
      const res = await fetch('/api/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          nombre: nombre.trim(),
          tipo,
          materia_id: String(materiaId),
          ingenieria_id: carreraId ? String(carreraId) : undefined,
          descripcion: descripcion.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Error al guardar el archivo'); setUploading(false); setProgress(0); return }
      setProgress(100); setSuccess(true)
      setTimeout(() => router.push(`/resultados?materia_id=${materiaId}`), 1500)
    } catch {
      setError('Error de conexión al guardar. El archivo puede haberse subido a Drive.')
      setUploading(false); setProgress(0)
    }
  }

  if (success) {
    return (
      <div className="upload-success">
        <div className="upload-success__icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="upload-success__title">Material subido correctamente</p>
        <p className="upload-success__sub">Redirigiendo a los resultados...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="upload-form">

      {/* Status announcements for screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {uploading ? 'Subiendo archivo, aguardá...' : ''}
        {error || ''}
      </div>

      {/* Carrera */}
      <fieldset className="upload-field" style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend className="upload-field" style={{ padding: 0, fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#000' }}>Carrera</legend>
        <div className="tag-group">
          {ingenierias.map(i => (
            <button key={i.id} type="button"
              className={`btn-chip ${carreraId === i.id ? 'active' : ''}`}
              aria-pressed={carreraId === i.id}
              onClick={() => { setCarreraId(carreraId === i.id ? null : i.id); setAnio(null); setMateriaId(null) }}>
              {i.nombre}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Año */}
      {carreraId && (
        <fieldset className="upload-field" style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#000', marginBottom: '14px' }}>Año</legend>
          <div className="tag-group">
            {[1,2,3,4,5].map(a => (
              <button key={a} type="button"
                className={`btn-chip ${anio === a ? 'active' : ''}`}
                aria-pressed={anio === a}
                onClick={() => { setAnio(anio === a ? null : a); setMateriaId(null) }}>
                {a}° Año
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {/* Materia */}
      {carreraId && anio && (
        <fieldset className="upload-field" style={{ border: 'none', padding: 0, margin: 0 }}>
          <legend style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#000', marginBottom: '14px' }}>Materia</legend>
          {loadingMaterias ? <p className="upload-loading" role="status">Cargando materias...</p> : (
            <div className="tag-group">
              {materias.map(m => (
                <button key={m.id} type="button"
                  className={`btn-chip ${materiaId === m.id ? 'active' : ''}`}
                  aria-pressed={materiaId === m.id}
                  onClick={() => setMateriaId(materiaId === m.id ? null : m.id)}>
                  {m.nombre}
                </button>
              ))}
            </div>
          )}
        </fieldset>
      )}

      {/* Tipo */}
      <fieldset className="upload-field" style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#000', marginBottom: '14px' }}>Tipo de material</legend>
        <div className="tag-group">
          {TIPOS.map(t => (
            <button key={t.value} type="button"
              className={`btn-chip ${tipo === t.value ? 'active' : ''}`}
              aria-pressed={tipo === t.value}
              onClick={() => setTipo(t.value)}>
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Nombre */}
      <div className="upload-field">
        <label htmlFor="upload-nombre">Nombre del archivo</label>
        <input
          id="upload-nombre"
          type="text"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          placeholder="Ej: Parcial 1 2024 — Análisis Matemático"
          className="upload-input"
          required
        />
      </div>

      {/* Descripción */}
      <div className="upload-field">
        <label htmlFor="upload-descripcion">Descripción <span className="upload-optional">(opcional)</span></label>
        <textarea
          id="upload-descripcion"
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          placeholder="Ej: Incluye resolución, temas: integrales, series..."
          rows={3}
          className="upload-textarea"
        />
      </div>

      {/* Archivo */}
      <div className="upload-field">
        <label htmlFor="upload-file">Archivo</label>
        <label className="upload-dropzone" htmlFor="upload-file">
          <input
            id="upload-file"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            className="upload-file-input"
            required
          />
          <div className="upload-dropzone__content">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {file ? (
              <span className="upload-dropzone__name">{file.name}</span>
            ) : (
              <span>Seleccioná un archivo <span className="upload-optional">PDF, JPG o PNG — máx. 20 MB</span></span>
            )}
          </div>
        </label>
      </div>

      {/* Progress */}
      {uploading && (
        <div className="upload-progress-wrapper">
          <div
            className="upload-progress"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso de subida"
          >
            <div className="upload-progress__bar" style={{ transform: `scaleX(${progress / 100})` }} />
          </div>
          <p className="upload-scanning-notice">
            Subiendo archivo, aguardá un momento...
          </p>
        </div>
      )}

      {error && <p className="upload-error" role="alert">{error}</p>}

      <button
        type="submit"
        disabled={uploading || !file || !materiaId || !nombre.trim()}
        className="btn-primary upload-submit"
      >
        {uploading ? 'Subiendo...' : 'Subir material'}
      </button>

      {!uploading && (!materiaId || !file || !nombre.trim()) && (
        <p className="upload-hint" aria-live="polite">
          {[
            !materiaId && 'seleccioná una materia',
            !nombre.trim() && 'escribí un nombre',
            !file && 'adjuntá un archivo',
          ].filter(Boolean).join(' · ')}
        </p>
      )}

    </form>
  )
}