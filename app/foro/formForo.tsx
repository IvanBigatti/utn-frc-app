"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";

type TipoPost = "Pregunta" | "Recurso" | "Debate" | "Aviso";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onPostCreado: () => void;
};

const supabase = createClient();
type Item = { id: number; nombre: string };
const TIPOS: TipoPost[] = ["Pregunta", "Recurso", "Debate", "Aviso"];

export default function NuevoPostPanel({ isOpen, onClose, onPostCreado }: Props) {

  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [tipo, setTipo] = useState<TipoPost | null>(null);
  const [anonimo, setAnonimo] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const [ingenierias, setIngenierias] = useState<Item[]>([]);
  const [materias, setMaterias] = useState<Item[]>([]);
  const [comisiones, setComisiones] = useState<Item[]>([]);

  const [carreraId, setCarreraId] = useState<number | null>(null);
  const [anio, setAnio] = useState<number | null>(null);
  const [materiaId, setMateriaId] = useState<number | null>(null);
  const [comisionId, setComisionId] = useState<number | null>(null);

  // Reset al cerrar
  useEffect(() => {
    if (!isOpen) {
      setTitulo(""); setContenido(""); setMostrarFiltros(false);
      setTipo(null); setAnonimo(false);
      setCarreraId(null); setAnio(null); setMateriaId(null); setComisionId(null);
      setError("");
    }
  }, [isOpen]);

  // Cargar ingenierías
  useEffect(() => {
    supabase.from("ingenieria").select("id, nombre").order("nombre")
      .then(({ data }) => { if (data) setIngenierias(data); });
  }, []);

  // Cargar materias
  useEffect(() => {
    if (!carreraId || !anio) { setMaterias([]); return; }
    const fetch = async () => {
      const { data: coms } = await supabase
        .from("comision").select("id")
        .eq("ingenieria_id", carreraId).eq("año", anio);

      if (!coms?.length) { setMaterias([]); return; }

      const { data: rels } = await supabase
        .from("ComisionMaterias").select("materia(id, nombre)")
        .in("idComision", coms.map((c) => c.id));

      const unicas = Array.from(
        new Map(
          rels?.map((r: any) => r.materia).filter(Boolean).map((m: Item) => [m.id, m])
        ).values()
      ) as Item[];

      setMaterias(unicas.sort((a, b) => a.nombre.localeCompare(b.nombre)));
    };
    fetch();
  }, [carreraId, anio]);

  // Cargar comisiones
  useEffect(() => {
    if (!carreraId || !anio) { setComisiones([]); return; }
    const fetch = async () => {
      let query = supabase.from("comision").select("id, nombre")
        .eq("ingenieria_id", carreraId).eq("año", anio);

      if (materiaId) {
        const { data: rels } = await supabase
          .from("ComisionMaterias").select("idComision")
          .eq("idMateria", materiaId);
        const ids = rels?.map((r) => r.idComision) ?? [];
        if (!ids.length) { setComisiones([]); return; }
        query = query.in("id", ids);
      }

      const { data } = await query;
      if (data) setComisiones(data);
    };
    fetch();
  }, [carreraId, anio, materiaId]);

  const handlePublicar = async () => {
    if (!titulo.trim()) { setError("El título es obligatorio."); return; }
    if (!contenido.trim()) { setError("El contenido es obligatorio."); return; }

    setEnviando(true);
    setError("");

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) { setError("Tenés que iniciar sesión para publicar."); setEnviando(false); return; }

    const { error: insertError } = await supabase.from("foro_post").insert({
      titulo: titulo.trim(),
      contenido: contenido.trim(),
      auth_user_id: user.id,
      tipo: tipo ?? null,
      anonimo,
      ingenieria_id: carreraId ?? null,
      anio: anio ?? null,
      comision_id: comisionId ?? null,
      materia_id: materiaId ?? null,
    });

    if (insertError) {
      setError("Hubo un error al publicar. Intentá de nuevo.");
      setEnviando(false);
      return;
    }

    onPostCreado();
    onClose();
    setEnviando(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="filtro-overlay" onClick={onClose} />
      <div className="filtro-panel">

        <div className="filtro-panel__header">
          <h3>Nueva publicación</h3>
          <button className="filtro-panel__close" onClick={onClose}>✕</button>
        </div>

        <div className="filtro-panel__body">

          {/* Tipo */}
          <div className="filtro-grupo">
            <label>Tipo <span className="filtro-opcional">(opcional)</span></label>
            <div className="tag-group">
              {TIPOS.map((t) => (
                <button
                  key={t}
                  className={`foro-tag ${tipo === t ? "active" : ""}`}
                  onClick={() => setTipo((prev) => (prev === t ? null : t))}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Título */}
          <div className="nuevo-post__field">
            <label>Título</label>
            <input
              type="text"
              placeholder="Ej: ¿Cómo es el parcial de Análisis?"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="nuevo-post__input"
              maxLength={120}
            />
            <span className="nuevo-post__counter">{titulo.length}/120</span>
          </div>

          {/* Contenido */}
          <div className="nuevo-post__field">
            <label>Contenido</label>
            <textarea
              placeholder="Contá tu experiencia, hacé una pregunta o compartí información útil..."
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              className="nuevo-post__textarea"
              rows={6}
            />
          </div>

          {/* Anónimo */}
          <label className="foro-anonimo-check">
            <input
              type="checkbox"
              checked={anonimo}
              onChange={(e) => setAnonimo(e.target.checked)}
            />
            Publicar de forma anónima
          </label>

          {/* Clasificación */}
          <button
            className={`nuevo-post__tag-btn ${mostrarFiltros ? "active" : ""}`}
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
            </svg>
            {mostrarFiltros ? "Ocultar clasificación" : "Clasificar publicación"}
            {(carreraId || materiaId || comisionId) && (
              <span className="foro-filtro-btn__badge" />
            )}
          </button>

          {mostrarFiltros && (
            <div className="nuevo-post__filtros">
              <div className="filtro-grupo">
                <label>Carrera <span className="filtro-opcional">(opcional)</span></label>
                <div className="tag-group">
                  {ingenierias.map((ing) => (
                    <button key={ing.id} className={`foro-tag ${carreraId === ing.id ? "active" : ""}`}
                      onClick={() => { setCarreraId(carreraId === ing.id ? null : ing.id); setAnio(null); setMateriaId(null); setComisionId(null); }}>
                      {ing.nombre}
                    </button>
                  ))}
                </div>
              </div>

              {carreraId && (
                <div className="filtro-grupo">
                  <label>Año <span className="filtro-opcional">(opcional)</span></label>
                  <div className="tag-group">
                    {[1, 2, 3, 4, 5].map((a) => (
                      <button key={a} className={`foro-tag ${anio === a ? "active" : ""}`}
                        onClick={() => { setAnio(anio === a ? null : a); setMateriaId(null); setComisionId(null); }}>
                        {a}° Año
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {carreraId && anio && materias.length > 0 && (
                <div className="filtro-grupo">
                  <label>Materia <span className="filtro-opcional">(opcional)</span></label>
                  <div className="tag-group">
                    {materias.map((mat) => (
                      <button key={mat.id} className={`foro-tag ${materiaId === mat.id ? "active" : ""}`}
                        onClick={() => { setMateriaId(materiaId === mat.id ? null : mat.id); setComisionId(null); }}>
                        {mat.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {carreraId && anio && comisiones.length > 0 && (
                <div className="filtro-grupo">
                  <label>Comisión <span className="filtro-opcional">(opcional)</span></label>
                  <div className="tag-group">
                    {comisiones.map((com) => (
                      <button key={com.id} className={`foro-tag ${comisionId === com.id ? "active" : ""}`}
                        onClick={() => setComisionId(comisionId === com.id ? null : com.id)}>
                        {com.nombre}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <p className="login-error">{error}</p>}
        </div>

        <div className="filtro-panel__footer">
          <button className="filtro-limpiar-btn" onClick={onClose}>Cancelar</button>
          <button className="filtro-aplicar-btn" onClick={handlePublicar} disabled={enviando}>
            {enviando ? "Publicando..." : "Publicar"}
          </button>
        </div>
      </div>
    </>
  );
}
