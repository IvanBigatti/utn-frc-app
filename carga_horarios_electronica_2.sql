-- ============================================================
-- Horarios Ingeniería Electrónica — 2do año
-- Fuente: "2do año electronica.xlsx" (hojas 2R1, 2R2, 2R3, 2R4)
--
-- UPDATE puro: las 4 comisiones (88, 89, 90, 91) y sus 7 materias ya
-- existen en `ComisionMaterias` con horarios NULL. No se crea nada.
--
-- Criterios de lectura (mismos que 1er año, más un ajuste):
--  · Los recreos vienen como bandas D:H fusionadas y vacías. Una materia
--    que sigue después de un recreo se dicta de corrido, así que los
--    bloques se unen atravesándolo.
--  · AJUSTE respecto de 1er año: sólo se atraviesan bandas de hasta 15
--    minutos. Este Excel trae además bandas de 25 y 45 minutos (el corte
--    del mediodía y el cambio de turno), que NO son recreos y por lo
--    tanto cortan el bloque. Ejemplo: Física II el jueves en 2R1 queda
--    como 12:05-12:50 y 13:15-15:40, no como un bloque corrido.
--    Los 74 recreos efectivamente atravesados son todos de 10 minutos.
--  · Abreviaturas normalizadas antes de unir: QG = Química General,
--    PyE = Probabilidad y Estadística, FE = Física Electrónica,
--    ASyS = Análisis de Señales y Sistemas.
--  · Cinco materias aparecen en las grillas de ambos cuatrimestres con
--    horarios idénticos en las 4 comisiones → son ANUALES
--    (cuatrimestre = 0): Análisis de Señales y Sistemas, Informática II,
--    Inglés I, Probabilidad y Estadística y Química General.
--    Física II es del 1er cuatrimestre y Física Electrónica del 2do:
--    ocupan la misma franja horaria, una releva a la otra.
--
-- Requiere agregar "12:30" a FRANJAS en app/armadorHorarios/page.tsx:
-- cierra el bloque de Física Electrónica del jueves en 2R1 (12:05-12:30).
-- ============================================================

BEGIN;

-- ---------- Snapshot para rollback ----------
CREATE SCHEMA IF NOT EXISTS backup;
REVOKE ALL ON SCHEMA backup FROM anon, authenticated;

DROP TABLE IF EXISTS backup._bkp_electronica2_comisionmaterias;
CREATE TABLE backup._bkp_electronica2_comisionmaterias AS
SELECT * FROM public."ComisionMaterias" WHERE "idComision" IN (88, 89, 90, 91);
REVOKE ALL ON backup._bkp_electronica2_comisionmaterias FROM anon, authenticated;

-- ---------- Guardas ----------
DO $guard$
DECLARE v int;
BEGIN
  SELECT count(*) INTO v FROM public.comision
   WHERE id IN (88,89,90,91) AND nombre IN ('2R1','2R2','2R3','2R4');
  IF v <> 4 THEN RAISE EXCEPTION 'Las comisiones 2R1..2R4 no son 88..91 (encontradas: %)', v; END IF;

  SELECT count(*) INTO v FROM public.materia WHERE id IN (4,7,9,38,128,129,130);
  IF v <> 7 THEN RAISE EXCEPTION 'Faltan materias de 2do año de Electrónica (encontradas: %)', v; END IF;

  SELECT count(*) INTO v FROM public."ComisionMaterias" WHERE "idComision" IN (88,89,90,91);
  IF v <> 28 THEN RAISE EXCEPTION 'Se esperaban 28 filas ComisionMaterias, hay %', v; END IF;

  SELECT count(*) INTO v FROM backup._bkp_electronica2_comisionmaterias;
  IF v <> 28 THEN RAISE EXCEPTION 'El snapshot tiene % filas, se esperaban 28', v; END IF;
END $guard$;


-- ================= 2R1 (comision 88) =================
-- Inglés I — anual — Jue 10:25-12:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Jueves","hora_inicio":"10:25","hora_fin":"12:05"}]'::jsonb
WHERE "idComision" = 88 AND "idMateria" = 4;
-- Física II — 1er cuatrimestre — Lun 13:15-18:05, Jue 12:05-12:50, Jue 13:15-15:40
UPDATE public."ComisionMaterias" SET cuatrimestre = 1, horarios = '[{"dia":"Lunes","hora_inicio":"13:15","hora_fin":"18:05"},
    {"dia":"Jueves","hora_inicio":"12:05","hora_fin":"12:50"},
    {"dia":"Jueves","hora_inicio":"13:15","hora_fin":"15:40"}]'::jsonb
WHERE "idComision" = 88 AND "idMateria" = 7;
-- Probabilidad y Estadística — anual — Vie 13:15-15:40
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Viernes","hora_inicio":"13:15","hora_fin":"15:40"}]'::jsonb
WHERE "idComision" = 88 AND "idMateria" = 9;
-- Química General — anual — Mar 13:15-17:20
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"13:15","hora_fin":"17:20"}]'::jsonb
WHERE "idComision" = 88 AND "idMateria" = 38;
-- Informática II — anual — Mie 13:15-15:40, Vie 15:40-17:20
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Miercoles","hora_inicio":"13:15","hora_fin":"15:40"},
    {"dia":"Viernes","hora_inicio":"15:40","hora_fin":"17:20"}]'::jsonb
