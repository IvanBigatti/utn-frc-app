-- ============================================================
-- Arreglos de los advisors de seguridad de Supabase
--
-- Cubre los 2 ERRORS y 5 de los WARNINGS. Ninguno cambia lo que ve
-- un usuario de la app: se verificó que como rol `anon` las 7 tablas
-- base de las vistas devuelven los mismos conteos que como `postgres`.
--
-- NO cubre:
--  · El anonimato del foro. `foro_post` y `foro_comment` tienen
--    SELECT USING (true) y `anon` puede leer `auth_user_id` aunque el
--    post esté marcado anónimo. Las vistas anonimizan, las tablas no.
--    Arreglarlo implica cortar el SELECT directo y rediseñar
--    app/perfil/page.tsx:75, que cuenta posts con .eq("auth_user_id").
--  · Leaked password protection: es un toggle del dashboard.
-- ============================================================

BEGIN;

-- ---------- 1. Vistas: SECURITY DEFINER -> security_invoker ----------
-- Corrían como su dueño (postgres), ignorando la RLS de las tablas base.
-- Hoy eso no filtra nada porque todas las policies de SELECT son
-- USING (true), pero deja una trampa: el día que se agregue una policy
-- restrictiva, la vista la ignoraría en silencio.
ALTER VIEW public.foro_post_summary   SET (security_invoker = true);
ALTER VIEW public.archivos_con_rating SET (security_invoker = true);

-- ---------- 2. get_user_emails: eliminar ----------
-- SECURITY DEFINER, ejecutable por `anon` vía /rest/v1/rpc/, devolvía
-- auth.users.email. La cadena de ataque no requería estar logueado:
-- leer foro_post_summary (público) -> juntar los auth_user_id no
-- anónimos -> llamar la función -> cosechar los emails.
-- No se invoca desde ningún punto del repo.
--
-- Para restaurarla, si alguna vez hiciera falta:
--
--   CREATE OR REPLACE FUNCTION public.get_user_emails(user_ids uuid[])
--   RETURNS TABLE(id uuid, email text)
--   LANGUAGE sql SECURITY DEFINER SET search_path = public, pg_temp AS $$
--     SELECT u.id, u.email FROM auth.users u
--     WHERE u.id = ANY(user_ids)
--       AND u.id IN (
--         SELECT auth_user_id FROM foro_post    WHERE anonimo = false AND auth_user_id = ANY(user_ids)
--         UNION
--         SELECT auth_user_id FROM foro_comment WHERE anonimo = false AND auth_user_id = ANY(user_ids)
--       );
--   $$;
--   REVOKE EXECUTE ON FUNCTION public.get_user_emails(uuid[]) FROM anon, authenticated;
DROP FUNCTION IF EXISTS public.get_user_emails(uuid[]);

-- ---------- 3. search_path fijo en las funciones SECURITY DEFINER ----------
-- Sin search_path propio, una función SECURITY DEFINER resuelve los
-- nombres de tabla con el path de quien la llama, ejecutándose con
-- privilegios del dueño. Ambas ya referencian todo con schema, así que
-- fijarlo no cambia cómo resuelven.
ALTER FUNCTION public.get_user_display_names(uuid[]) SET search_path = public, pg_temp;
ALTER FUNCTION public.incrementar_descargas(bigint)  SET search_path = public, pg_temp;

-- ---------- 4. Verificación ----------
DO $$
DECLARE v_definer int; v_sinpath int; v_emails int;
BEGIN
  SELECT count(*) INTO v_definer
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'v'
    AND NOT COALESCE((SELECT option_value::boolean FROM pg_options_to_table(c.reloptions)
                      WHERE option_name = 'security_invoker'), false);
  IF v_definer > 0 THEN
    RAISE EXCEPTION 'Quedan % vista(s) sin security_invoker', v_definer;
  END IF;

  SELECT count(*) INTO v_sinpath
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prosecdef AND p.proconfig IS NULL;
  IF v_sinpath > 0 THEN
    RAISE EXCEPTION 'Quedan % función(es) SECURITY DEFINER sin search_path', v_sinpath;
  END IF;

  SELECT count(*) INTO v_emails
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'get_user_emails';
  IF v_emails > 0 THEN
    RAISE EXCEPTION 'get_user_emails sigue existiendo';
  END IF;

  RAISE NOTICE 'OK: vistas con security_invoker, funciones con search_path, get_user_emails eliminada.';
END $$;

COMMIT;
