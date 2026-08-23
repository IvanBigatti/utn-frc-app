-- ============================================================
-- Rollback de seguridad_pii_foro.sql
--
-- OJO: esto REABRE las tres fugas. Correr sólo si algo se rompió y hace
-- falta volver atrás mientras se investiga, no como estado final.
--
-- Reabre:
--   1. La parte local del email de todo usuario sin username, para anon
--   2. El auth_user_id de posts y comentarios anónimos
--   3. El registro de votos de cada usuario
--
-- El cambio de app que acompaña (leer foro_comment_summary en vez de
-- foro_comment) es compatible con este rollback: la vista sigue
-- existiendo, así que no hace falta revertir el código para volver atrás.
-- ============================================================

BEGIN;

-- 1. Vuelve el fallback a email
CREATE OR REPLACE FUNCTION public.get_user_display_names(user_ids uuid[])
 RETURNS TABLE(id uuid, display_name text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT au.id, COALESCE(p.username, split_part(au.email, '@', 1)) AS display_name
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  WHERE au.id = ANY(user_ids);
$function$;

-- 2. Vuelve la lectura incondicional de posts y comentarios
ALTER VIEW public.foro_post_summary SET (security_invoker = true);

DROP POLICY IF EXISTS "Lectura pública posts" ON public.foro_post;
CREATE POLICY "Lectura pública posts" ON public.foro_post
  FOR SELECT USING (true);

DROP POLICY IF EXISTS comments_read ON public.foro_comment;
CREATE POLICY comments_read ON public.foro_comment
  FOR SELECT USING (true);

-- La vista de comentarios se deja creada: es nueva y no molesta. Para
-- borrarla también:
--   DROP VIEW IF EXISTS public.foro_comment_summary;

-- 3. Vuelve la lectura pública de votos
DROP POLICY IF EXISTS votes_read ON public.foro_vote;
CREATE POLICY votes_read ON public.foro_vote
  FOR SELECT USING (true);

COMMIT;
