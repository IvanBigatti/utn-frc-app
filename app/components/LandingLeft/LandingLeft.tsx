"use client";

import { useState } from "react";
import Link from "next/link";
import SearchModal from "../SearchModal/SearchModal";
import "./LandingLeft.css";

export default function LandingLeft() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <section className="landing-left">
        <div className="landing-left__brand">
          <span className="landing-left__logo">TUTN</span>
          <p className="landing-left__tagline">
            Todo lo que necesitás para tu carrera en un solo lugar.
          </p>
        </div>

        <div className="landing-left__actions">
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

          <Link href="/foro" className="landing-left__secondary-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Foro
          </Link>

          <Link href="/armadorHorarios" className="landing-left__secondary-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Armador de Horarios
          </Link>
        </div>
      </section>

      <SearchModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
