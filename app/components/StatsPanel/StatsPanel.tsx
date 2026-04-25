import Link from "next/link";
import { createClient } from "@/app/lib/supabase/server";
import { signInWithGoogle } from "@/app/actions/auth";
import "./StatsPanel.css";

type StatCardProps = { label: string; value: string | number; sub?: string };
type AnioData = { anio: number; total: number; completadas: number };

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="sp-card">
      <p className="sp-card__label">{label}</p>
      <p className="sp-card__value">{value}</p>
      {sub && <p className="sp-card__sub">{sub}</p>}
    </div>
  );
}

function DonutCard({ pct, done, total }: { pct: number; done: number; total: number }) {
  const r = 38;
  const circumference = 2 * Math.PI * r;
  const dash = circumference * pct / 100;

  return (
    <div className="sp-card">
      <p className="sp-card__label">Avance de carrera</p>
      <div className="sp-donut-wrapper">
        <svg viewBox="0 0 100 100" className="sp-donut">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#f0f0ee" strokeWidth="12" />
          <circle cx="50" cy="50" r={r} fill="none" stroke="#1f387e" strokeWidth="12"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
          <text x="50" y="50" textAnchor="middle" dominantBaseline="central"
            fontSize="16" fontWeight="700" fill="#1f387e">
            {pct}%
          </text>
        </svg>
      </div>
      <p className="sp-card__sub">{done} de {total} materias</p>
    </div>
  );
}