WHERE "idComision" = 88 AND "idMateria" = 128;
-- Análisis de Señales y Sistemas — anual — Mie 15:40-18:05, Jue 15:40-18:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Miercoles","hora_inicio":"15:40","hora_fin":"18:05"},
    {"dia":"Jueves","hora_inicio":"15:40","hora_fin":"18:05"}]'::jsonb
WHERE "idComision" = 88 AND "idMateria" = 129;
-- Física Electrónica — 2do cuatrimestre — Lun 13:15-18:05, Jue 12:05-12:30, Jue 13:15-15:40
UPDATE public."ComisionMaterias" SET cuatrimestre = 2, horarios = '[{"dia":"Lunes","hora_inicio":"13:15","hora_fin":"18:05"},
    {"dia":"Jueves","hora_inicio":"12:05","hora_fin":"12:30"},
    {"dia":"Jueves","hora_inicio":"13:15","hora_fin":"15:40"}]'::jsonb
WHERE "idComision" = 88 AND "idMateria" = 130;

-- ================= 2R2 (comision 89) =================
-- Inglés I — anual — Jue 16:35-18:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Jueves","hora_inicio":"16:35","hora_fin":"18:05"}]'::jsonb
WHERE "idComision" = 89 AND "idMateria" = 4;
-- Física II — 1er cuatrimestre — Mie 19:55-23:05, Jue 20:40-23:05, Vie 19:55-22:20
UPDATE public."ComisionMaterias" SET cuatrimestre = 1, horarios = '[{"dia":"Miercoles","hora_inicio":"19:55","hora_fin":"23:05"},
    {"dia":"Jueves","hora_inicio":"20:40","hora_fin":"23:05"},
    {"dia":"Viernes","hora_inicio":"19:55","hora_fin":"22:20"}]'::jsonb
WHERE "idComision" = 89 AND "idMateria" = 7;
-- Probabilidad y Estadística — anual — Mar 18:15-20:40
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"18:15","hora_fin":"20:40"}]'::jsonb
WHERE "idComision" = 89 AND "idMateria" = 9;
-- Química General — anual — Mar 20:40-23:05, Mie 18:15-19:45
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"20:40","hora_fin":"23:05"},
    {"dia":"Miercoles","hora_inicio":"18:15","hora_fin":"19:45"}]'::jsonb
WHERE "idComision" = 89 AND "idMateria" = 38;
-- Informática II — anual — Lun 18:15-20:40, Vie 17:20-19:00
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"18:15","hora_fin":"20:40"},
    {"dia":"Viernes","hora_inicio":"17:20","hora_fin":"19:00"}]'::jsonb
WHERE "idComision" = 89 AND "idMateria" = 128;
-- Análisis de Señales y Sistemas — anual — Lun 20:40-23:05, Jue 18:15-20:40
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"20:40","hora_fin":"23:05"},
    {"dia":"Jueves","hora_inicio":"18:15","hora_fin":"20:40"}]'::jsonb
WHERE "idComision" = 89 AND "idMateria" = 129;
-- Física Electrónica — 2do cuatrimestre — Mie 19:55-23:05, Jue 20:40-23:05, Vie 19:55-23:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 2, horarios = '[{"dia":"Miercoles","hora_inicio":"19:55","hora_fin":"23:05"},
    {"dia":"Jueves","hora_inicio":"20:40","hora_fin":"23:05"},
    {"dia":"Viernes","hora_inicio":"19:55","hora_fin":"23:05"}]'::jsonb
WHERE "idComision" = 89 AND "idMateria" = 130;

-- ================= 2R3 (comision 90) =================
-- Inglés I — anual — Jue 13:15-14:45
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Jueves","hora_inicio":"13:15","hora_fin":"14:45"}]'::jsonb
WHERE "idComision" = 90 AND "idMateria" = 4;
-- Física II — 1er cuatrimestre — Mie 8:00-12:50, Jue 8:00-11:10
UPDATE public."ComisionMaterias" SET cuatrimestre = 1, horarios = '[{"dia":"Miercoles","hora_inicio":"8:00","hora_fin":"12:50"},
    {"dia":"Jueves","hora_inicio":"8:00","hora_fin":"11:10"}]'::jsonb
WHERE "idComision" = 90 AND "idMateria" = 7;
-- Probabilidad y Estadística — anual — Mar 8:00-10:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"8:00","hora_fin":"10:25"}]'::jsonb
WHERE "idComision" = 90 AND "idMateria" = 9;
-- Química General — anual — Vie 8:00-12:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Viernes","hora_inicio":"8:00","hora_fin":"12:05"}]'::jsonb
WHERE "idComision" = 90 AND "idMateria" = 38;
-- Informática II — anual — Mar 10:25-12:50, Jue 11:20-12:50
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"10:25","hora_fin":"12:50"},
    {"dia":"Jueves","hora_inicio":"11:20","hora_fin":"12:50"}]'::jsonb
