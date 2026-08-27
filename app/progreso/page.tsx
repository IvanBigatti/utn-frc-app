"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/app/lib/supabase/client";
import "./progreso.css";

const supabase = createClient();

type Ingenieria = {
  id: number;
  nombre: string;
  // `numeric` de Postgres llega como STRING en supabase-js (no pierde
  // precisión). Se castea con Number() antes de usarlo en cualquier cuenta.
  electivas_modo: string | null;
  electivas_requeridas: string | number | null;
};
type MateriaConAnio = {
  id: number;
  nombre: string;
  anio: number;
  horas_semanales: number;
  es_electiva: boolean;
  creditos: number | null;
};
type RelacionComisionMateria = {
  idMateria: number;
  idComision: number;
  materia: {
    id: number;
    nombre: string;
    horas_semanales: number | null;
    es_electiva: boolean | null;
    creditos: number | null;
  } | null;
};

// Cómo acredita electivas cada carrera. Solo Sistemas tiene régimen cargado
// hoy; el resto queda en `electivas_modo = null` y la tarjeta se muestra sin
// denominador en vez de inventar un requisito.
const UNIDAD_ELECTIVAS: Record<
  string,
  { valor: (m: MateriaConAnio) => number; singular: string; plural: string }
> = {
  creditos: { valor: m => m.creditos ?? 0, singular: "crédito", plural: "créditos" },
  cantidad: { valor: () => 1, singular: "electiva", plural: "electivas" },
  horas: { valor: m => m.horas_semanales, singular: "hora", plural: "horas" },
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
  const [error, setError] = useState<string | null>(null);

  // Obtener usuario
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, []);

  // Cargar ingenierías
  useEffect(() => {
    supabase.from("ingenieria").select("id, nombre, electivas_modo, electivas_requeridas").order("nombre")
      .then(({ data }) => { if (data) setIngenierias(data); });
  }, []);

  // Cargar materias agrupadas por año
  useEffect(() => {
    if (!carreraId) { setMateriasPorAnio(new Map()); setError(null); return; }

    // Sin cancelación, tocar dos carreras seguidas deja que la respuesta lenta
    // de la primera pise el estado de la segunda: materias de Química con el
    // progreso de Sistemas. El abort corta eso de raíz.
    const ac = new AbortController();

    // Una rama de error que deja el estado viejo en pie es peor que no tener
    // manejo de error: el panel de stats seguiría mostrando los números de la
    // carrera anterior bajo la carrera nueva.
    const fallar = (mensaje: string) => {
      setError(mensaje);
      setMateriasPorAnio(new Map());
      setProgreso(new Map());
      setLoading(false);
    };

    const cargar = async () => {
      setLoading(true);
      setError(null);

      // Traer todas las comisiones de la ingeniería
      const { data: comisionesRaw, error: errComisiones } = await supabase
        .from("comision")
        .select("id, año")
        .eq("ingenieria_id", carreraId)
        .abortSignal(ac.signal);

      if (ac.signal.aborted) return;
      if (errComisiones) {
        fallar("No pudimos cargar las materias de esta carrera. Probá de nuevo.");
        return;
      }

      const comisiones = comisionesRaw as unknown as { id: number; año: number }[] | null;
      if (!comisiones?.length) { setMateriasPorAnio(new Map()); setLoading(false); return; }

      // Traer relaciones comision-materia
      const { data: relsRaw, error: errRels } = await supabase
        .from("ComisionMaterias")
        .select("idMateria, idComision, materia(id, nombre, horas_semanales, es_electiva, creditos)")
        .in("idComision", comisiones.map(c => c.id))
        .abortSignal(ac.signal);

      if (ac.signal.aborted) return;
      if (errRels) {
        fallar("No pudimos cargar las materias de esta carrera. Probá de nuevo.");
        return;
      }

      const rels = relsRaw as unknown as RelacionComisionMateria[] | null;
      if (!rels) { setMateriasPorAnio(new Map()); setLoading(false); return; }

      // Una materia puede vivir en comisiones de años distintos: la electiva
      // "Seguridad en el Desarrollo de Software" se dicta en 4to y en 5to, e
      // Inglés I aparece en 1ro y 2do de Civil y Eléctrica.
      //
      // Antes ganaba "la primera comisión que apareciera" en el resultado, pero
      // Postgres no garantiza orden sin ORDER BY: el año que veía el alumno
      // podía cambiar entre recargas. Ahora gana el MENOR, que es
      // determinístico y es el año en que la materia entra al plan.
      const anioPorComision = new Map(comisiones.map(c => [c.id, c.año]));

      const materiaAnioMap = new Map<number, Omit<MateriaConAnio, "id">>();
      for (const rel of rels) {
        if (!rel.materia) continue;
        const anio = anioPorComision.get(rel.idComision);
        if (anio === undefined) continue;

        const yaVista = materiaAnioMap.get(rel.materia.id);
        if (yaVista) {
          yaVista.anio = Math.min(yaVista.anio, anio);
          continue;
        }
        materiaAnioMap.set(rel.materia.id, {
          nombre: rel.materia.nombre,
          anio,
          horas_semanales: rel.materia.horas_semanales ?? 0,
          es_electiva: rel.materia.es_electiva ?? false,
          creditos: rel.materia.creditos,
        });
      }

      // Agrupar por año
      const porAnio = new Map<number, MateriaConAnio[]>();
      for (const [id, datos] of materiaAnioMap) {
        if (!porAnio.has(datos.anio)) porAnio.set(datos.anio, []);
        porAnio.get(datos.anio)!.push({ id, ...datos });
      }

      // Ordenar materias dentro de cada año
      for (const [anio, mats] of porAnio) {
        porAnio.set(anio, mats.sort((a, b) => a.nombre.localeCompare(b.nombre)));
      }

      setMateriasPorAnio(porAnio);
      setLoading(false);
    };

    cargar();
    return () => ac.abort();
  }, [carreraId]);


  // Total de horas obligatorias de la carrera.
  // Las electivas quedan afuera: el alumno cursa solo algunas, así que
  // sumarlas todas inflaría el denominador y hundiría el porcentaje.
  // horas_semanales ya viene en materiasPorAnio — no hace falta ir a la base.
  useEffect(() => {
    const total = Array.from(materiasPorAnio.values())
      .flat()
      .filter(m => !m.es_electiva)
      .reduce((acc, m) => acc + m.horas_semanales, 0);

    setTotalHoras(total);
  }, [materiasPorAnio]);

  //cargar progreso del usuario
  useEffect(() => {
    if (!userId || !carreraId) { setProgreso(new Map()); return; }

    const ac = new AbortController();

    const cargar = async () => {
      const { data, error: errProgreso } = await supabase
        .from("progreso")
        .select("materia_id, nota")
        .eq("auth_user_id", userId)
        .eq("ingenieria_id", carreraId)
        .abortSignal(ac.signal);

      if (ac.signal.aborted) return;
      if (errProgreso) {
        setError("No pudimos cargar tu progreso. Probá de nuevo.");
        setProgreso(new Map());
        return;
      }

      if (data) {
        const map = new Map<number, number | null>();
        for (const item of data) map.set(item.materia_id, item.nota);
        setProgreso(map);
      }
    };

    cargar();
    return () => ac.abort();
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
  // El avance se mide solo sobre las materias obligatorias, tanto en el
  // numerador como en el denominador. Si las electivas contaran como
  // aprobadas pero no en el total, el anillo podría pasar el 100% y
  // horasRestantes daría negativo.
  const todasLasMaterias = Array.from(materiasPorAnio.values()).flat();
  const obligatorias = todasLasMaterias.filter(m => !m.es_electiva);
  const materiasRendidas = Array.from(progreso.keys());
  const notas = materiasRendidas.map(id => progreso.get(id)).filter((n): n is number => n !== null && n !== undefined);
  const promedio = notas.length > 0 ? (notas.reduce((a, b) => a + b, 0) / notas.length) : 0;
  const obligatoriasRendidas = obligatorias.filter(m => progreso.has(m.id));
  const porcentaje = obligatorias.length > 0 ? (obligatoriasRendidas.length / obligatorias.length) * 100 : 0;
  // `.sort()` a secas compara como texto: con un 10° año daría 1, 10, 2...
  const aniosOrdenados = Array.from(materiasPorAnio.keys()).sort((a, b) => a - b);
  const horasAprobadas = obligatoriasRendidas
    .reduce((acc, m) => acc + m.horas_semanales, 0);

  const horasRestantes = totalHoras - horasAprobadas;

  // Las electivas se listan y se pueden marcar como rendidas, pero no entran
  // en ningún total: todavía no está claro cómo se acreditan en cada carrera.
  const electivas = todasLasMaterias.filter(m => m.es_electiva);
  const electivasAprobadas = electivas.filter(m => progreso.has(m.id));

  // Régimen de electivas de la carrera elegida. Si la carrera no lo tiene
  // cargado (`electivas_modo = null`), NO se inventa un denominador: se
  // muestra un contador a secas. Un requisito inventado es peor que ninguno,
  // porque el alumno lo toma por cierto.
  const carreraElegida = ingenierias.find(i => i.id === carreraId);
  const regimenElectivas = carreraElegida?.electivas_modo
    ? UNIDAD_ELECTIVAS[carreraElegida.electivas_modo] ?? null
    : null;
  // `numeric` viaja como string desde Postgres: sin Number() la resta de
  // "créditos restantes" daría NaN.
  const electivasRequeridas =
    carreraElegida?.electivas_requeridas != null
      ? Number(carreraElegida.electivas_requeridas)
      : null;

  const hayRequisitoElectivas =
    regimenElectivas !== null &&
    electivasRequeridas !== null &&
    Number.isFinite(electivasRequeridas) &&
    electivasRequeridas > 0;

  const electivasAcreditadas = regimenElectivas
    ? electivasAprobadas.reduce((acc, m) => acc + regimenElectivas.valor(m), 0)
    : 0;

  // Las unidades no caen justo: 7 electivas de 3 créditos dan 21 sobre 20
  // exigidos. La barra clampea al 100% y lo que falta nunca es negativo.
  const pctElectivas = hayRequisitoElectivas
    ? Math.min(100, (electivasAcreditadas / electivasRequeridas!) * 100)
    : 0;
  const electivasFaltantes = hayRequisitoElectivas
    ? Math.max(0, electivasRequeridas! - electivasAcreditadas)
    : 0;

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
        {error ? (
          <p className="progreso-error" role="alert">{error}</p>
        ) : loading ? (
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
                          {mat.es_electiva && (
                            <span
                              className="progreso-electiva-badge"
                              title="Electiva: no cuenta para el total de horas obligatorias">
                              Electiva
                            </span>
                          )}
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
        {!carreraId || error ? (
          <div className="progreso-stats__empty">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.25 }} aria-hidden="true">
              <path d="M18 20V10M12 20V4M6 20v-6" />
            </svg>
            <p className="progreso-stats__empty-title">
              {error ? "No pudimos cargar tus datos" : "Elegí una carrera"}
            </p>
            <p className="progreso-stats__empty-body">
              {error
                ? "Recargá la página para volver a intentarlo."
                : "Vas a ver tu promedio, el porcentaje de carrera completada y el progreso por año."}
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
              <p className="progreso-card__label">Carrera completada (materias)</p>
              <p className="progreso-card__value">{Math.round(porcentaje)}%</p>
              <p className="progreso-card__sub">
                {obligatoriasRendidas.length} de {obligatorias.length} materias obligatorias
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
        {totalHoras > 0 ? `${horasRestantes}h` : "0h"}
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

  <p className="progreso-card__sub">
    de {totalHoras}h semanales obligatorias
  </p>
</div>

            {/* Electivas — se acreditan aparte, no suman al avance de la carrera */}
            {electivas.length > 0 && (
              <div className="progreso-card">
                <p className="progreso-card__label">Electivas</p>

                {hayRequisitoElectivas ? (
                  <>
                    <p className="progreso-card__value">
                      {electivasAcreditadas}
                      <span className="progreso-card__value-sep">/{electivasRequeridas}</span>
                      <span className="progreso-card__value-unit">
                        {regimenElectivas!.plural}
                      </span>
                    </p>
                    <p className="progreso-card__sub">
                      {electivasFaltantes === 0
                        ? `Requisito cumplido — ${electivasAprobadas.length} de ${electivas.length} electivas`
                        : `Te ${electivasFaltantes === 1 ? "falta" : "faltan"} ${electivasFaltantes} ${
                            electivasFaltantes === 1
                              ? regimenElectivas!.singular
                              : regimenElectivas!.plural
                          }`}
                    </p>
                    <div className="progreso-bar">
                      <div
                        className="progreso-bar__fill"
                        style={{ transform: `scaleX(${pctElectivas / 100})` }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="progreso-card__value">
                      {electivasAprobadas.length}
                      <span className="progreso-card__value-sep">/{electivas.length}</span>
                    </p>
                    <p className="progreso-card__sub">
                      Todavía no tenemos cargado cuántas electivas exige esta carrera,
                      así que no podemos mostrarte cuánto te falta.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Progreso por año */}
            <div className="progreso-card">
              <p className="progreso-card__label">Por año</p>
              <div className="progreso-por-anio">
                {aniosOrdenados.map(anio => {
                  // Solo obligatorias, igual que "Carrera completada". Las
                  // electivas no son avance del año: se acreditan aparte, por
                  // créditos, y no pertenecen a un año en particular.
                  const mats = materiasPorAnio.get(anio)!.filter(m => !m.es_electiva);
                  if (mats.length === 0) return null;
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