"use client";

import { useState, useEffect } from "react";
import SearchModal from "../SearchModal/SearchModal";
import "./SearchButton.css";
import { supabase } from "@/app/lib/supaBaseClient.js";
import Link from "next/link";

export default function SearchButton() {
  const [modalOpen, setModalOpen] = useState(false);
  const [materiasBasicas, setMateriasBasicas] = useState<{ id: number, nombre: string }[]>([]);
  const [totalArchivos, setTotalArchivos] = useState(0)

  useEffect(() => {
    const fetchMateriasBasicas = async () => {
      const { data, error } = await supabase
        .from("materia")
        .select("id, nombre")
        .eq("tipo", true)
        .order("nombre");
      if (!error && data) setMateriasBasicas(data);
    };
    fetchMateriasBasicas();
  }, []);


  //funcion contador de archivos totales
  useEffect(()=> {
    const fetchTotalArchivos = async () => {
      const res = await supabase.from("archivos").select("id")
      const data = res.data
      console.log("Total archivos:",data?.length)
      setTotalArchivos(data?.length)
    }

    fetchTotalArchivos()
  }, [])

  return (
    <>
      <section className="search-hero">
        <h1 className="search-hero__title">
          Encontrá el material<br />
          que <span>necesitás</span>
        </h1>
        <p className="search-hero__subtitle">
          Buscá resúmenes y archivos por carrera, año y materia de la UTN.
        </p>

        <button className="animated-button" onClick={() => setModalOpen(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" className="arr-2" viewBox="0 0 24 24">
            <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
          </svg>
          <span className="text">BUSCAR MATERIAL</span>
          <span className="circle"></span>
          <svg xmlns="http://www.w3.org/2000/svg" className="arr-1" viewBox="0 0 24 24">
            <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z" />
          </svg>
        </button>

        <p className="search-hero__hint">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Filtrá por carrera, año y materia
        </p>

        <div className="search-hero__tags">
          {materiasBasicas.map((mat) => (
            <button
              key={mat.id}
              className="search-hero__tag"
              onClick={() => setModalOpen(true)}
            >
              {mat.nombre}
            </button>
          ))}
        </div>
      </section>

      {/* ── Cartas ────────────────────────────────────── */}
      <section className="features">
        <div className="features__card">
          <div className="features__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h3 className="features__title">Apuntes</h3>
          <p className="features__desc">Accedé a resúmenes y apuntes subidos por estudiantes de cada materia de todas las ingenierias.</p>
        </div>

        <Link href="/foro" className="features__card">
          <div className="features__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h3 className="features__title">Foro</h3>
          <p className="features__desc">Consulta y comparte las experiencias de las materias que cursaste en distintas comisiones.</p>
        </Link>

        <div className="features__card">
          <div className="features__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <circle cx="8" cy="15" r="1" fill="currentColor" />
              <circle cx="12" cy="15" r="1" fill="currentColor" />
              <circle cx="16" cy="15" r="1" fill="currentColor" />
            </svg>
          </div>
          <h3 className="features__title">Armador de Horarios</h3>
          <p className="features__desc">Arma tu horario de manera dinamica y sencilla en nuestro Armador.</p>
        </div>
      </section>

      

      <SearchModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}