WHERE "idComision" = 90 AND "idMateria" = 128;
-- Análisis de Señales y Sistemas — anual — Lun 8:00-12:50
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"8:00","hora_fin":"12:50"}]'::jsonb
WHERE "idComision" = 90 AND "idMateria" = 129;
-- Física Electrónica — 2do cuatrimestre — Mie 8:00-12:50, Jue 8:00-11:10
UPDATE public."ComisionMaterias" SET cuatrimestre = 2, horarios = '[{"dia":"Miercoles","hora_inicio":"8:00","hora_fin":"12:50"},
    {"dia":"Jueves","hora_inicio":"8:00","hora_fin":"11:10"}]'::jsonb
WHERE "idComision" = 90 AND "idMateria" = 130;

-- ================= 2R4 (comision 91) =================
-- Inglés I — anual — Jue 14:55-16:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Jueves","hora_inicio":"14:55","hora_fin":"16:25"}]'::jsonb
WHERE "idComision" = 91 AND "idMateria" = 4;
-- Física II — 1er cuatrimestre — Mar 18:15-23:05, Jue 19:55-23:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 1, horarios = '[{"dia":"Martes","hora_inicio":"18:15","hora_fin":"23:05"},
    {"dia":"Jueves","hora_inicio":"19:55","hora_fin":"23:05"}]'::jsonb
WHERE "idComision" = 91 AND "idMateria" = 7;
-- Probabilidad y Estadística — anual — Mie 19:55-22:20
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Miercoles","hora_inicio":"19:55","hora_fin":"22:20"}]'::jsonb
WHERE "idComision" = 91 AND "idMateria" = 9;
-- Química General — anual — Jue 17:20-19:45, Vie 20:40-22:20
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Jueves","hora_inicio":"17:20","hora_fin":"19:45"},
    {"dia":"Viernes","hora_inicio":"20:40","hora_fin":"22:20"}]'::jsonb
WHERE "idComision" = 91 AND "idMateria" = 38;
-- Informática II — anual — Lun 20:40-23:05, Mie 18:15-19:45
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"20:40","hora_fin":"23:05"},
    {"dia":"Miercoles","hora_inicio":"18:15","hora_fin":"19:45"}]'::jsonb
WHERE "idComision" = 91 AND "idMateria" = 128;
-- Análisis de Señales y Sistemas — anual — Lun 18:15-20:40, Vie 18:15-20:40
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"18:15","hora_fin":"20:40"},
    {"dia":"Viernes","hora_inicio":"18:15","hora_fin":"20:40"}]'::jsonb
WHERE "idComision" = 91 AND "idMateria" = 129;
-- Física Electrónica — 2do cuatrimestre — Mar 18:15-23:05, Jue 19:55-23:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 2, horarios = '[{"dia":"Martes","hora_inicio":"18:15","hora_fin":"23:05"},
    {"dia":"Jueves","hora_inicio":"19:55","hora_fin":"23:05"}]'::jsonb
WHERE "idComision" = 91 AND "idMateria" = 130;

-- ---------- Verificación ----------
DO $verif$
DECLARE v_filas int; v_bloques int; v_malas int;
BEGIN
  SELECT count(*) INTO v_filas FROM public."ComisionMaterias"
   WHERE "idComision" IN (88,89,90,91)
     AND horarios IS NOT NULL AND jsonb_array_length(horarios) > 0;
  IF v_filas <> 28 THEN RAISE EXCEPTION 'Se esperaban 28 filas con horarios, hay %', v_filas; END IF;

  SELECT count(*) INTO v_bloques FROM public."ComisionMaterias" cm,
         jsonb_array_elements(cm.horarios) h WHERE cm."idComision" IN (88,89,90,91);
  IF v_bloques <> 49 THEN RAISE EXCEPTION 'Se esperaban 49 bloques, hay %', v_bloques; END IF;

  SELECT count(*) INTO v_malas FROM public."ComisionMaterias" cm,
         jsonb_array_elements(cm.horarios) h
   WHERE cm."idComision" IN (88,89,90,91)
     AND (NOT (h ?& array['dia','hora_inicio','hora_fin'])
          OR (SELECT count(*) FROM jsonb_object_keys(h)) <> 3
          OR h->>'dia' NOT IN ('Lunes','Martes','Miercoles','Jueves','Viernes')
          OR h->>'hora_inicio' !~ '^[0-9]{1,2}:[0-9]{2}$'
          OR h->>'hora_fin'    !~ '^[0-9]{1,2}:[0-9]{2}$');
  IF v_malas > 0 THEN RAISE EXCEPTION '% bloque(s) con forma inválida', v_malas; END IF;

  RAISE NOTICE 'OK: 28 filas, 49 bloques, forma válida.';
END $verif$;

COMMIT;
