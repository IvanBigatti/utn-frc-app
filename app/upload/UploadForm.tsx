'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import './uploadForm.css'

type Ingenieria = { id: number; nombre: string }
type Materia = { id: number; nombre: string }

const TIPOS = [
  { value: 'resumen', label: 'Resumen' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'tp', label: 'TP' },
]

/* Mirrors the limits enforced in app/api/upload/initiate/route.ts.
   Checking here too turns a failed round trip into instant feedback. */
const MAX_SIZE_MB = 20
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024
const ACCEPTED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png']

const REDIRECT_DELAY_MS = 2500

function describeFileProblem(f: File): string | null {
  const dot = f.name.lastIndexOf('.')
  const ext = dot === -1 ? '' : f.name.slice(dot).toLowerCase()
  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    return 'Ese formato no va. Subí un PDF, JPG o PNG.'
  }
  if (f.size > MAX_SIZE_BYTES) {
    const mb = (f.size / 1024 / 1024).toFixed(1)
    return `El archivo pesa ${mb} MB y el máximo son ${MAX_SIZE_MB} MB.`
  }
  return null
}

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
  const [materiasError, setMateriasError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [fileError, setFileError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [success, setSuccess] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const nombreInputRef = useRef<HTMLInputElement>(null)
  const materiaGroupRef = useRef<HTMLFieldSetElement>(null)
  const successRef = useRef<HTMLDivElement>(null)
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (redirectTimer.current) clearTimeout(redirectTimer.current)
  }, [])

  // Move focus to the confirmation so the form isn't yanked out from under
  // keyboard and screen reader users mid-flow.
  useEffect(() => {
    if (success) successRef.current?.focus()
  }, [success])

  useEffect(() => {
    supabase.from('ingenieria').select('id, nombre').order('nombre')
      .then(({ data }) => { if (data) setIngenierias(data) })
  }, [])

  useEffect(() => {
    if (!carreraId || !anio) { setMaterias([]); setLoadingMaterias(false); return }
    setLoadingMaterias(true)
    setMateriasError('')

    // Tapping through the cascade quickly fires overlapping queries. Without
    // this guard a slower earlier response can land last and paint the wrong
    // subjects for the selected year.
    let cancelled = false
    const settle = (result: Materia[]) => {
      if (cancelled) return
      setMaterias(result)
      setLoadingMaterias(false)
    }

    const run = async () => {
      try {
        const { data: comisiones } = await supabase
          .from('comision').select('id')
          .eq('ingenieria_id', carreraId).eq('año', anio)
        if (cancelled) return
        if (!comisiones?.length) { settle([]); return }
        const ids = comisiones.map(c => c.id)
        const { data: relaciones } = await supabase
          .from('ComisionMaterias').select('materia(id, nombre)').in('idComision', ids)
        if (cancelled) return
        if (!relaciones) { settle([]); return }
        const todas = relaciones.map((r: any) => r.materia).filter(Boolean)
        const unicas = Array.from(new Map(todas.map((m: Materia) => [m.id, m])).values()) as Materia[]
        settle(unicas.sort((a, b) => a.nombre.localeCompare(b.nombre)))
      } catch {
        // A rejected query (network down, not a query error) would otherwise
        // leave loadingMaterias stuck true and the spinner up forever.
        if (cancelled) return
        setMateriasError('No pudimos cargar las materias. Revisá tu conexión y probá de nuevo.')
        settle([])
      }
    }
    run()

    return () => { cancelled = true }
  }, [carreraId, anio])

  const selectFile = (candidate: File | null) => {
    if (!candidate) { setFile(null); setFileError(''); return }
    const problem = describeFileProblem(candidate)
    if (problem) {
      setFileError(problem)
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setFileError('')
    setFile(candidate)
  }

  const clearFile = () => {
    setFile(null)
    setFileError('')
    // Reset the control too, otherwise re-picking the same file fires no change event.
    if (fileInputRef.current) fileInputRef.current.value = ''
    fileInputRef.current?.focus()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (uploading) return
    selectFile(e.dataTransfer.files?.[0] ?? null)
  }

  const missing = [
    !materiaId && 'seleccioná una materia',
    !nombre.trim() && 'escribí un nombre',
    !file && 'adjuntá un archivo',
  ].filter(Boolean) as string[]

  const incomplete = missing.length > 0

  // Routed through the permanently mounted live region below instead of
  // relying on role="status" appearing on a node that mounts with its text.
  let materiasStatus = ''
  if (carreraId && anio) {
    if (loadingMaterias) materiasStatus = 'Cargando materias...'
    else if (materiasError) materiasStatus = materiasError
    else if (materias.length === 0) materiasStatus = `No hay materias cargadas para ${anio}° año de esta carrera.`
    else materiasStatus = `${materias.length} materias disponibles.`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (uploading) return
    // The button stays focusable while incomplete (aria-disabled, not disabled),
    // so a click here is a real question: send the student to what's missing.
    if (incomplete) {
      if (!materiaId) {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        materiaGroupRef.current?.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
      } else if (!nombre.trim()) nombreInputRef.current?.focus()
      else fileInputRef.current?.focus()
      return
    }
    if (!file || !materiaId) return
    setUploading(true)
    setError('')
    setProgress(10)

    // Paso 1: obtener signed URL de Supabase Storage
    let signedUrl: string
    let filePath: string
    let mimeType: string
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
      signedUrl = json.signedUrl
      filePath = json.filePath
      mimeType = json.mimeType
      setProgress(25)
    } catch {
      setError('Error de conexión. Intentá de nuevo.'); setUploading(false); setProgress(0); return
    }

    // Paso 2: subir archivo directo a Supabase Storage (bypass Vercel)
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgress(25 + Math.round((event.loaded / event.total) * 60))
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Error al subir el archivo: ${xhr.status}`))
        }
        xhr.onerror = () => reject(new Error('Error de red al subir el archivo'))
        xhr.ontimeout = () => reject(new Error('Tiempo de espera agotado'))
        xhr.open('PUT', signedUrl)
        xhr.setRequestHeader('Content-Type', mimeType)
        xhr.send(file)
      })
      setProgress(85)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir el archivo')
      setUploading(false); setProgress(0); return
    }

    // Paso 3: el servidor descarga de Supabase, sube a Drive y guarda en DB
    try {
      const res = await fetch('/api/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath,
          mimeType,
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
      redirectTimer.current = setTimeout(
        () => router.push(`/resultados?materia_id=${materiaId}`),
        REDIRECT_DELAY_MS,
      )
    } catch {
      setError('Error de conexión al guardar. El archivo puede haberse subido.')
      setUploading(false); setProgress(0)
    }
  }

  if (success) {
    return (
      // Focused on mount, which is what announces it. role="status" on the same
      // node would add a live-region announcement on insertion and make some
      // screen readers read the confirmation twice.
      <div
        className="upload-success"
        ref={successRef}
        tabIndex={-1}
        aria-labelledby="upload-success-title"
        aria-describedby="upload-success-sub"
      >
        <div className="upload-success__icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="upload-success__title" id="upload-success-title">Material subido correctamente</p>
        <p className="upload-success__sub" id="upload-success-sub">Te llevamos a los resultados en un segundo.</p>
        {/* An explicit way out, so nobody has to sit and wait for the timer. */}
        <Link href={`/resultados?materia_id=${materiaId}`} className="btn-ghost upload-success__link">
          Ver el material ahora
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="upload-form" noValidate>

      {/* The single polite channel for this form: upload progress and the
          state of the materia cascade. Permanently mounted, because a live
          region inserted together with its text is announced unreliably.
          Errors are deliberately absent — they carry their own role="alert". */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {uploading ? 'Subiendo archivo, aguardá...' : materiasStatus}
      </div>

      {/* Carrera */}
      <fieldset className="upload-field upload-fieldset">
        <legend className="upload-legend">Carrera</legend>
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
        <fieldset className="upload-field upload-fieldset">
          <legend className="upload-legend">Año</legend>
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
        <fieldset className="upload-field upload-fieldset" ref={materiaGroupRef}>
          <legend className="upload-legend">Materia</legend>
          {/* No role="status" on these: they mount together with their text,
              which announces unreliably. The sr-only live region at the top of
              the form carries the spoken version. */}
          {loadingMaterias && <p className="upload-loading">Cargando materias...</p>}
          {!loadingMaterias && materiasError && (
            <p className="upload-empty">{materiasError}</p>
          )}
          {/* Not every carrera/año pair has subjects loaded. Saying so beats
              rendering an empty row and leaving the student stuck. */}
          {!loadingMaterias && !materiasError && materias.length === 0 && (
            <p className="upload-empty">
              No hay materias cargadas para {anio}° año de esta carrera. Probá con otro año, o
              escribinos si creés que falta alguna.
            </p>
          )}
          {!loadingMaterias && materias.length > 0 && (
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
      <fieldset className="upload-field upload-fieldset">
        <legend className="upload-legend">Tipo de material</legend>
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
          ref={nombreInputRef}
          type="text"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          placeholder="Ej: Parcial 1 2024 — Análisis Matemático"
          className="upload-input"
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
        <label
          className={`upload-dropzone ${dragging ? 'is-dragging' : ''}`}
          htmlFor="upload-file"
          onDragOver={e => { e.preventDefault(); if (!uploading) setDragging(true) }}
          // dragleave also fires when crossing into a child, which would flicker
          // the highlight. Only clear it when the pointer truly leaves.
          onDragLeave={e => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
          }}
          onDrop={handleDrop}
        >
          <input
            id="upload-file"
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS.join(',')}
            onChange={e => selectFile(e.target.files?.[0] ?? null)}
            className="upload-file-input"
            aria-describedby="upload-file-spec"
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
              <span>
                Arrastrá un archivo o hacé clic para elegirlo{' '}
                <span className="upload-dropzone__spec" id="upload-file-spec">
                  PDF, JPG o PNG — máx. {MAX_SIZE_MB} MB
                </span>
              </span>
            )}
          </div>
        </label>

        {/* Outside the label on purpose: inside it, every click would reopen
            the file picker instead of clearing the selection. */}
        {file && !uploading && (
          <button type="button" className="upload-file-clear" onClick={clearFile}>
            Quitar {file.name}
          </button>
        )}

        {fileError && <p className="upload-error" role="alert">{fileError}</p>}
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

      {/* aria-disabled instead of disabled: a disabled button can't take focus,
          so a screen reader user would never reach the hint explaining why. */}
      <button
        type="submit"
        aria-disabled={uploading || incomplete}
        aria-describedby="upload-hint"
        className="btn-primary upload-submit"
      >
        {uploading ? 'Subiendo...' : 'Subir material'}
      </button>

      {/* Always mounted. A live region added to the DOM at the same time as its
          text is unreliable: assistive tech needs it present beforehand. */}
      <p className="upload-hint" id="upload-hint" aria-live="polite">
        {!uploading && incomplete ? `Falta: ${missing.join(' · ')}` : ''}
      </p>

    </form>
  )
}