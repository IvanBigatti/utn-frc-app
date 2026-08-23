-- ============================================================
-- Industrial 3er año — Inglés II (materia 62)
-- ADDENDUM de carga_horarios_industrial_3.sql
--
-- Fuente: "4to año  industrial.xlsx", NO el Excel de 3er año.
--
-- Por qué el horario sale de otro archivo: el Excel de 3er año no
-- menciona Inglés II en ninguna parte (se buscó "ingl" en todas las
-- celdas de las 3 hojas: 0 ocurrencias), así que carga_horarios_
-- industrial_3.sql dejó esas 3 filas con horarios NULL.
--
-- Las 3 hojas del Excel de 4to año SÍ traen "Inglés 2" en la leyenda y
-- en la grilla, siempre en Martes 13:15-14:45 sin importar el turno de
-- la comisión (4D1 es Turno Noche, 4D3 Turno Mañana, y aun así el mismo
-- slot). Pero en la base 4to año de Industrial no tiene ninguna materia
-- de Inglés: la materia "Inglés II" de Industrial es la id 62 y está
-- asignada a 3D1, 3D2 y 3D3. Decisión del usuario: es materia de 3ro y
-- ese es su horario.
--
-- ---------------------------------------------------------------
-- ATENCIÓN — 3D3 (116) queda con un solapamiento REAL
-- ---------------------------------------------------------------
-- Martes en cada comisión de 3er año, ya cargado:
--   3D1 (Noche)   18:15-20:40 y 20:40-23:05   -> 13:15 libre
--   3D2 (Mañana)   8:00-10:25 y 10:25-12:50   -> 13:15 libre
--   3D3 (Tarde)   13:15-15:40 Mecánica de los Fluidos  -> CHOCA ENTERO
--
-- En 3D3 el bloque de Inglés II cae dentro de Mecánica de los Fluidos.
-- Se carga igual por decisión explícita del usuario.
--
-- CONSECUENCIA REAL, verificada en el navegador: el armador NO marca
-- este caso con un aviso suave, lo RECHAZA. En `pickComision`
-- (app/armadorHorarios/page.tsx) hay:
--
--     const conflict = conflictsWith(materia.id, comision.horarios);
--     if (conflict) { showError(`⚠ Superposición con "${conflict}"`); return; }
--
-- O sea que un alumno de 3D3 que ya eligió Mecánica de los Fluidos no
-- va a poder agregar Inglés II: le sale "⚠ Superposición con Mecánica
-- de los Fluidos" y el bloque no entra. Y al revés también.
--
-- Si se decide que en 3D3 el Inglés va en otro horario, alcanza con:
--
--   UPDATE public."ComisionMaterias"
--      SET horarios = NULL, cuatrimestre = NULL
--    WHERE "idComision" = 116 AND "idMateria" = 62;
--
-- ---------------------------------------------------------------
-- Orden de ejecución
-- ---------------------------------------------------------------
-- Este script va DESPUÉS de carga_horarios_industrial_3.sql. Si se
-- vuelve a correr aquel después de éste, su verificación va a fallar a
-- propósito: comprueba que Inglés II siga vacía en las 3 comisiones.
-- Correr en orden, o correr antes rollback_horarios_industrial_3_ingles.sql.
-- ============================================================

BEGIN;

-- ---------- Snapshot para rollback ----------
CREATE SCHEMA IF NOT EXISTS backup;
REVOKE ALL ON SCHEMA backup FROM anon, authenticated;

DROP TABLE IF EXISTS backup._bkp_industrial3_ingles;
CREATE TABLE backup._bkp_industrial3_ingles AS
SELECT * FROM public."ComisionMaterias"
 WHERE "idComision" IN (114,115,116) AND "idMateria" = 62;
REVOKE ALL ON backup._bkp_industrial3_ingles FROM anon, authenticated;

