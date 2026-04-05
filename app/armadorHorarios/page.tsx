"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supaBaseClient.js";
import "./horarios.css";


const DIAS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

const FRANJAS = [
  "8:00", "8:45", "9:30", "9:40", "10:25", "11:10", "11:20",
  "12:05", "12:50", "13:15", "14:00", "14:45", "14:55",
  "15:40", "16:25", "16:35", "17:20", "18:05", "18:15",
  "19:00", "19:45", "19:55", "20:40", "21:25", "21:35", "22:20", "23:05",
];

const PALETTE: { bg: string; text: string; border: string }[] = [
  { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
  { bg: "#dcfce7", text: "#166534", border: "#86efac" },
  { bg: "#fef9c3", text: "#854d0e", border: "#fde047" },
  { bg: "#fce7f3", text: "#9d174d", border: "#f9a8d4" },
  { bg: "#ede9fe", text: "#5b21b6", border: "#c4b5fd" },
  { bg: "#ffedd5", text: "#9a3412", border: "#fdba74" },
  { bg: "#cffafe", text: "#155e75", border: "#67e8f9" },
  { bg: "#f0fdf4", text: "#14532d", border: "#86efac" },
  { bg: "#fdf4ff", text: "#6b21a8", border: "#d8b4fe" },
  { bg: "#fff7ed", text: "#7c2d12", border: "#fdba74" },
];

type Ingenieria = { id: number; nombre: string };
type Horario = { dia: string; hora_inicio: string; hora_fin: string; cuatrimestre: number };
type Comision = { id: number; nombre: string; horarios: Horario[] };
type MateriaConComisiones = { id: number; nombre: string; comisiones: Comision[] };
type Pick = {
  materiaId: number;
  materiaNombre: string;
  comisionId: number;
  comisionNombre: string;
  horarios: Horario[];
  colorIdx: number;
};

function franjaIdx(t: string) { return FRANJAS.indexOf(t); }
function toMin(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + (m ?? 0); }
function slotPx(i: number) { return Math.max(14, (toMin(FRANJAS[i + 1]) - toMin(FRANJAS[i])) * 0.7); }
function calcBlockHeight(startIdx: number, endIdx: number) {
  let total = 0;
  for (let i = startIdx; i < endIdx && i < FRANJAS.length - 1; i++) total += slotPx(i);
  return total - 2;
}
function horariosOverlap(a: Horario[], b: Horario[]): boolean {
  for (const h1 of a) for (const h2 of b) {
    if (h1.dia !== h2.dia) continue;
    if (franjaIdx(h1.hora_inicio) < franjaIdx(h2.hora_fin) &&
      franjaIdx(h2.hora_inicio) < franjaIdx(h1.hora_fin)) return true;
  }
  return false;
}

export default function HorariosPage() {
  const [ingenierias, setIngenierias] = useState<Ingenieria[]>([]);
  const [materias, setMaterias] = useState<MateriaConComisiones[]>([]);
  const [carreraId, setCarreraId] = useState<number | null>(null);
  const [anio, setAnio] = useState<number | null>(null);
  const [loadingMaterias, setLoadingMaterias] = useState(false);
  const [activaMatId, setActivaMatId] = useState<number | null>(null);
  const [picks, setPicks] = useState<Map<number, Pick>>(new Map());
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    supabase.from("ingenieria").select("id, nombre").order("nombre")
      .then(({ data, error }) => {
        console.log("[ingenierias] data:", data, "error:", error);
        if (data) setIngenierias(data);
      });
  }, []);

  useEffect(() => {
    if (!carreraId || !anio) { setMaterias([]); return; }
    const fetch = async () => {
      setLoadingMaterias(true);

      const { data: comisiones } = await supabase
        .from("comision").select("id, nombre")
        .eq("ingenieria_id", carreraId).eq("año", anio);

      if (!comisiones?.length) { setMaterias([]); setLoadingMaterias(false); return; }

      const idsComisiones = comisiones.map(c => c.id);

      const { data: rels } = await supabase
        .from("ComisionMaterias")
        .select("idMateria, idComision, horarios, materia(id, nombre)")
        .in("idComision", idsComisiones);

      if (!rels) { setMaterias([]); setLoadingMaterias(false); return; }

      // Agrupar por materia
      const map = new Map<number, MateriaConComisiones>();
      for (const rel of rels as any[]) {
        if (!rel.materia || !rel.horarios) continue;
        const mat = rel.materia;
        if (!map.has(mat.id)) {
          map.set(mat.id, { id: mat.id, nombre: mat.nombre, comisiones: [] });
        }
        const comision = comisiones.find(c => c.id === rel.idComision);
        if (comision) {
          map.get(mat.id)!.comisiones.push({
            id: comision.id,
            nombre: comision.nombre,
            horarios: rel.horarios
          });
        }
      }

      setMaterias(Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setLoadingMaterias(false);
    };
    fetch();
  }, [carreraId, anio]);

  function showError(msg: string) {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 3000);
  }
  function getColor(materiaId: number) {
    // Primero buscamos en materias actuales
    let idx = materias.findIndex((m) => m.id === materiaId);

    // Si no está en materias actuales, usamos el colorIdx guardado en el pick
    if (idx === -1) {
      const pick = picks.get(materiaId);
      idx = pick?.colorIdx ?? 0;
    }

    return PALETTE[idx % PALETTE.length];
  }
  function conflictsWith(materiaId: number, horarios: Horario[]): string | null {
    for (const [id, pick] of picks) {
      if (id === materiaId) continue;
      if (horariosOverlap(pick.horarios, horarios)) return pick.materiaNombre;
    }
    return null;
  }
  function selectMateria(matId: number) { setActivaMatId((prev) => (prev === matId ? null : matId)); }
  function pickComision(materia: MateriaConComisiones, comision: Comision) {
    const existing = picks.get(materia.id);
    if (existing && existing.comisionId === comision.id) {
      const next = new Map(picks); next.delete(materia.id); setPicks(next); return;
    }
    const conflict = conflictsWith(materia.id, comision.horarios);
    if (conflict) { showError(`⚠ Superposición con "${conflict}"`); return; }
    const colorIdx = materias.findIndex((m) => m.id === materia.id);
    const next = new Map(picks);
    next.set(materia.id, { materiaId: materia.id, materiaNombre: materia.nombre, comisionId: comision.id, comisionNombre: comision.nombre, horarios: comision.horarios, colorIdx });
    setPicks(next);
  }
  function removePick(materiaId: number) {
    const next = new Map(picks); next.delete(materiaId); setPicks(next);
    if (activaMatId === materiaId) setActivaMatId(null);
  }
  function resetCarrera() {
    setCarreraId(null);
    setAnio(null);
    setMaterias([]);
    setActivaMatId(null);
    // ← sin setPicks(new Map()) acá también
  }

  function getBloquesEnCelda(dia: string, fi: number) {
    const resultado: {
      type: "pick" | "candidate";
      materia: MateriaConComisiones;
      comision: Comision;
      horario: Horario;
      isPicked: boolean;
      isDimmed: boolean;
    }[] = [];

    // Renders picks directamente desde el pick, sin depender de materias
    for (const [matId, pick] of picks) {
      if (matId === activaMatId) continue;
      for (const h of pick.horarios) {
        if (h.dia === dia && franjaIdx(h.hora_inicio) === fi) {
          // Construimos objetos mínimos para renderizar
          const materiaFake: MateriaConComisiones = {
            id: pick.materiaId,
            nombre: pick.materiaNombre,
            comisiones: [],
          };
          const comisionFake: Comision = {
            id: pick.comisionId,
            nombre: pick.comisionNombre,
            horarios: pick.horarios,
          };
          resultado.push({
            type: "pick",
            materia: materiaFake,
            comision: comisionFake,
            horario: h,
            isPicked: true,
            isDimmed: !!activaMatId,
          });
        }
      }
    }

    // Candidates solo si la materia activa está en materias actuales
    if (activaMatId) {
      const mat = materias.find((m) => m.id === activaMatId);
      if (mat) {
        const pickedComId = picks.get(activaMatId)?.comisionId;
        mat.comisiones.forEach((com) => {
          for (const h of com.horarios) {
            if (h.dia === dia && franjaIdx(h.hora_inicio) === fi) {
              const isPicked = com.id === pickedComId;
              resultado.push({
                type: "candidate",
                materia: mat,
                comision: com,
                horario: h,
                isPicked,
                isDimmed: !!pickedComId && !isPicked,
              });
            }
          }
        });
      }
    }

    return resultado;
  }

  const activaMat = materias.find((m) => m.id === activaMatId) ?? null;

  return (
    <div className="horarios-page">
      <div className="horarios-selector">
        <div className="horarios-selector__header">
          <h1 className="horarios-selector__title">Armador de Horarios</h1>
          <p className="horarios-selector__sub">Elegí tu carrera, año y materias para construir tu horario ideal</p>
        </div>

        <div className="horarios-filtros">

          {/* Carrera */}
          <div className="horarios-filtro">
            <label>Carrera</label>
            <div className="horarios-tag-list">
              {ingenierias.map((ing) => (
                <button key={ing.id}
                  className={`horarios-tag-block ${carreraId === ing.id ? "active" : ""}`}
                  onClick={() => {
                    if (carreraId === ing.id) { resetCarrera(); return; }
                    setCarreraId(ing.id);
                    setAnio(null);
                    setMaterias([]);
                    setActivaMatId(null);
                  }}>
                  {ing.nombre}
                  {carreraId === ing.id && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Año */}
          {carreraId && (
            <div className="horarios-filtro">
              <label>Año</label>
              <div className="horarios-tag-list">
                {[1, 2, 3, 4, 5].map((a) => (
                  <button key={a}
                    className={`horarios-tag-block ${anio === a ? "active" : ""}`}
                    onClick={() => {
                      setAnio(anio === a ? null : a);
                      setActivaMatId(null);

                    }}>
                    {a}° Año
                    {anio === a && <span>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Materias */}
          {carreraId && anio && (
            <div className="horarios-filtro">
              <label>
                Materias
                {activaMat && <span className="horarios-filtro__hint"> — elegí una comisión en la grilla</span>}
              </label>
              {loadingMaterias ? <p className="horarios-loading">Cargando materias...</p> : (
                <div className="horarios-tag-list">
                  {materias.length === 0 && <p className="horarios-loading">Sin materias para esta carrera y año.</p>}
                  {materias.map((mat) => {
                    const pick = picks.get(mat.id);
                    const isActiva = activaMatId === mat.id;
                    const tieneHorario = mat.comisiones.some((c) => c.horarios?.length);
                    const c = getColor(mat.id);
                    return (
                      <button key={mat.id} disabled={!tieneHorario}
                        className={`horarios-tag-block ${isActiva ? "active" : ""} ${pick ? "agregada" : ""} ${!tieneHorario ? "sin-horario" : ""}`}
                        style={pick ? { background: c.bg, borderColor: c.border, color: c.text } : {}}
                        onClick={() => selectMateria(mat.id)}
                        title={!tieneHorario ? "Sin horario asignado" : undefined}>
                        {mat.nombre}
                        {pick && (
                          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, opacity: 0.7 }}>{pick.comisionNombre}</span>
                            <span onClick={(e) => { e.stopPropagation(); removePick(mat.id); }}
                              style={{ opacity: 0.5, fontSize: 16, lineHeight: 1 }}>×</span>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Leyenda */}
          {picks.size > 0 && (
            <div className="horarios-legend">
              {Array.from(picks.values()).map((pick) => {
                const c = PALETTE[pick.colorIdx % PALETTE.length];
                return (
                  <div key={pick.materiaId} className="horarios-legend__item" style={{ borderColor: c.border }}
                    onClick={() => removePick(pick.materiaId)} title="Click para quitar">
                    <span className="horarios-legend__dot" style={{ background: c.bg, borderColor: c.border }} />
                    <span style={{ color: c.text }}>
                      {pick.materiaNombre}
                      <span style={{ opacity: 0.65 }}> · {pick.comisionNombre}</span>
                    </span>
                    <span style={{ opacity: 0.4, marginLeft: 4 }}>×</span>
                  </div>
                );
              })}
            </div>
          )}

          {errorMsg && <p className="horarios-error">{errorMsg}</p>}

        </div>
      </div>

      {/* ── Grilla ───────────────────────────────────── */}
      <div className="horarios-grilla-wrapper">
        {loadingMaterias ? (
          <p className="horarios-loading" style={{ padding: 40 }}>Cargando...</p>
        ) : (
          <div className="horarios-grilla">

            <div className="horarios-grilla__corner" />
            {DIAS.map((dia) => (
              <div key={dia} className="horarios-grilla__dia">{dia}</div>
            ))}

            {FRANJAS.slice(0, -1).map((franja, fi) => (
              <React.Fragment key={franja}>
                <div className="horarios-grilla__hora" style={{ height: slotPx(fi) }}>
                  {franja}
                </div>

                {DIAS.map((dia) => {
                  const bloques = getBloquesEnCelda(dia, fi);
                  const candidates = bloques.filter((b) => b.type === "candidate");
                  const nCands = candidates.length;
                  return (
                    <div key={`${dia}-${franja}`} className="horarios-grilla__celda" style={{ height: slotPx(fi) }}>
                      {bloques.map((bloque) => {
                        const c = getColor(bloque.materia.id);
                        const dur = franjaIdx(bloque.horario.hora_fin) - franjaIdx(bloque.horario.hora_inicio);
                        const blockH = calcBlockHeight(fi, fi + dur);
                        const isPick = bloque.type === "pick";
                        const candIdx = candidates.indexOf(bloque);
                        const widthStyle = !isPick && nCands > 1
                          ? { width: `calc(${100 / nCands}% - 2px)`, left: `calc(${(candIdx / nCands) * 100}% + 1px)` }
                          : {};
                        const style: React.CSSProperties = {
                          position: "absolute", top: 2, left: 2, right: 2,
                          height: blockH,
                          background: c.bg,
                          borderColor: bloque.isPicked ? c.text : c.border,
                          color: c.text,
                          opacity: bloque.isDimmed ? 0.2 : 1,
                          boxShadow: bloque.isPicked ? `0 0 0 1.5px ${c.border}` : "none",
                          zIndex: bloque.isPicked ? 5 : isPick ? 3 : 2,
                          pointerEvents: bloque.isDimmed ? "none" : "auto",
                          ...widthStyle,
                        };
                        return (
                          <div
                            key={`${bloque.materia.id}-${bloque.comision.id}`}
                            className={`horarios-bloque ${bloque.isPicked ? "picked" : ""} ${isPick ? "is-pick" : "is-candidate"}`}
                            style={style}
                            onClick={() => {
                              if (isPick) selectMateria(bloque.materia.id);
                              else pickComision(bloque.materia, bloque.comision);
                            }}>
                            <span className="horarios-bloque__mat">{bloque.materia.nombre}</span>
                            <span className="horarios-bloque__com">{bloque.comision.nombre}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}

            {/* Fila final 23:05 */}
            <div className="horarios-grilla__hora" style={{ height: 14 }}>23:05</div>
            {DIAS.map((dia) => (
              <div key={`${dia}-fin`} className="horarios-grilla__celda" style={{ height: 14 }} />
            ))}

          </div>
        )}
      </div>
    </div>
  );
}