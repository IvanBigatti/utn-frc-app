"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supaBaseClient.js";
import "./SearchModal.css";

type Ingenieria = { id: number; nombre: string };
type Materia = { id: number; nombre: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function SearchModal({ isOpen, onClose }: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<Element | null>(null);

  const [ingenierias, setIngenierias] = useState<Ingenieria[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);

  const [carreraId, setCarreraId] = useState<number | null>(null);
  const [materiaId, setMateriaId] = useState<number | null>(null);
  const [anio, setAnio] = useState<number | null>(null);

  const [loadingIngenierias, setLoadingIngenierias] = useState(false);
  const [loadingMaterias, setLoadingMaterias] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchIngenierias = async () => {
      setLoadingIngenierias(true);
      const { data, error } = await supabase
        .from("ingenieria")
        .select("id, nombre")
        .order("nombre");
      if (!error && data) setIngenierias(data);
      setLoadingIngenierias(false);
    };
    fetchIngenierias();
  }, [isOpen]);

  useEffect(() => {
    if (!carreraId || !anio) {
      setMaterias([]);
      return;
    }
    const fetchMaterias = async () => {
      setLoadingMaterias(true);
      const { data: comisiones } = await supabase
        .from("comision")
        .select("id")
        .eq("ingenieria_id", carreraId)
        .eq("año", anio);

      if (!comisiones || comisiones.length === 0) {
        setMaterias([]);
        setLoadingMaterias(false);
        return;
      }
      const idsComisiones = comisiones.map((c) => c.id);
      const { data: relaciones } = await supabase
        .from("ComisionMaterias")
        .select("idComision, materia(id, nombre)")
        .in("idComision", idsComisiones);

      if (!relaciones) { setMaterias([]); setLoadingMaterias(false); return; }

      const todasLasMaterias = relaciones.map((r: any) => r.materia).filter(Boolean);
      const unicas = Array.from(
        new Map(todasLasMaterias.map((m: Materia) => [m.id, m])).values()
      ) as Materia[];

      setMaterias(unicas.sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setLoadingMaterias(false);
    };
    fetchMaterias();
  }, [carreraId, anio]);

  const handleClose = useCallback(() => {
    setCarreraId(null);
    setMateriaId(null);
    setAnio(null);
    setMaterias([]);
    onClose();
  }, [onClose]);

  // Capture trigger element on open; return focus on close
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
    } else if (triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus();
    }
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !dialogRef.current) return;
    const dialog = dialogRef.current;
    const sel = 'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(sel));
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
    dialog.addEventListener("keydown", trap);
    return () => dialog.removeEventListener("keydown", trap);
  }, [isOpen, handleClose]);

  const handleBuscar = () => {
    if (!materiaId) return;
    router.push(`/resultados?materia_id=${materiaId}&carrera_id=${carreraId}&anio=${anio}`);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="overlay" onClick={handleClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-modal-title"
      >
        <div className="modal__header">
          <h2 id="search-modal-title">Buscar material</h2>
          <button className="modal__close" onClick={handleClose} aria-label="Cerrar">✕</button>
        </div>

        <div className="modal__fields">

          {/* Filtro 1: Carrera */}
          <div className="modal__field">
            <label>Carrera</label>
            {loadingIngenierias ? (
              <p className="modal__loading">Cargando carreras...</p>
            ) : (
              <div className="tag-group">
                {ingenierias.map((ing) => (
                  <button
                    key={ing.id}
                    className={`animated-button ${carreraId === ing.id ? "active" : ""}`}
                    onClick={() => {
                      setCarreraId(ing.id === carreraId ? null : ing.id);
                      setAnio(null);
                      setMateriaId(null);
                    }}
                  >
                    <span className="circle" />
                    <span className="text">{ing.nombre}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filtro 2: Año */}
          {carreraId && (
            <div className="modal__field">
              <label>Año</label>
              <div className="tag-group">
                {[1, 2, 3, 4, 5].map((a) => (
                  <button
                    key={a}
                    className={`animated-button ${anio === a ? "active" : ""}`}
                    onClick={() => {
                      setAnio(a === anio ? null : a);
                      setMateriaId(null);
                    }}
                  >
                    <span className="circle" />
                    <span className="text">{a}° Año</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filtro 3: Materia */}
          {carreraId && anio && (
            <div className="modal__field">
              <label>Materia</label>
              {loadingMaterias ? (
                <p className="modal__loading">Cargando materias...</p>
              ) : (
                <div className="tag-group">
                  {materias.map((mat) => (
                    <button
                      key={mat.id}
                      className={`animated-button ${materiaId === mat.id ? "active" : ""}`}
                      onClick={() => setMateriaId(mat.id === materiaId ? null : mat.id)}
                    >
                      <span className="circle" />
                      <span className="text">{mat.nombre}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

           {carreraId && anio && materiaId && (
            <div>
              <button
                className="button"
                onClick={handleBuscar}
                disabled={!materiaId}
              >
                <span>
                  <svg viewBox="0 0 24 24" height="24" width="24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.145 18.29c-5.042 0-9.145-4.102-9.145-9.145s4.103-9.145 9.145-9.145 9.145 4.103 9.145 9.145-4.102 9.145-9.145 9.145zm0-15.167c-3.321 0-6.022 2.702-6.022 6.022s2.702 6.022 6.022 6.022 6.023-2.702 6.023-6.022-2.702-6.022-6.023-6.022zm9.263 12.443c-.817 1.176-1.852 2.188-3.046 2.981l5.452 5.453 3.014-3.013-5.42-5.421z" />
                  </svg>
                </span>
              </button>
            </div>
          )}

        </div> 
      </div>   
    </>
  );
}