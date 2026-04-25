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
  const [totalHoras, setTotalHoras] = useState<number>(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        .select("idMateria, idComision, materia(id, nombre, horas_semanales)")
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
        horas_semanales: rel.materia.horas_semanales ?? 0
      });
      }

      // Agrupar por año
      const porAnio = new Map<number, MateriaConAnio[]>();
      for (const [id, { nombre, anio, horas_semanales }] of materiaAnioMap) {
        if (!porAnio.has(anio)) porAnio.set(anio, []);
        porAnio.get(anio)!.push({ id, nombre, anio, horas_semanales });
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


  //traer horas semanales de cada materia
 useEffect(() => {
  if (!carreraId || materiasPorAnio.size === 0) {
    setTotalHoras(0);
    return;
  }

  const fetchHoras = async () => {
    const ids = Array.from(materiasPorAnio.values())
      .flat()
      .map(m => m.id);

    if (ids.length === 0) {
      setTotalHoras(0);
      return;
    }

    const { data } = await supabase
      .from("materia")
      .select("horas_semanales")
      .in("id", ids);

    if (!data) {
      setTotalHoras(0);
      return;
    }

    const total = data.reduce(
      (acc, item) => acc + (item.horas_semanales || 0),
      0
    );

    setTotalHoras(total);
  };

  fetchHoras();
}, [carreraId, materiasPorAnio]);

  //cargar progreso del usuario
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
  const horasAprobadas = Array.from(materiasPorAnio.values())
  .flat()
  .filter(m => progreso.has(m.id))
  .reduce((acc, m: any) => acc + (m.horas_semanales ?? 0), 0);

const horasRestantes = totalHoras - horasAprobadas;

  return (
    <div className="progreso-page">

      {/* Tab lateral — solo mobile, abre el drawer */}
      <button
        className="progreso-sidebar-tab"
        onClick={() => setSidebarOpen(true)}
        aria-label="Abrir panel de materias"
        aria-expanded={sidebarOpen}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Backdrop — solo mobile */}
      {sidebarOpen && (
        <div className="progreso-sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* Panel izquierdo — selector + materias */}
      <div className={`progreso-sidebar${sidebarOpen ? ' progreso-sidebar--open' : ''}`}>
        <div className="progreso-sidebar__header">
          <div className="progreso-sidebar__header-top">
            <h1 className="progreso-title">Mi Progreso</h1>
            <button className="progreso-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Cerrar panel">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <p className="progreso-sub">Registrá las materias que rendiste y calculá tu promedio</p>
        </div>

        {/* Selector de carrera */}
        <div className="progreso-filtro">
          <p id="carrera-label" className="progreso-filtro-label" style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#aaa', margin: 0 }}>Carrera</p>
          <div className="progreso-tag-list" role="group" aria-labelledby="carrera-label">
            {ingenierias.map(ing => (
              <button key={ing.id}
                className={`progreso-tag-block ${carreraId === ing.id ? "active" : ""}`}
                aria-pressed={carreraId === ing.id}
                onClick={() => setCarreraId(carreraId === ing.id ? null : ing.id)}>
                {ing.nombre}
                {carreraId === ing.id && <span aria-hidden="true">✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de materias por año */}
        {loading ? (
          <p className="progreso-loading" role="status">Cargando materias...</p>
        ) : carreraId && (
          <div className="progreso-materias">
            {aniosOrdenados.map((anio, idx) => (
              <div key={anio}>
                {idx > 0 && <div className="progreso-divisor" />}
                <h3 className="progreso-anio">{anio}° Año</h3>
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
                            disabled={saving === mat.id}
                            role="checkbox"
                            aria-checked={rendida}
                            aria-label={`Marcar ${mat.nombre} como rendida`}>
                            {rendida && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
                                  aria-pressed={nota === n}
                                  aria-label={`Nota ${n} para ${mat.nombre}`}
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
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.25 }} aria-hidden="true">
              <path d="M18 20V10M12 20V4M6 20v-6" />
            </svg>
            <p className="progreso-stats__empty-title">Elegí una carrera</p>
            <p className="progreso-stats__empty-body">
              Vas a ver tu promedio, el porcentaje de carrera completada y el progreso por año.
            </p>
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
                <div className="progreso-bar__fill" style={{ transform: `scaleX(${porcentaje / 100})` }} />
              </div>
            </div>

            {/* Gráfico circular */}
            <div className="progreso-card">
  <p className="progreso-card__label">Horas restantes</p>

  <div className="progreso-donut-wrapper">
    <svg viewBox="0 0 100 100" className="progreso-donut">

      {/* Fondo */}
      <circle
        cx="50"
        cy="50"
        r="38"
        fill="none"
        stroke="#f0f0ee"
        strokeWidth="12"
      />

      {/* Progreso (lo que YA hiciste) */}
      <circle
        cx="50"
        cy="50"
        r="38"
        fill="none"
        stroke="#1f387e"
        strokeWidth="12"
        strokeDasharray={`${
          2 * Math.PI * 38 * (totalHoras > 0 ? horasAprobadas / totalHoras : 0)
        } ${2 * Math.PI * 38}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />

      {/* TEXTO CENTRAL */}
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="14"
        fontWeight="700"
        fill="#1f387e"
      >
        {totalHoras > 0
          ? `${totalHoras - horasAprobadas}h`
          : "0h"}
      </text>

      {/* Subtexto */}
      <text
        x="50"
        y="65"
        textAnchor="middle"
        fontSize="10"
        fill="#666"
      >
        restantes
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
                        <div className="progreso-bar__fill" style={{ transform: `scaleX(${pct / 100})` }} />
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