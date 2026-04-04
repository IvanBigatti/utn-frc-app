"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import FiltroPanel from "./FiltroPanel";
import "./foro.css";
import NuevoPostPanel from "./formForo";

type Post = {
  id: number;
  titulo: string;
  contenido: string;
  created_at: string;
  auth_user_id: string;
  ingenieria_id: number | null;
  anio: number | null;
  comision: { id: number; nombre: string } | null;
  materia: { id: number; nombre: string } | null;
};
export default function ForoPage() {
    const supabase = createClient();
    const router = useRouter();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtroOpen, setFiltroOpen] = useState(false);
    const [nuevoPostOpen, setNuevoPostOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);


    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUserId(session?.user?.id ?? null);
        });
    }, []);

    const handleEliminar = async (e: React.MouseEvent, postId: number) => {
        e.stopPropagation(); // evita que abra el detalle del post
        const confirmar = window.confirm("¿Seguro que querés eliminar esta publicación?");
        if (!confirmar) return;

        const { error } = await supabase.from("foro_post").delete().eq("id", postId);
        if (!error) setPosts((prev) => prev.filter((p) => p.id !== postId));
    };

    // Filtros activos (todos opcionales)
    const [filtros, setFiltros] = useState<{
        carreraId: number | null;
        anio: number | null;
        materiaId: number | null;
        comisionId: number | null;
    }>({ carreraId: null, anio: null, materiaId: null, comisionId: null });

    const hayFiltros = Object.values(filtros).some((v) => v !== null);

    useEffect(() => {
  const fetchPosts = async () => {
    setLoading(true);

    let query = supabase
      .from("foro_post")
      .select(`
        id, titulo, contenido, created_at, auth_user_id,
        ingenieria_id, anio,
        comision:comision_id ( id, nombre ),
        materia:materia_id ( id, nombre )
      `)
      .order("created_at", { ascending: false });

    if (filtros.carreraId) query = query.eq("ingenieria_id", filtros.carreraId);
    if (filtros.anio)       query = query.eq("anio", filtros.anio);
    if (filtros.materiaId)  query = query.eq("materia_id", filtros.materiaId);
    if (filtros.comisionId) query = query.eq("comision_id", filtros.comisionId);

    const { data, error } = await query;
    if (!error && data) setPosts(data as unknown as Post[]);
    setLoading(false);
  };

  fetchPosts();
}, [filtros]);
    return (
        <div className="foro-page">

            {/* Header */}
            <div className="foro-header">
                <div>
                    <h1 className="foro-header__title">Foro</h1>
                    <p className="foro-header__subtitle">
                        {hayFiltros ? `${posts.length} resultados con filtros aplicados` : `${posts.length} publicaciones`}
                    </p>
                </div>

                <div className="foro-header__actions">
                    <button
                        className={`foro-filtro-btn ${hayFiltros ? "active" : ""}`}
                        onClick={() => setFiltroOpen(true)}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="4" y1="6" x2="20" y2="6" />
                            <line x1="8" y1="12" x2="16" y2="12" />
                            <line x1="11" y1="18" x2="13" y2="18" />
                        </svg>
                        Filtrar
                        {hayFiltros && <span className="foro-filtro-btn__badge" />}
                    </button>

                    <button className="foro-nuevo-btn" onClick={() => setNuevoPostOpen(true)}>
                        + Publicar
                    </button>
                </div>
            </div>

            {/* Lista de posts */}
            {loading ? (
                <div className="foro-loading-state">Cargando publicaciones...</div>
            ) : posts.length === 0 ? (
                <div className="foro-empty">
                    <p>No hay publicaciones todavía.</p>
                    {hayFiltros && (
                        <button className="foro-limpiar" onClick={() => setFiltros({ carreraId: null, anio: null, materiaId: null, comisionId: null })}>
                            Limpiar filtros
                        </button>
                    )}
                </div>
            ) : (
                <div className="foro-list">
                    {posts.map((post) => (
                        <div key={post.id} className="foro-post-card" onClick={() => router.push(`/foro/${post.id}`)}>
                            <div className="foro-post-card__meta">
                                {post.materia?.nombre && (
                                    <span className="foro-post-card__tag">{post.materia.nombre}</span>
                                )}
                                {post.comision?.nombre && (
                                    <span className="foro-post-card__comision">Comisión {post.comision.nombre}</span>
                                )}

                                {/* Botón eliminar — solo para el autor */}
                                {userId === post.auth_user_id && (
                                    <button
                                        className="foro-post-card__eliminar"
                                        onClick={(e) => handleEliminar(e, post.id)}
                                    >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6l-1 14H6L5 6" />
                                            <path d="M10 11v6M14 11v6" />
                                            <path d="M9 6V4h6v2" />
                                        </svg>
                                        Eliminar
                                    </button>
                                )}
                            </div>

                            <h2 className="foro-post-card__titulo">{post.titulo}</h2>
                            <p className="foro-post-card__preview">
                                {post.contenido.length > 160 ? post.contenido.slice(0, 160) + "..." : post.contenido}
                            </p>
                            <span className="foro-post-card__fecha">
                                {new Date(post.created_at).toLocaleDateString("es-AR", {
                                    day: "numeric", month: "long", year: "numeric"
                                })}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Panel de filtros */}
            <FiltroPanel
                isOpen={filtroOpen}
                onClose={() => setFiltroOpen(false)}
                filtros={filtros}
                onChange={setFiltros}
            />

            <NuevoPostPanel
                isOpen={nuevoPostOpen}
                onClose={() => setNuevoPostOpen(false)}
                onPostCreado={() => {
                    setNuevoPostOpen(false);
                    // Re-fetch posts
                    setFiltros({ ...filtros });
                }}
            />
        </div>
    );
}