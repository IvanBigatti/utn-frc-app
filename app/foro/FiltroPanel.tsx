"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/app/lib/supabase/client";

type TipoPost = "Pregunta" | "Recurso" | "Debate" | "Aviso";

type Filtros = {
  carreraId: number | null;
  anio: number | null;
  materiaId: number | null;
  comisionId: number | null;
  tipo: TipoPost | null;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  filtros: Filtros;
  onChange: (f: Filtros) => void;
};

type Item = { id: number; nombre: string };

const TIPOS: TipoPost[] = ["Pregunta", "Recurso", "Debate", "Aviso"];

const supabase = createClient();

export default function FiltroPanel({ isOpen, onClose, filtros, onChange }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  const [ingenierias, setIngenierias] = useState<Item[]>([]);
  const [materias, setMaterias] = useState<Item[]>([]);
  const [comisiones, setComisiones] = useState<Item[]>([]);
  const [local, setLocal] = useState<Filtros>(filtros);

  useEffect(() => { if (isOpen) setLocal(filtros); }, [isOpen]);

  useEffect(() => {
    supabase.from("ingenieria").select("id, nombre").order("nombre")
      .then(({ data }) => { if (data) setIngenierias(data); });
  }, []);

  useEffect(() => {
    if (!local.carreraId || !local.anio) { setMaterias([]); return; }
    const fetch = async () => {
      const { data: coms } = await supabase
        .from("comision").select("id")
        .eq("ingenieria_id", local.carreraId!).eq("año", local.anio!);
      if (!coms?.length) { setMaterias([]); return; }
      const { data: rels } = await supabase
        .from("ComisionMaterias").select("materia(id, nombre)")
        .in("idComision", coms.map((c) => c.id));
      const unicas = Array.from(
        new Map(rels?.map((r: any) => r.materia).filter(Boolean).map((m: Item) => [m.id, m])).values()
      ) as Item[];
      setMaterias(unicas.sort((a, b) => a.nombre.localeCompare(b.nombre)));
    };
    fetch();
  }, [local.carreraId, local.anio]);

  useEffect(() => {
    if (!local.carreraId || !local.anio) { setComisiones([]); return; }
    const fetch = async () => {
      let query = supabase.from("comision").select("id, nombre")
        .eq("ingenieria_id", local.carreraId!).eq("año", local.anio!);
      if (local.materiaId) {
        const { data: rels } = await supabase
          .from("ComisionMaterias").select("idComision").eq("idMateria", local.materiaId);
        const ids = rels?.map((r) => r.idComision) ?? [];
        if (!ids.length) { setComisiones([]); return; }
        query = query.in("id", ids);
      }
      const { data } = await query;
      if (data) setComisiones(data);
    };
    fetch();
  }, [local.carreraId, local.anio, local.materiaId]);

  const handleAplicar = () => { onChange(local); onClose(); };
  const handleLimpiar = () => {
    const vacio: Filtros = { carreraId: null, anio: null, materiaId: null, comisionId: null, tipo: null };
    setLocal(vacio);
    onChange(vacio);
    onClose();
  };

  // Capture trigger on open; return focus on close
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
    } else if (triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  }, [isOpen]);

  // Focus trap
  const handleClose = useCallback(onClose, [onClose]);
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const panel = panelRef.current;
    const sel = 'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(sel));
    if (focusable.length) focusable[0].focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key === "Escape") { handleClose(); return; }
      if (e.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    panel.addEventListener("keydown", trap);
    return () => panel.removeEventListener("keydown", trap);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="filtro-overlay" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className="filtro-lateral"
        role="dialog"
        aria-modal="true"
        aria-labelledby="filtro-panel-title"
      >

        <div className="filtro-lateral__header">
          <h3 id="filtro-panel-title">Filtrar publicaciones</h3>
          <button className="filtro-panel__close" onClick={onClose} aria-label="Cerrar filtros">✕</button>
        </div>

        <div className="filtro-lateral__body">

          <div className="filtro-grupo">
            <label>Tipo de publicación <span className="filtro-opcional">(opcional)</span></label>
            <div className="tag-group">
              {TIPOS.map((t) => (
                <button
                  key={t}
                  className={`foro-tag ${local.tipo === t ? "active" : ""}`}
                  onClick={() => setLocal((p) => ({ ...p, tipo: p.tipo === t ? null : t }))}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="filtro-grupo">
            <label>Carrera</label>
            <div className="tag-group">
              {ingenierias.map((ing) => (
                <button key={ing.id} className={`foro-tag ${local.carreraId === ing.id ? "active" : ""}`}
                  onClick={() => setLocal((p) => ({ ...p, carreraId: p.carreraId === ing.id ? null : ing.id, anio: null, materiaId: null, comisionId: null }))}>
                  {ing.nombre}
                </button>
              ))}
            </div>
          </div>

          {local.carreraId && (
            <div className="filtro-grupo">
              <label>Año</label>
              <div className="tag-group">
                {[1, 2, 3, 4, 5].map((a) => (
                  <button key={a} className={`foro-tag ${local.anio === a ? "active" : ""}`}
                    onClick={() => setLocal((p) => ({ ...p, anio: p.anio === a ? null : a, materiaId: null, comisionId: null }))}>
                    {a}° Año
                  </button>
                ))}
              </div>
            </div>
          )}

          {local.carreraId && local.anio && materias.length > 0 && (
            <div className="filtro-grupo">
              <label>Materia <span className="filtro-opcional">(opcional)</span></label>
              <div className="tag-group">
                {materias.map((mat) => (
                  <button key={mat.id} className={`foro-tag ${local.materiaId === mat.id ? "active" : ""}`}
                    onClick={() => setLocal((p) => ({ ...p, materiaId: p.materiaId === mat.id ? null : mat.id, comisionId: null }))}>
                    {mat.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}

          {local.carreraId && local.anio && comisiones.length > 0 && (
            <div className="filtro-grupo">
              <label>Comisión <span className="filtro-opcional">(opcional)</span></label>
              <div className="tag-group">
                {comisiones.map((com) => (
                  <button key={com.id} className={`foro-tag ${local.comisionId === com.id ? "active" : ""}`}
                    onClick={() => setLocal((p) => ({ ...p, comisionId: p.comisionId === com.id ? null : com.id }))}>
                    {com.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        <div className="filtro-lateral__footer">
          <button className="filtro-limpiar-btn" onClick={handleLimpiar}>Limpiar filtros</button>
          <button className="filtro-aplicar-btn" onClick={handleAplicar}>Aplicar</button>
        </div>

      </div>
    </>
  );
}
