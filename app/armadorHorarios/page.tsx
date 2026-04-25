"use client";

import React, { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
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
type Comision = { id: number; nombre: string; horarios: Horario[]; cuatrimestre: number };
type MateriaConComisiones = { id: number; nombre: string; comisiones: Comision[] };
type Pick = {
  materiaId: number;
  materiaNombre: string;
  comisionId: number;
  comisionNombre: string;
  horarios: Horario[];
  colorIdx: number;
  cuatrimestre: number;
};

function franjaIdx(t: string) { return FRANJAS.indexOf(t); }
function toMin(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + (m ?? 0); }
function slotPx(i: number) { return Math.max(10, (toMin(FRANJAS[i + 1]) - toMin(FRANJAS[i])) * 0.9); }
function calcBlockHeight(startIdx: number, endIdx: number) {
  let total = 0;
  for (let i = startIdx; i < endIdx && i < FRANJAS.length - 1; i++) total += slotPx(i);
  return total - 2;
}
function mergeHorarios(horarios: Horario[]): Horario[] {
  const byDia = new Map<string, Horario[]>();
  for (const h of horarios) {
    if (!byDia.has(h.dia)) byDia.set(h.dia, []);
    byDia.get(h.dia)!.push(h);
  }
  const merged: Horario[] = [];
  for (const slots of byDia.values()) {
    slots.sort((a, b) => franjaIdx(a.hora_inicio) - franjaIdx(b.hora_inicio));
    let cur = { ...slots[0] };
    for (let i = 1; i < slots.length; i++) {
      if (cur.hora_fin === slots[i].hora_inicio) {
        cur = { ...cur, hora_fin: slots[i].hora_fin };
      } else {
        merged.push(cur);
        cur = { ...slots[i] };
      }
    }
    merged.push(cur);
  }
  return merged;
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
  const [cuatrimestre, setCuatrimestre] = useState<1 | 2 | null>(null);
  const [loadingMaterias, setLoadingMaterias] = useState(false);
  const [activaMatId, setActivaMatId] = useState<number | null>(null);
  const [picks, setPicks] = useState<Map<number, Pick>>(new Map());
  const [errorMsg, setErrorMsg] = useState("");
  const [exporting, setExporting] = useState(false);
  const grillaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from("ingenieria").select("id, nombre").order("nombre")
      .then(({ data, error }) => {
        if (data) setIngenierias(data);
      });
  }, []);

  useEffect(() => {
    const fetch = async () => {
      if (!carreraId || !anio || !cuatrimestre) {
        setMaterias([]);
        return;
      }
      setLoadingMaterias(true);

      const { data: comisiones } = await supabase
        .from("comision").select("id, nombre")
        .eq("ingenieria_id", carreraId).eq("año", anio);

      if (!comisiones?.length) { setMaterias([]); setLoadingMaterias(false); return; }

      const idsComisiones = comisiones.map(c => c.id);

      const { data: rels } = await supabase
        .from("ComisionMaterias")
        .select("idMateria, idComision, horarios, cuatrimestre, materia(id, nombre)")
        .in("idComision", idsComisiones)
        .or(`cuatrimestre.is.null,cuatrimestre.in.(0,${cuatrimestre})`);

      if (!rels) { setMaterias([]); setLoadingMaterias(false); return; }

      // Agrupar por materia
      const map = new Map<number, MateriaConComisiones>();
      for (const rel of rels as { materia: { id: number; nombre: string } | null; horarios: Horario[] | null; idComision: number; cuatrimestre: number }[]) {
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
            horarios: rel.horarios,
            cuatrimestre: rel.cuatrimestre ?? 0,
          });
        }
      }

      setMaterias(Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setLoadingMaterias(false);
    };
    fetch();
  }, [carreraId, anio, cuatrimestre]);

  function showError(msg: string) {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(""), 3000);
  }

  async function handleExportar() {
    if (!grillaRef.current) return;
    setExporting(true);

    // Deseleccionar materia activa para que no aparezcan candidates ni conflictos
    const prevActiva = activaMatId;
    setActivaMatId(null);

    // Esperar dos frames para que React re-renderice sin el estado de selección
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const canvas = await html2canvas(grillaRef.current, { scale: 2, useCORS: true });

    const imgW = canvas.width;
    const imgH = canvas.height;
    const pdfW = imgW * 0.264583; // px a mm (96dpi → mm)
    const pdfH = imgH * 0.264583;
    const pdf = new jsPDF({ orientation: pdfW > pdfH ? "landscape" : "portrait", unit: "mm", format: [pdfW, pdfH] });
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pdfW, pdfH);
    pdf.save("horario.pdf");

    // Restaurar materia activa
    setActivaMatId(prevActiva);
    setExporting(false);
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
      // Ignorar picks de otro cuatrimestre (no se superponen en la realidad)
      if (pick.cuatrimestre !== 0 && pick.cuatrimestre !== cuatrimestre) continue;
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
    next.set(materia.id, { materiaId: materia.id, materiaNombre: materia.nombre, comisionId: comision.id, comisionNombre: comision.nombre, horarios: comision.horarios, colorIdx, cuatrimestre: comision.cuatrimestre });
    setPicks(next);
  }
  function removePick(materiaId: number) {
    const next = new Map(picks); next.delete(materiaId); setPicks(next);
    if (activaMatId === materiaId) setActivaMatId(null);
  }
  function resetCarrera() {
    setCarreraId(null);
    setAnio(null);
    setCuatrimestre(null);
    setMaterias([]);
    setActivaMatId(null);
  }

  function getBloquesEnCelda(dia: string, fi: number) {
    const resultado: {
      type: "pick" | "candidate";
      materia: MateriaConComisiones;
      comision: Comision;
      horario: Horario;
      isPicked: boolean;
      isDimmed: boolean;
      hasConflict: boolean;
    }[] = [];

    // Renders picks directamente desde el pick, sin depender de materias
    for (const [matId, pick] of picks) {
      if (matId === activaMatId) continue;
      // Ocultar picks de cuatrimestre distinto (anuales=0 siempre visibles)
      if (pick.cuatrimestre !== 0 && pick.cuatrimestre !== cuatrimestre) continue;
      for (const h of mergeHorarios(pick.horarios)) {
        if (h.dia === dia && franjaIdx(h.hora_inicio) === fi) {
          const materiaFake: MateriaConComisiones = {
            id: pick.materiaId,
            nombre: pick.materiaNombre,
            comisiones: [],
          };
          const comisionFake: Comision = {
            id: pick.comisionId,
            nombre: pick.comisionNombre,
            horarios: pick.horarios,
            cuatrimestre: pick.cuatrimestre,
          };
          resultado.push({
            type: "pick",
            materia: materiaFake,
            comision: comisionFake,
            horario: h,
            isPicked: true,
            isDimmed: !!activaMatId,
            hasConflict: false,
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
          const hasConflict = [...picks.entries()].some(
            ([id, pick]) =>
              id !== activaMatId &&
              (pick.cuatrimestre === 0 || pick.cuatrimestre === cuatrimestre) &&
              horariosOverlap(com.horarios, pick.horarios)
          );
          for (const h of mergeHorarios(com.horarios)) {
            if (h.dia === dia && franjaIdx(h.hora_inicio) === fi) {
              const isPicked = com.id === pickedComId;
              resultado.push({
                type: "candidate",
                materia: mat,
                comision: com,
                horario: h,
                isPicked,
                isDimmed: !!pickedComId && !isPicked,
                hasConflict,
              });
            }
          }
        });
      }
    }

    return resultado;
  }

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const activaMat = materias.find((m) => m.id === activaMatId) ?? null;
  const visiblePicks = Array.from(picks.values()).filter(p => p.cuatrimestre === 0 || p.cuatrimestre === cuatrimestre);

  return (
    <div className="horarios-page">

      {/* Backdrop mobile: cierra sidebar al tocar fuera */}
      {sidebarOpen && (
        <div className="horarios-sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ───────────────────────────────────── */}
      <div className={`horarios-selector ${sidebarOpen ? "" : "horarios-selector--closed"}`}>
        <div className="horarios-selector__header">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <h1 className="horarios-selector__title">Armador de Horarios</h1>
              <p className="horarios-selector__sub">Elegí tu carrera, año y materias</p>
            </div>
            <button className="horarios-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú">✕</button>
          </div>
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
                      const nuevoAnio = anio === a ? null : a;
                      setAnio(nuevoAnio);
                      setCuatrimestre(nuevoAnio ? 1 : null);
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
          {carreraId && anio && cuatrimestre && (
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
          {visiblePicks.length > 0 && (
            <div className="horarios-legend">
              {visiblePicks.map((pick) => {
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

      {/* Tab lateral mobile (flechita en el borde izquierdo) */}
      <button
        className="horarios-sidebar-tab"
        onClick={() => setSidebarOpen(s => !s)}
        aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
      >
        {sidebarOpen ? "‹" : "›"}
      </button>

      {/* ── Área principal ────────────────────────────── */}
      <div className="horarios-main">

        {/* Toolbar */}
        <div className="horarios-toolbar">
          {/* Izquierda: botón abrir sidebar (desktop) */}
          <button className="horarios-sidebar-toggle horarios-sidebar-toggle--open" onClick={() => setSidebarOpen(s => !s)} title="Menú">
            {sidebarOpen ? "‹" : "☰"}
          </button>

          {/* Centro: toggle cuatrimestre */}
          <div className="horarios-toolbar__center">
            <div className="cuatri-toggle-group">
              <span className="cuatri-toggle-label">Cuatrimestre</span>
              <label className="cuatri-toggle">
                <input
                  type="checkbox"
                  checked={cuatrimestre === 2}
                  onChange={e => {
                    setCuatrimestre(e.target.checked ? 2 : 1);
                    setActivaMatId(null);
                  }}
                />
                <div className="cuatri-toggle__track" />
              </label>
            </div>
          </div>

          {/* Derecha: Limpiar + Exportar */}
          <div className="horarios-toolbar__actions">
            {visiblePicks.length > 0 && (
              <button
                className="horarios-toolbar-btn horarios-toolbar-btn--danger"
                onClick={() => {
                  const next = new Map(picks);
                  for (const [id, pick] of picks) {
                    if (pick.cuatrimestre === 0 || pick.cuatrimestre === cuatrimestre) next.delete(id);
                  }
                  setPicks(next);
                  setActivaMatId(null);
                }}
              >
                Limpiar
              </button>
            )}
            {visiblePicks.length > 0 && (
              <button className="export-btn" onClick={handleExportar} disabled={exporting}>
                <span className="folderContainer">
                  <svg className="fileBack" width="146" height="113" viewBox="0 0 146 113" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 4C0 1.79086 1.79086 0 4 0H50.3802C51.8285 0 53.2056 0.627965 54.1553 1.72142L64.3303 13.4371C65.2799 14.5306 66.657 15.1585 68.1053 15.1585H141.509C143.718 15.1585 145.509 16.9494 145.509 19.1585V109C145.509 111.209 143.718 113 141.509 113H3.99999C1.79085 113 0 111.209 0 109V4Z" fill="url(#paint0_linear_117_4)" />
                    <defs><linearGradient id="paint0_linear_117_4" x1="0" y1="0" x2="72.93" y2="95.4804" gradientUnits="userSpaceOnUse"><stop stopColor="#8F88C2" /><stop offset="1" stopColor="#5C52A2" /></linearGradient></defs>
                  </svg>
                  <svg className="filePage" width="88" height="99" viewBox="0 0 88 99" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="88" height="99" fill="url(#paint0_linear_117_6)" />
                    <defs><linearGradient id="paint0_linear_117_6" x1="0" y1="0" x2="81" y2="160.5" gradientUnits="userSpaceOnUse"><stop stopColor="white" /><stop offset="1" stopColor="#686868" /></linearGradient></defs>
                  </svg>
                  <svg className="fileFront" width="160" height="79" viewBox="0 0 160 79" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0.29306 12.2478C0.133905 9.38186 2.41499 6.97059 5.28537 6.97059H30.419H58.1902C59.5751 6.97059 60.9288 6.55982 62.0802 5.79025L68.977 1.18034C70.1283 0.410771 71.482 0 72.8669 0H77H155.462C157.87 0 159.733 2.1129 159.43 4.50232L150.443 75.5023C150.19 77.5013 148.489 79 146.474 79H7.78403C5.66106 79 3.9079 77.3415 3.79019 75.2218L0.29306 12.2478Z" fill="url(#paint0_linear_117_5)" />
                    <defs><linearGradient id="paint0_linear_117_5" x1="38.7619" y1="8.71323" x2="66.9106" y2="82.8317" gradientUnits="userSpaceOnUse"><stop stopColor="#C3BBFF" /><stop offset="1" stopColor="#51469A" /></linearGradient></defs>
                  </svg>
                </span>
                <span className="export-text">{exporting ? "Exportando..." : "Exportar"}</span>
              </button>
            )}
          </div>
        </div>

      {/* ── Grilla ───────────────────────────────────── */}
      <div className="horarios-grilla-wrapper" ref={grillaRef}>
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
                    <div key={`${dia}-${franja}`} className="horarios-grilla__celda" style={{ height: slotPx(fi) }} onClick={() => setActivaMatId(null)}>
                      {bloques.map((bloque) => {
                        const c = getColor(bloque.materia.id);
                        const dur = franjaIdx(bloque.horario.hora_fin) - franjaIdx(bloque.horario.hora_inicio);
                        const blockH = calcBlockHeight(fi, fi + dur);
                        const isPick = bloque.type === "pick";
                        const candIdx = candidates.indexOf(bloque);
                        const widthStyle = !isPick && nCands > 1
                          ? { width: `calc(${100 / nCands}% - 2px)`, left: `calc(${(candIdx / nCands) * 100}% + 1px)` }
                          : {};
                        const conflictStyle: React.CSSProperties = bloque.hasConflict ? {
                          background: "#3b1a1a",
                          borderColor: "#7f1d1d",
                          borderStyle: "dashed",
                          color: "#fca5a5",
                          opacity: 0.85,
                        } : {};
                        const style: React.CSSProperties = {
                          position: "absolute", top: 2, left: 2, right: 2,
                          height: blockH,
                          background: c.bg,
                          borderColor: bloque.isPicked && !isPick ? c.text : c.border,
                          color: c.text,
                          opacity: bloque.isDimmed ? 0.35 : 1,
                          boxShadow: bloque.isPicked && !isPick ? `0 0 0 2px ${c.text}` : "none",
                          // candidates encima de picks conflictivos
                          zIndex: !isPick ? 10 : bloque.hasConflict ? 4 : bloque.isPicked ? 5 : 3,
                          pointerEvents: (bloque.isDimmed && isPick) ? "none" : "auto",
                          ...widthStyle,
                          ...conflictStyle,
                        };
                        return (
                          <div
                            key={`${bloque.materia.id}-${bloque.comision.id}-${bloque.horario.dia}-${bloque.horario.hora_inicio}`}
                            className={`horarios-bloque ${bloque.isPicked ? "picked" : ""} ${isPick ? "is-pick" : "is-candidate"} ${bloque.hasConflict ? "has-conflict" : ""}`}
                            style={style}
                            title={bloque.hasConflict ? "Conflicto de horario" : undefined}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isPick) selectMateria(bloque.materia.id);
                              else pickComision(bloque.materia, bloque.comision);
                            }}>
                            <span className="horarios-bloque__mat">{bloque.materia.nombre}</span>
                            <span className="horarios-bloque__com">{bloque.comision.nombre}</span>
                            <span className="horarios-bloque__time">{bloque.horario.hora_inicio} - {bloque.horario.hora_fin}</span>
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
      </div>{/* horarios-main */}
    </div>
  );
}