function PorAnioCard({ anios }: { anios: AnioData[] }) {
  return (
    <div className="sp-card">
      <p className="sp-card__label">Por año</p>
      <div className="sp-anio-list">
        {anios.map(({ anio, total, completadas }) => {
          const pct = total > 0 ? Math.round((completadas / total) * 100) : 0;
          return (
            <div key={anio} className="sp-anio-row">
              <span className="sp-anio-label">{anio}°</span>
              <div className="sp-bar">
                <div className="sp-bar__fill" style={{ transform: `scaleX(${pct / 100})` }} />
              </div>
              <span className="sp-anio-count">{completadas}/{total}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const PLACEHOLDER_ANIOS: AnioData[] = [
  { anio: 1, total: 6, completadas: 6 },
  { anio: 2, total: 7, completadas: 5 },
  { anio: 3, total: 7, completadas: 4 },
  { anio: 4, total: 5, completadas: 2 },
  { anio: 5, total: 3, completadas: 1 },
];

function PlaceholderStats() {
  return (
    <div className="sp-blur-wrapper">
      <div className="sp-blur-content" aria-hidden>
        <div className="sp-grid">
          <StatCard label="Promedio" value="8.50" sub="5 materias con nota" />
          <StatCard label="Horas cursadas" value="320h" sub="acumuladas" />
          <StatCard label="Horas que faltan" value="180h" sub="carrera principal" />
          <StatCard label="Electivas" value="3" sub="materias aprobadas" />
        </div>
        <div className="sp-charts-row">
          <DonutCard pct={64} done={18} total={28} />
          <PorAnioCard anios={PLACEHOLDER_ANIOS} />
        </div>
      </div>
      <div className="sp-overlay">
        <p className="sp-overlay__text">Iniciá sesión para ver tus estadísticas</p>
        <form action={signInWithGoogle}>
          <button type="submit" className="sp-google-btn">
            <GoogleIcon />
            Continuar con Google
          </button>
        </form>
      </div>
    </div>
  );
}

export default async function StatsPanel() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <aside className="stats-panel">
        <h2 className="stats-panel__title">Tu progreso</h2>
        <PlaceholderStats />
      </aside>
    );
  }

  const { data: progreso } = await supabase
    .from("progreso")
    .select("materia_id, nota, ingenieria_id")
    .eq("auth_user_id", user.id);

  if (!progreso?.length) {
    return (
      <aside className="stats-panel">
        <h2 className="stats-panel__title">Tu progreso</h2>
        <div className="sp-empty">
          <p>Todavía no registraste materias cursadas.</p>
          <Link href="/progreso" className="sp-empty__link">Ir a Progreso →</Link>
        </div>
      </aside>
    );
  }

  // Carrera con más materias registradas
  const carreraCount = new Map<number, number>();
  for (const p of progreso) {
    carreraCount.set(p.ingenieria_id, (carreraCount.get(p.ingenieria_id) ?? 0) + 1);
  }
  const mainCarreraId = [...carreraCount.entries()].sort((a, b) => b[1] - a[1])[0][0];

  // Info de materias del usuario (horas + tipo)
  const materiaIds = [...new Set(progreso.map(p => p.materia_id))];
  const { data: materias } = await supabase
    .from("materia")
    .select("id, horas_semanales, tipo")
    .in("id", materiaIds);

  const materiaMap = new Map((materias ?? []).map(m => [m.id, m]));

  let horasCursadas = 0;
  let puntosElectivas = 0;
  for (const p of progreso) {
    const mat = materiaMap.get(p.materia_id);
    if (!mat) continue;
    horasCursadas += mat.horas_semanales ?? 0;
    if (mat.tipo === false) puntosElectivas += 1;
  }

  const notas = progreso.map(p => p.nota).filter((n): n is number => n !== null);
  const promedio = notas.length
    ? (notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(2)
    : "—";

  // Carrera principal: materias con año, horas que faltan, avance
  let horasQueFaltan = 0;
  let totalMaterias = 0;
  const anioGroups = new Map<number, { total: number; completadas: number }>();

  const completedInCarrera = new Set(
    progreso.filter(p => p.ingenieria_id === mainCarreraId).map(p => p.materia_id)
  );

  const { data: comisionesRaw } = await supabase
    .from("comision")
    .select("id, año")
    .eq("ingenieria_id", mainCarreraId);
  const comisiones = comisionesRaw as unknown as { id: number; año: number }[] | null;

  if (comisiones?.length) {
    const comisionAnioMap = new Map<number, number>(
      comisiones.map(c => [c.id, c.año])
    );

    const { data: rels } = await supabase
      .from("ComisionMaterias")
      .select("idMateria, idComision")
      .in("idComision", comisiones.map(c => c.id));

    // Materia → año (primera comisión que aparezca)
    const materiaAnioMap = new Map<number, number>();
    for (const rel of rels ?? []) {
      if (!materiaAnioMap.has(rel.idMateria)) {
        const anio = comisionAnioMap.get(rel.idComision);
        if (anio !== undefined) materiaAnioMap.set(rel.idMateria, anio);
      }
    }

    const carreraMateriaIds = [...materiaAnioMap.keys()];
    totalMaterias = carreraMateriaIds.length;

    const { data: carreraMaterias } = await supabase
      .from("materia")
      .select("id, horas_semanales")
      .in("id", carreraMateriaIds);

    for (const m of carreraMaterias ?? []) {
      const anio = materiaAnioMap.get(m.id) ?? 0;
      const isCompleted = completedInCarrera.has(m.id);

      if (!anioGroups.has(anio)) anioGroups.set(anio, { total: 0, completadas: 0 });
      const group = anioGroups.get(anio)!;
      group.total += 1;
      if (isCompleted) group.completadas += 1;

      if (!isCompleted) horasQueFaltan += m.horas_semanales ?? 0;
    }
  }

  const materiasCompletadas = completedInCarrera.size;
  const porcentaje = totalMaterias > 0 ? Math.round((materiasCompletadas / totalMaterias) * 100) : 0;

  const anioData: AnioData[] = [...anioGroups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([anio, { total, completadas }]) => ({ anio, total, completadas }));

  return (
    <aside className="stats-panel">
      <h2 className="stats-panel__title">Tu progreso</h2>
      <div className="sp-grid">
        <StatCard label="Promedio" value={promedio} sub={`${notas.length} ${notas.length === 1 ? "materia" : "materias"} con nota`} />
        <StatCard label="Horas cursadas" value={`${horasCursadas}h`} sub="acumuladas" />
        <StatCard label="Horas que faltan" value={`${horasQueFaltan}h`} sub="carrera principal" />
        <StatCard label="Electivas" value={puntosElectivas} sub="materias aprobadas" />
      </div>
      <div className="sp-charts-row">
        <DonutCard pct={porcentaje} done={materiasCompletadas} total={totalMaterias} />
        <PorAnioCard anios={anioData} />
      </div>
      <Link href="/progreso" className="sp-link">Ver progreso completo →</Link>
    </aside>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
