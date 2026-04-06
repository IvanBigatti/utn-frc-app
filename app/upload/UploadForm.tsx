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
    setUploading(true); setError(''); setProgress(30)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('nombre', nombre.trim())
    formData.append('tipo', tipo)
    formData.append('materia_id', String(materiaId))
    formData.append('ingenieria_id', String(carreraId))
    if (descripcion.trim()) formData.append('descripcion', descripcion.trim())
    setProgress(60)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Error al subir el archivo'); setUploading(false); setProgress(0); return }
      setProgress(100); setSuccess(true)
      setTimeout(() => router.push(`/resultados?materia_id=${materiaId}`), 1500)
    } catch {
      setError('Error de conexión. Intentá de nuevo.'); setUploading(false); setProgress(0)
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

      {/* Carrera */}
      <div className="upload-field">
        <label>Carrera</label>
        <div className="tag-group">
          {ingenierias.map(i => (
            <button key={i.id} type="button"
              className={`upload-tag ${carreraId === i.id ? 'active' : ''}`}
              onClick={() => { setCarreraId(carreraId === i.id ? null : i.id); setAnio(null); setMateriaId(null) }}>
              {i.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Año */}
      {carreraId && (
        <div className="upload-field">
          <label>Año</label>
          <div className="tag-group">
            {[1,2,3,4,5].map(a => (
              <button key={a} type="button"
                className={`upload-tag ${anio === a ? 'active' : ''}`}
                onClick={() => { setAnio(anio === a ? null : a); setMateriaId(null) }}>
                {a}° Año
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Materia */}
      {carreraId && anio && (
        <div className="upload-field">
          <label>Materia</label>
          {loadingMaterias ? <p className="upload-loading">Cargando materias...</p> : (
            <div className="tag-group">
              {materias.map(m => (
                <button key={m.id} type="button"
                  className={`upload-tag ${materiaId === m.id ? 'active' : ''}`}
                  onClick={() => setMateriaId(materiaId === m.id ? null : m.id)}>
                  {m.nombre}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tipo */}
      <div className="upload-field">
        <label>Tipo de material</label>
        <div className="tag-group">
          {TIPOS.map(t => (
            <button key={t.value} type="button"
              className={`upload-tag ${tipo === t.value ? 'active' : ''}`}
              onClick={() => setTipo(t.value)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Nombre */}
      <div className="upload-field">
        <label>Nombre del archivo</label>
        <input
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
        <label>Descripción <span className="upload-optional">(opcional)</span></label>
        <textarea
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          placeholder="Ej: Incluye resolución, temas: integrales, series..."
          rows={3}
          className="upload-textarea"
        />
      </div>

      {/* Archivo */}
      <div className="upload-field">
        <label>Archivo</label>
        <label className="upload-dropzone">
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            className="upload-file-input"
            required
          />
          <div className="upload-dropzone__content">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
        <div className="upload-progress">
          <div className="upload-progress__bar" style={{ width: `${progress}%` }} />
        </div>
      )}

      {error && <p className="upload-error">{error}</p>}

      <button
        type="submit"
        disabled={uploading || !file || !materiaId || !nombre.trim()}
        className="upload-submit"
      >
        {uploading ? 'Subiendo...' : 'Subir material'}
      </button>

    </form>
  )
}