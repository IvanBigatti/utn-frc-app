"use client";

import { useState, useEffect } from "react";
import SearchModal from "../SearchModal/SearchModal";
import "./SearchButton.css";
import { supabase } from "@/app/lib/supaBaseClient.js";

export default function SearchButton() {
  const [modalOpen, setModalOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [materiasBasicas, setMateriasBasicas] = useState<{ id: number, nombre: string }[]>([]);

  useEffect(() => {
    const fetchMateriasBasicas = async () => {
      const { data, error } = await supabase
        .from("materia")
        .select("id, nombre")
        .eq("tipo", true)    // true = básica
        .order("nombre");

      if (!error && data) setMateriasBasicas(data);
    };

    fetchMateriasBasicas();
  }, []);

  return (
    <>


      <section className="search-hero">
        {/* Título */}
        <h1 className="search-hero__title">
          Encontrá el material<br />
          que <span>necesitás</span>
        </h1>
        <p className="search-hero__subtitle">
          Buscá resúmenes y archivos por carrera, año y materia de la UTN.
        </p>

        {/* Botón principal */}
        <button
          className="animated-button"
          onClick={() => setModalOpen(true)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="arr-2" viewBox="0 0 24 24">
            <path
              d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"
            ></path>
          </svg>
          <span className="text">BUSCAR MATERIAL</span>
          <span className="circle"></span>
          <svg xmlns="http://www.w3.org/2000/svg" className="arr-1" viewBox="0 0 24 24">
            <path
              d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"
            ></path>
          </svg>
        </button>

        {/* Hint */}
        <p className="search-hero__hint">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Filtrá por carrera, año y materia
        </p>

        {/* Tags de búsqueda rápida */}
        <div className="search-hero__tags">
          {materiasBasicas.map((materiasBasicas) => (
            <button
              key={materiasBasicas.id}
              className="search-hero__tag"
              onClick={() => setModalOpen(true)}
            >
              {materiasBasicas.nombre}
            </button>
          ))}
        </div>
      </section>

      <SearchModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}