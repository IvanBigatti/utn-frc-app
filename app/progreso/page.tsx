"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/app/lib/supabase/client";
import "./progreso.css";

const supabase = createClient();

type Ingenieria = { id: number; nombre: string };
type MateriaConAnio = {
  id: number;
  nombre: string;
  anio: number;
};
type ProgresoItem = {
  materia_id: number;
  nota: number | null;
};

export default function ProgresoPage() {
  const [ingenierias, setIngenierias] = useState<Ingenieria[]>([]);
  const [carreraId, setCarreraId] = useState<number | null>(null);
  const [materiasPorAnio, setMateriasPorAnio] = useState<Map<number, MateriaConAnio[]>>(new Map());
  const [progreso, setProgreso] = useState<Map<number, number | null>>(new Map());
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState<number | null>(null);

  // Obtener usuario
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, []);

  // Cargar ingenierías
  useEffect(() => {
    supabase.from("ingenieria").select("id, nombre").order("nombre")
      .then(({ data }) => { if (data) setIngenierias(data); });
  }, []);

  // Cargar materias agrupadas por año
  useEffect(() => {
    if (!carreraId) { setMateriasPorAnio(new Map()); return; }
    const fetch = async () => {
      setLoading(true);

      // Traer todas las comisiones de la ingeniería
      const { data: comisiones } = await supabase
        .from("comision")
        .select("id, año")
        .eq("ingenieria_id", carreraId);

      if (!comisiones?.length) { setMateriasPorAnio(new Map()); setLoading(false); return; }

      // Traer relaciones comision-materia
      const { data: rels } = await supabase
        .from("ComisionMaterias")
        .select("idMateria, idComision, materia(id, nombre)")
        .in("idComision", comisiones.map(c => c.id));

      if (!rels) { setMateriasPorAnio(new Map()); setLoading(false); return; }

      // Mapear materia → año (usando el año de la primera comisión que aparezca)
      const materiaAnioMap = new Map<number, { nombre: string; anio: number }>();
      for (const rel of rels as any[]) {
        if (!rel.materia) continue;
        if (materiaAnioMap.has(rel.materia.id)) continue;
        const comision = comisiones.find(c => c.id === rel.idComision);
        if (!comision) continue;
        materiaAnioMap.set(rel.materia.id, {
          nombre: rel.materia.nombre,
          anio: comision.año,
        });
      }

      // Agrupar por año
      const porAnio = new Map<number, MateriaConAnio[]>();
      for (const [id, { nombre, anio }] of materiaAnioMap) {
        if (!porAnio.has(anio)) porAnio.set(anio, []);
        porAnio.get(anio)!.push({ id, nombre, anio });
      }

      // Ordenar materias dentro de cada año
      for (const [anio, mats] of porAnio) {
        porAnio.set(anio, mats.sort((a, b) => a.nombre.localeCompare(b.nombre)));
      }

      setMateriasPorAnio(porAnio);
      setLoading(false);
    };
    fetch();
  }, [carreraId]);

  // Cargar progreso del usuario para esta carrera
  useEffect(() => {
    if (!userId || !carreraId) { setProgreso(new Map()); return; }
    const fetch = async () => {
      const { data } = await supabase
        .from("progreso")
        .select("materia_id, nota")
        .eq("auth_user_id", userId)
        .eq("ingenieria_id", carreraId);

      if (data) {
        const map = new Map<number, number | null>();
        for (const item of data) map.set(item.materia_id, item.nota);
        setProgreso(map);
      }
    };
    fetch();
  }, [userId, carreraId]);

  // Toggle materia rendida
  const toggleMateria = async (materia: MateriaConAnio) => {
    if (!userId || !carreraId) return;
    setSaving(materia.id);

    if (progreso.has(materia.id)) {
      // Eliminar
      await supabase.from("progreso").delete()
        .eq("auth_user_id", userId)
        .eq("materia_id", materia.id)
        .eq("ingenieria_id", carreraId);
      const next = new Map(progreso);
      next.delete(materia.id);
      setProgreso(next);
    } else {
      // Insertar sin nota todavía
      await supabase.from("progreso").insert({
        auth_user_id: userId,
        materia_id: materia.id,
        ingenieria_id: carreraId,
        anio: materia.anio,
        nota: null,
      });
      const next = new Map(progreso);
      next.set(materia.id, null);
      setProgreso(next);
    }
    setSaving(null);
  };

  // Guardar nota
  const guardarNota = async (materiaId: number, nota: number) => {
    if (!userId || !carreraId) return;
    await supabase.from("progreso")
      .update({ nota })
      .eq("auth_user_id", userId)
      .eq("materia_id", materiaId)
      .eq("ingenieria_id", carreraId);
    const next = new Map(progreso);
    next.set(materiaId, nota);
    setProgreso(next);
  };

  // Calcular estadísticas
  const todasLasMaterias = Array.from(materiasPorAnio.values()).flat();
  const materiasRendidas = Array.from(progreso.keys());
  const notas = materiasRendidas.map(id => progreso.get(id)).filter((n): n is number => n !== null && n !== undefined);
  const promedio = notas.length > 0 ? (notas.reduce((a, b) => a + b, 0) / notas.length) : 0;
  const porcentaje = todasLasMaterias.length > 0 ? (materiasRendidas.length / todasLasMaterias.length) * 100 : 0;

  const aniosOrdenados = Array.from(materiasPorAnio.keys()).sort();

  return (
    <div className="progreso-page">

      {/* Panel izquierdo — selector + materias */}
      <div className="progreso-sidebar">
        <div className="progreso-sidebar__header">
          <h1 className="progreso-title">Mi Progreso</h1>
          <p className="progreso-sub">Registrá las materias que rendiste y calculá tu promedio</p>
        </div>

        {/* Selector de carrera */}
        <div className="progreso-filtro">
          <label>Carrera</label>
          <div className="progreso-tag-list">
            {ingenierias.map(ing => (
              <button key={ing.id}
                className={`progreso-tag-block ${carreraId === ing.id ? "active" : ""}`}
                onClick={() => setCarreraId(carreraId === ing.id ? null : ing.id)}>
                {ing.nombre}
                {carreraId === ing.id && <span>✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de materias por año */}
        {loading ? (
          <p className="progreso-loading">Cargando materias...</p>
        ) : carreraId && (
          <div className="progreso-materias">
            {aniosOrdenados.map((anio, idx) => (
              <div key={anio}>
                {idx > 0 && <div className="progreso-divisor" />}
                <p className="progreso-anio">{anio}° Año</p>
                <div className="progreso-materia-list">
                  {materiasPorAnio.get(anio)!.map(mat => {
                    const rendida = progreso.has(mat.id);
                    const nota = progreso.get(mat.id);
                    return (
                      <div key={mat.id} className={`progreso-materia ${rendida ? "rendida" : ""}`}>
                        <div className="progreso-materia__check-row">
                          <button
                            className={`progreso-check ${rendida ? "checked" : ""}`}
                            onClick={() => toggleMateria(mat)}
                            disabled={saving === mat.id}>
                            {rendida && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                          <span className="progreso-materia__nombre">{mat.nombre}</span>
                        </div>

                        {rendida && (
                          <div className="progreso-nota-row">
                            <span className="progreso-nota-label">Nota:</span>
                            <div className="progreso-nota-btns">
                              {[6, 7, 8, 9, 10].map(n => (
                                <button key={n}
                                  className={`progreso-nota-btn ${nota === n ? "active" : ""}`}
                                  onClick={() => guardarNota(mat.id, n)}>
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Panel derecho — estadísticas */}
      <div className="progreso-stats">
        {!carreraId ? (
          <div className="progreso-stats__empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>Seleccioná una carrera para ver tu progreso</p>
          </div>
        ) : (
          <>
            {/* Promedio */}
            <div className="progreso-card">
              <p className="progreso-card__label">Promedio</p>
              <p className="progreso-card__value">
                {notas.length > 0 ? promedio.toFixed(2) : "—"}
              </p>
              <p className="progreso-card__sub">
                {notas.length} {notas.length === 1 ? "materia con nota" : "materias con nota"}
              </p>
            </div>

            {/* Porcentaje de carrera */}
            <div className="progreso-card">
              <p className="progreso-card__label">Carrera completada</p>
              <p className="progreso-card__value">{Math.round(porcentaje)}%</p>
              <p className="progreso-card__sub">
                {materiasRendidas.length} de {todasLasMaterias.length} materias
              </p>

              {/* Barra de progreso */}
              <div className="progreso-bar">
                <div className="progreso-bar__fill" style={{ width: `${porcentaje}%` }} />
              </div>
            </div>

            {/* Gráfico circular */}
            <div className="progreso-card">
              <p className="progreso-card__label">Avance visual</p>
              <div className="progreso-donut-wrapper">
                <svg viewBox="0 0 100 100" className="progreso-donut">
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#f0f0ee" strokeWidth="12" />
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#1f387e" strokeWidth="12"
                    strokeDasharray={`${2 * Math.PI * 38 * porcentaje / 100} ${2 * Math.PI * 38}`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    style={{ transition: "stroke-dasharray 0.6s ease" }}
                  />
                  <text x="50" y="50" textAnchor="middle" dominantBaseline="central"
                    fontSize="16" fontWeight="700" fill="#1f387e">
                    {Math.round(porcentaje)}%
                  </text>
                </svg>
              </div>
            </div>

            {/* Progreso por año */}
            <div className="progreso-card">
              <p className="progreso-card__label">Por año</p>
              <div className="progreso-por-anio">
                {aniosOrdenados.map(anio => {
                  const mats = materiasPorAnio.get(anio)!;
                  const rendidas = mats.filter(m => progreso.has(m.id)).length;
                  const pct = Math.round((rendidas / mats.length) * 100);
                  return (
                    <div key={anio} className="progreso-anio-row">
                      <span className="progreso-anio-label">{anio}°</span>
                      <div className="progreso-bar" style={{ flex: 1 }}>
                        <div className="progreso-bar__fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="progreso-anio-pct">{rendidas}/{mats.length}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
}