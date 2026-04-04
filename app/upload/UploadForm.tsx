'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Ingenieria = { id: number; nombre: string }
type Materia = { id: number; nombre: string }

const TIPOS = [
  { value: 'resumen', label: 'Resumen' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'tp', label: 'TP' },
]

export default function UploadForm() {
  const router = useRouter()
  const supabase = createClient()

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
    setProgress(30)

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

      if (!res.ok) {
        setError(json.error || 'Error al subir el archivo')
        setUploading(false)
        setProgress(0)
        return
      }

      setProgress(100)
      setSuccess(true)
      setTimeout(() => router.push(`/resultados?materia_id=${materiaId}`), 1500)
    } catch {
      setError('Error de conexión. Intentá de nuevo.')
      setUploading(false)
      setProgress(0)
    }
  }

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-4">✓</div>
        <p className="text-lg font-medium text-green-600 dark:text-green-400">¡Material subido correctamente!</p>
        <p className="text-sm text-gray-500 mt-1">Redirigiendo a los resultados...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Carrera */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Carrera</label>
        <select
          value={carreraId ?? ''}
          onChange={e => { setCarreraId(Number(e.target.value) || null); setAnio(null); setMateriaId(null) }}
          className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          required
        >
          <option value="">Seleccioná una carrera</option>
          {ingenierias.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
        </select>
      </div>

      {/* Año */}
      {carreraId && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Año</label>
          <select
            value={anio ?? ''}
            onChange={e => { setAnio(Number(e.target.value) || null); setMateriaId(null) }}
            className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            required
          >
            <option value="">Seleccioná el año</option>
            {[1,2,3,4,5].map(a => <option key={a} value={a}>{a}° Año</option>)}
          </select>
        </div>
      )}

      {/* Materia */}
      {carreraId && anio && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Materia</label>
          <select
            value={materiaId ?? ''}
            onChange={e => setMateriaId(Number(e.target.value) || null)}
            disabled={loadingMaterias}
            className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
            required
          >
            <option value="">{loadingMaterias ? 'Cargando...' : 'Seleccioná una materia'}</option>
            {materias.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </div>
      )}

      {/* Tipo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de material</label>
        <div className="flex gap-2">
          {TIPOS.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTipo(t.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                tipo === t.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Nombre */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre del archivo</label>
        <input
          type="text"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          placeholder="Ej: Parcial 1 2024 — Análisis Matemático"
          className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
          required
        />
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Descripción <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <textarea
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          placeholder="Ej: Incluye resolución, temas: integrales, series..."
          rows={3}
          className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 resize-none"
        />
      </div>

      {/* Archivo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Archivo</label>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900 dark:file:text-blue-300 hover:file:bg-blue-100"
          required
        />
        <p className="text-xs text-gray-400 mt-1">PDF, JPG o PNG — máx. 20 MB</p>
      </div>

      {/* Progress bar */}
      {uploading && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={uploading || !file || !materiaId || !nombre.trim()}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
      >
        {uploading ? 'Subiendo...' : 'Subir material'}
      </button>
    </form>
  )
}
