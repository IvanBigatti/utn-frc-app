-- ============================================================
-- Cierre de tres fugas de datos de usuarios
--
-- 1. `get_user_display_names` devolvía la parte local del email
-- 2. El `auth_user_id` de posts y comentarios anónimos era legible
-- 3. El registro de votos de cada usuario era público
--
-- Los tres eran alcanzables por el rol `anon`, o sea sin iniciar sesión.
-- Verificado con `SET ROLE anon` contra la base real antes de escribir esto.
-- ============================================================

BEGIN;

-- ---------- Guardas ----------
DO $guard$
DECLARE v int;
BEGIN
  SELECT count(*) INTO v FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='get_user_display_names';
  IF v <> 1 THEN RAISE EXCEPTION 'No existe public.get_user_display_names'; END IF;

  IF to_regclass('public.foro_post_summary') IS NULL THEN
    RAISE EXCEPTION 'No existe la vista public.foro_post_summary';
  END IF;
END $guard$;


-- ============================================================
-- 1. get_user_display_names: dejar de leer auth.users
-- ============================================================
-- Antes: COALESCE(p.username, split_part(au.email, '@', 1)).
-- Ese fallback publicaba la parte local del mail de todo usuario sin
-- username — 11 de 15 al momento de escribir esto — a cualquiera que
-- tuviera su UUID, y los UUID se cosechan de las tablas públicas.
--
-- Ahora sale de `profiles`, que ya es de lectura pública, y nunca toca
-- auth.users. Por eso puede pasar a SECURITY INVOKER: deja de correr con
-- privilegios del dueño y respeta la RLS de quien la llama.
--
-- Se maneja desde `unnest(user_ids)` para devolver una fila por cada id
-- pedido, incluso los que no tienen perfil. El cliente ya usa 'usuario'
-- como valor por defecto (app/foro/page.tsx), así que el texto coincide.
CREATE OR REPLACE FUNCTION public.get_user_display_names(user_ids uuid[])
 RETURNS TABLE(id uuid, display_name text)
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT u.id, COALESCE(p.username, 'usuario') AS display_name
  FROM unnest(user_ids) AS u(id)
  LEFT JOIN public.profiles p ON p.id = u.id;
$function$;


-- ============================================================
-- 2. Anonimato real en foro_post y foro_comment
-- ============================================================
-- La vista `foro_post_summary` YA anulaba el autor anónimo:
--     CASE WHEN p.anonimo THEN NULL::uuid ELSE p.auth_user_id END
-- El problema era que la tabla base también se podía leer directo, con
-- policy `USING (true)`, así que alcanzaba con saltear la vista.
--
-- No se revocan privilegios sobre las tablas: en PostgreSQL un
-- `DELETE ... WHERE auth_user_id = ...` necesita permiso de SELECT sobre
-- esa columna, así que revocar rompería el borrado del propio post.
--
-- En su lugar se oculta la FILA anónima en la tabla base, y las vistas
-- pasan a SECURITY DEFINER para poder seguir mostrándola con el autor en
-- NULL. Resultado: el contenido anónimo se sigue viendo, el autor no.
-- El dueño sigue viendo su propia fila en la tabla base, que es lo que
-- necesitan el borrado propio y el contador del perfil.

ALTER VIEW public.foro_post_summary SET (security_invoker = false);

DROP POLICY IF EXISTS "Lectura pública posts" ON public.foro_post;
CREATE POLICY "Lectura pública posts" ON public.foro_post
  FOR SELECT USING (NOT anonimo OR auth_user_id = auth.uid());

-- Los comentarios no tenían vista equivalente: se lee la tabla directo.
CREATE OR REPLACE VIEW public.foro_comment_summary
WITH (security_invoker = false) AS
  SELECT c.id,
         c.post_id,
         CASE WHEN c.anonimo THEN NULL::uuid ELSE c.auth_user_id END AS auth_user_id,
         c.contenido,
         c.anonimo,
         c.created_at
    FROM public.foro_comment c;

GRANT SELECT ON public.foro_comment_summary TO anon, authenticated;

DROP POLICY IF EXISTS comments_read ON public.foro_comment;
CREATE POLICY comments_read ON public.foro_comment
  FOR SELECT USING (NOT anonimo OR auth_user_id = auth.uid());


-- ============================================================
-- 3. El registro de votos deja de ser público
-- ============================================================
-- `foro_vote` exponía auth_user_id + post_id + value con policy `true`:
-- cualquiera podía reconstruir a qué le puso like cada usuario.
--
-- No rompe el contador: `vote_score` sale de `foro_post_summary`, que
-- ahora es SECURITY DEFINER y suma los votos salteando la RLS. La app
-- sólo consulta foro_vote filtrando por su propio usuario
-- (app/foro/page.tsx y app/perfil/page.tsx), así que sigue funcionando.
DROP POLICY IF EXISTS votes_read ON public.foro_vote;
CREATE POLICY votes_read ON public.foro_vote
  FOR SELECT USING (auth.uid() = auth_user_id);


-- ---------- Verificación ----------
DO $verif$
DECLARE v int; v_def boolean;
BEGIN
  -- la función ya no puede mencionar auth.users ni email
  SELECT count(*) INTO v FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='get_user_display_names'
     AND (pg_get_functiondef(p.oid) ILIKE '%auth.users%' OR pg_get_functiondef(p.oid) ILIKE '%email%');
  IF v > 0 THEN RAISE EXCEPTION 'get_user_display_names sigue tocando auth.users o email'; END IF;

  SELECT p.prosecdef INTO v_def FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='get_user_display_names';
  IF v_def THEN RAISE EXCEPTION 'get_user_display_names deberia ser SECURITY INVOKER'; END IF;

  -- las dos vistas tienen que ser DEFINER para ver las filas anónimas
  FOR v IN SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
            WHERE n.nspname='public' AND c.relname IN ('foro_post_summary','foro_comment_summary')
              AND COALESCE((SELECT option_value FROM pg_options_to_table(c.reloptions)
                             WHERE option_name='security_invoker'), 'false') <> 'false'
  LOOP RAISE EXCEPTION 'Alguna vista del foro quedó como security_invoker'; END LOOP;

  -- ninguna policy de lectura puede seguir siendo incondicional
  SELECT count(*) INTO v FROM pg_policies
   WHERE schemaname='public' AND tablename IN ('foro_post','foro_comment','foro_vote')
     AND cmd='SELECT' AND qual = 'true';
  IF v > 0 THEN RAISE EXCEPTION '% policy(s) de SELECT siguen en USING (true)', v; END IF;

  RAISE NOTICE 'OK: email fuera de get_user_display_names, anonimato real en el foro, votos privados.';
END $verif$;

COMMIT;