-- ---------- Guardas ----------
DO $guard$
DECLARE v int;
BEGIN
  SELECT count(*) INTO v FROM public.materia WHERE id = 62 AND nombre = 'Inglés II';
  IF v <> 1 THEN RAISE EXCEPTION 'La materia 62 no es "Inglés II"'; END IF;

  SELECT count(*) INTO v FROM public."ComisionMaterias"
   WHERE "idComision" IN (114,115,116) AND "idMateria" = 62;
  IF v <> 3 THEN RAISE EXCEPTION 'Se esperaban 3 filas de Inglés II en 3D1..3D3, hay %', v; END IF;
END $guard$;

-- ---------- Carga ----------
-- Martes 13:15-14:45 en las tres, tal como lo declara el Excel de 4to año.
UPDATE public."ComisionMaterias"
   SET cuatrimestre = 0,
       horarios = '[{"dia": "Martes", "hora_inicio": "13:15", "hora_fin": "14:45"}]'::jsonb
 WHERE "idComision" IN (114,115,116) AND "idMateria" = 62;

-- ---------- Verificación ----------
DO $verif$
DECLARE filas int; malas int; choques int;
BEGIN
  SELECT count(*) INTO filas
    FROM public."ComisionMaterias"
   WHERE "idComision" IN (114,115,116) AND "idMateria" = 62
     AND cuatrimestre = 0
     AND horarios = '[{"dia": "Martes", "hora_inicio": "13:15", "hora_fin": "14:45"}]'::jsonb;
  IF filas <> 3 THEN RAISE EXCEPTION 'Se esperaban 3 filas cargadas, hay %', filas; END IF;

  SELECT count(*) INTO malas
    FROM public."ComisionMaterias" cm
    CROSS JOIN LATERAL jsonb_array_elements(cm.horarios) h
   WHERE cm."idComision" IN (114,115,116) AND cm."idMateria" = 62
     AND ( (SELECT count(*) FROM jsonb_object_keys(h)) <> 3
        OR h->>'dia' NOT IN ('Lunes','Martes','Miercoles','Jueves','Viernes','Sabado')
        OR h->>'hora_inicio' !~ '^[0-9]{1,2}:[0-9]{2}$'
        OR h->>'hora_fin'    !~ '^[0-9]{1,2}:[0-9]{2}$' );
  IF malas > 0 THEN RAISE EXCEPTION '% bloque(s) con forma invalida', malas; END IF;

  -- El solapamiento de 3D3 es esperado: se comprueba que sea EXACTAMENTE uno
  -- y no que hayan aparecido otros por sorpresa.
  SELECT count(*) INTO choques
    FROM public."ComisionMaterias" x
    JOIN public."ComisionMaterias" y
      ON x."idComision" = y."idComision" AND x."idMateria" <> y."idMateria"
    CROSS JOIN LATERAL jsonb_array_elements(x.horarios) a
    CROSS JOIN LATERAL jsonb_array_elements(y.horarios) b
   WHERE x."idComision" IN (114,115,116) AND x."idMateria" = 62
     AND (a->>'dia') = (b->>'dia')
     AND (split_part(a->>'hora_inicio',':',1)::int*60 + split_part(a->>'hora_inicio',':',2)::int)
         < (split_part(b->>'hora_fin',':',1)::int*60 + split_part(b->>'hora_fin',':',2)::int)
     AND (split_part(b->>'hora_inicio',':',1)::int*60 + split_part(b->>'hora_inicio',':',2)::int)
         < (split_part(a->>'hora_fin',':',1)::int*60 + split_part(a->>'hora_fin',':',2)::int);
  IF choques <> 1 THEN
    RAISE EXCEPTION 'Se esperaba 1 solapamiento (3D3 vs Mecánica de los Fluidos), hay %', choques;
  END IF;

  RAISE NOTICE 'OK: Inglés II cargada en 3D1, 3D2 y 3D3 (Martes 13:15-14:45).';
  RAISE NOTICE 'RECORDATORIO: 3D3 queda solapada con Mecánica de los Fluidos (Martes 13:15-15:40).';
END $verif$;

COMMIT;
