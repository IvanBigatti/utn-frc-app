"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supaBaseClient.js";
import "./SearchModal.css"

// ─── Tipos ─────────────────────────────────────────────────────────────────
type Ingenieria = { id: number; nombre: string };
type Materia = { id: number; nombre: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

// ─── Componente ────────────────────────────────────────────────────────────
export default function SearchModal({ isOpen, onClose }: Props) {
  const router = useRouter();
  const [ingenierias, setIngenierias] = useState<Ingenieria[]>([]);
  const [materias, setMaterias] = useState<Materia[]>([]);

  const [carreraId, setCarreraId] = useState<number | null>(null);
  const [materiaId, setMateriaId] = useState<number | null>(null);
  const [anio, setAnio] = useState<number | null>(null);

  const [loadingIngenierias, setLoadingIngenierias] = useState(false);
  const [loadingMaterias, setLoadingMaterias] = useState(false);

  // ── Cargar ingenierías al abrir el modal ──────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const fetchIngenierias = async () => {
      setLoadingIngenierias(true);

      const { data, error } = await supabase
        .from("ingenieria")
        .select("id, nombre")
        .order("nombre");

      console.log("Ingenierías:", data);
      console.log("Error ingenierías:", error);

      if (!error && data) setIngenierias(data);
      setLoadingIngenierias(false);
    };

    fetchIngenierias();
  }, [isOpen]);

  // ── Cargar materias cuando cambia la carrera ──────────────────────────────
useEffect(() => {
  // Ahora necesita AMBOS: carreraId y anio
  if (!carreraId || !anio) {
    setMaterias([]);
    return;
  }

  const fetchMaterias = async () => {
    setLoadingMaterias(true);

    // Paso 1: comisiones filtradas por ingeniería Y año
    const { data: comisiones } = await supabase
      .from("comision")
      .select("id")
      .eq("ingenieria_id", carreraId)
      .eq("año", anio); // ← filtro extra

    if (!comisiones || comisiones.length === 0) {
      setMaterias([]);
      setLoadingMaterias(false);
      return;
    }

    const idsComisiones = comisiones.map((c) => c.id);

    // Paso 2: materias de esas comisiones
    const { data: relaciones } = await supabase
      .from("ComisionMaterias")
      .select("idComision, materia(id, nombre)")
      .in("idComision", idsComisiones);

    if (!relaciones) {
      setMaterias([]);
      setLoadingMaterias(false);
      return;
    }

    const todasLasMaterias = relaciones
      .map((r: any) => r.materia)
      .filter(Boolean);

    const unicas = Array.from(
      new Map(todasLasMaterias.map((m: Materia) => [m.id, m])).values()
    ) as Materia[];

    setMaterias(unicas.sort((a, b) => a.nombre.localeCompare(b.nombre)));
    setLoadingMaterias(false);
  };

  fetchMaterias();
}, [carreraId, anio]); // ← depende de ambos ahora

  // ── Cerrar y resetear ─────────────────────────────────────────────────────
  const handleClose = () => {
    setCarreraId(null);
    setMateriaId(null);
    setAnio(null);
    setMaterias([]);
    onClose();
  };

  const handleBuscar = () => {
    if (!materiaId) return;
    router.push(`/resultados?materia_id=${materiaId}&carrera_id=${carreraId}&anio=${anio}`);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <>

      {/* Fondo oscuro */}
      <div className="overlay" onClick={handleClose} />

      {/* Ventana */}
      <div className="modal">
        <div className="modal__header">
          <h2>Buscar material</h2>
          <button className="modal__close" onClick={handleClose}>✕</button>
        </div>

        <div className="modal__fields">

          {/* Filtro 1: Ingeniería */}
          <div className="modal__field">
            <label>Carrera</label>
            <select
              value={carreraId ?? ""}
              onChange={(e) => {
                setCarreraId(Number(e.target.value) || null);
                setMateriaId(null);
                setAnio(null);
              }}
            >
              <option value="">
                {loadingIngenierias ? "Cargando..." : "Seleccioná una carrera"}
              </option>
              {ingenierias.map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro 2: Año (aparece al elegir carrera) */}
        {carreraId && (
        <div className="modal__field">
            <label>Año</label>
            <select
            value={anio ?? ""}
            onChange={(e) => {
                setAnio(Number(e.target.value) || null);
                setMateriaId(null); // resetea materia al cambiar año
            }}
            >
            <option value="">Seleccioná el año</option>
            {[1, 2, 3, 4, 5].map((a) => (
                <option key={a} value={a}>{a}° Año</option>
            ))}
            </select>
        </div>
        )}

        {/* Filtro 3: Materia (aparece solo cuando hay carrera Y año) */}
        {carreraId && anio && (
        <div className="modal__field">
            <label>Materia</label>
            <select
            value={materiaId ?? ""}
            onChange={(e) => setMateriaId(Number(e.target.value) || null)}
            disabled={loadingMaterias}
            >
            <option value="">
                {loadingMaterias ? "Cargando materias..." : "Seleccioná una materia"}
            </option>
            {materias.map((mat) => (
                <option key={mat.id} value={mat.id}>
                {mat.nombre}
                </option>
            ))}
            </select>
        </div>
        )}

        </div>

        {/* Botón buscar */}
        <button
          className="modal__btn"
          onClick={handleBuscar}
          disabled={!materiaId}
        >
          Buscar
        </button>
      </div>
    </>
  );
}