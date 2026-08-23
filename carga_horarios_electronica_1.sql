-- ============================================================
-- Horarios Ingeniería Electrónica — 1er año
-- Fuente: "1er año electronica.xlsx" (hojas 1R1, 1R5, 1R7)
--
-- Es un UPDATE puro: las 3 comisiones y sus 7 materias ya existen en
-- `ComisionMaterias` con horarios NULL. No se crea ninguna materia ni
-- comisión. 1R3 y 1R4 existen en la base pero no vienen en este Excel,
-- así que quedan intactas.
--
-- Criterios de lectura de la grilla:
--  · Los recreos están marcados en el Excel como bandas fusionadas D:H
--    vacías. Una materia que sigue después de un recreo se dicta de
--    corrido, así que los bloques se unen atravesándolo.
--  · "DAC" es la abreviatura de "Diseño Asistido por Computadora": se
--    normaliza antes de unir los bloques.
--  · Informática I e Ingeniería y Sociedad aparecen en las grillas de
--    ambos cuatrimestres con horarios idénticos → son ANUALES
--    (cuatrimestre = 0). El resto reparte 1 y 2.
--  · Las celdas que arrancan más tarde que sus vecinas (Análisis 2 el
--    viernes 14:00 en 1R1, Álgebra el viernes 8:45 en 1R5) son reales:
--    el relleno de color del Excel confirma que la celda de arriba está
--    vacía, no es una fusión mal hecha.
--
-- Requiere agregar "20:30" a FRANJAS en app/armadorHorarios/page.tsx:
-- es el fin del bloque de DAC del miércoles en 1R1 y sin esa entrada
-- franjaIdx() devuelve -1 y el bloque se dibuja con alto de respaldo.
-- ============================================================

BEGIN;

-- ---------- Snapshot para rollback ----------
CREATE SCHEMA IF NOT EXISTS backup;
REVOKE ALL ON SCHEMA backup FROM anon, authenticated;

DROP TABLE IF EXISTS backup._bkp_electronica1_comisionmaterias;
CREATE TABLE backup._bkp_electronica1_comisionmaterias AS
SELECT * FROM public."ComisionMaterias" WHERE "idComision" IN (82, 85, 87);
REVOKE ALL ON backup._bkp_electronica1_comisionmaterias FROM anon, authenticated;

-- ---------- Guardas: nada de esto debería fallar ----------
DO $guard$
DECLARE v int;
BEGIN
  SELECT count(*) INTO v FROM public.comision c
    WHERE c.id IN (82,85,87) AND c.nombre IN ('1R1','1R5','1R7');
  IF v <> 3 THEN RAISE EXCEPTION 'Las comisiones 1R1/1R5/1R7 no son 82/85/87 (encontradas: %)', v; END IF;

  SELECT count(*) INTO v FROM public.materia
    WHERE id IN (1,2,3,5,6,126,127);
  IF v <> 7 THEN RAISE EXCEPTION 'Faltan materias de 1er año de Electrónica (encontradas: %)', v; END IF;

  SELECT count(*) INTO v FROM public."ComisionMaterias"
    WHERE "idComision" IN (82,85,87);
  IF v <> 21 THEN RAISE EXCEPTION 'Se esperaban 21 filas ComisionMaterias, hay %', v; END IF;
END $guard$;


-- ================= 1R1 (comision 82) =================
-- Análisis Matemático I — 1er cuatrimestre — Lun 13:15-15:40, Jue 13:15-16:25, Vie 13:15-15:40
UPDATE public."ComisionMaterias" SET cuatrimestre = 1, horarios = '[{"dia":"Lunes","hora_inicio":"13:15","hora_fin":"15:40"},
    {"dia":"Jueves","hora_inicio":"13:15","hora_fin":"16:25"},
    {"dia":"Viernes","hora_inicio":"13:15","hora_fin":"15:40"}]'::jsonb
WHERE "idComision" = 82 AND "idMateria" = 1;
-- Álgebra y Geometría Analítica — 1er cuatrimestre — Lun 15:40-18:05, Mie 14:55-18:05, Vie 15:40-18:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 1, horarios = '[{"dia":"Lunes","hora_inicio":"15:40","hora_fin":"18:05"},
    {"dia":"Miercoles","hora_inicio":"14:55","hora_fin":"18:05"},
    {"dia":"Viernes","hora_inicio":"15:40","hora_fin":"18:05"}]'::jsonb
WHERE "idComision" = 82 AND "idMateria" = 2;
-- Física I — 2do cuatrimestre — Mie 14:55-18:05, Jue 13:15-18:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 2, horarios = '[{"dia":"Miercoles","hora_inicio":"14:55","hora_fin":"18:05"},
    {"dia":"Jueves","hora_inicio":"13:15","hora_fin":"18:05"}]'::jsonb
WHERE "idComision" = 82 AND "idMateria" = 3;
-- Ingeniería y Sociedad — anual — Mar 13:15-14:45
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"13:15","hora_fin":"14:45"}]'::jsonb
WHERE "idComision" = 82 AND "idMateria" = 5;
-- Análisis Matemático II — 2do cuatrimestre — Lun 13:15-17:20, Vie 14:00-18:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 2, horarios = '[{"dia":"Lunes","hora_inicio":"13:15","hora_fin":"17:20"},
    {"dia":"Viernes","hora_inicio":"14:00","hora_fin":"18:05"}]'::jsonb
WHERE "idComision" = 82 AND "idMateria" = 6;
-- Informática I — anual — Mar 14:55-17:20, Mie 13:15-14:45
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"14:55","hora_fin":"17:20"},
    {"dia":"Miercoles","hora_inicio":"13:15","hora_fin":"14:45"}]'::jsonb
WHERE "idComision" = 82 AND "idMateria" = 126;
-- Diseño Asistido por Computadora — 2do cuatrimestre — Mie 18:15-20:30
UPDATE public."ComisionMaterias" SET cuatrimestre = 2, horarios = '[{"dia":"Miercoles","hora_inicio":"18:15","hora_fin":"20:30"}]'::jsonb
WHERE "idComision" = 82 AND "idMateria" = 127;

-- ================= 1R5 (comision 85) =================
-- Análisis Matemático I — 1er cuatrimestre — Lun 8:00-11:10, Mar 8:00-10:25, Mie 10:25-12:50
UPDATE public."ComisionMaterias" SET cuatrimestre = 1, horarios = '[{"dia":"Lunes","hora_inicio":"8:00","hora_fin":"11:10"},
    {"dia":"Martes","hora_inicio":"8:00","hora_fin":"10:25"},
    {"dia":"Miercoles","hora_inicio":"10:25","hora_fin":"12:50"}]'::jsonb
WHERE "idComision" = 85 AND "idMateria" = 1;
-- Álgebra y Geometría Analítica — 1er cuatrimestre — Mar 10:25-12:50, Mie 8:00-10:25, Vie 8:45-12:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 1, horarios = '[{"dia":"Martes","hora_inicio":"10:25","hora_fin":"12:50"},
    {"dia":"Miercoles","hora_inicio":"8:00","hora_fin":"10:25"},
    {"dia":"Viernes","hora_inicio":"8:45","hora_fin":"12:05"}]'::jsonb
WHERE "idComision" = 85 AND "idMateria" = 2;
-- Física I — 2do cuatrimestre — Mar 8:00-12:50, Mie 8:00-11:10
UPDATE public."ComisionMaterias" SET cuatrimestre = 2, horarios = '[{"dia":"Martes","hora_inicio":"8:00","hora_fin":"12:50"},
    {"dia":"Miercoles","hora_inicio":"8:00","hora_fin":"11:10"}]'::jsonb
WHERE "idComision" = 85 AND "idMateria" = 3;
-- Ingeniería y Sociedad — anual — Jue 11:20-12:50
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Jueves","hora_inicio":"11:20","hora_fin":"12:50"}]'::jsonb
WHERE "idComision" = 85 AND "idMateria" = 5;
-- Análisis Matemático II — 2do cuatrimestre — Lun 8:00-11:10, Vie 8:00-12:50
UPDATE public."ComisionMaterias" SET cuatrimestre = 2, horarios = '[{"dia":"Lunes","hora_inicio":"8:00","hora_fin":"11:10"},
    {"dia":"Viernes","hora_inicio":"8:00","hora_fin":"12:50"}]'::jsonb
WHERE "idComision" = 85 AND "idMateria" = 6;
-- Informática I — anual — Lun 11:20-12:50, Jue 8:00-10:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"11:20","hora_fin":"12:50"},
    {"dia":"Jueves","hora_inicio":"8:00","hora_fin":"10:25"}]'::jsonb
WHERE "idComision" = 85 AND "idMateria" = 126;
-- Diseño Asistido por Computadora — 2do cuatrimestre — Jue 15:40-18:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 2, horarios = '[{"dia":"Jueves","hora_inicio":"15:40","hora_fin":"18:05"}]'::jsonb
WHERE "idComision" = 85 AND "idMateria" = 127;

-- ================= 1R7 (comision 87) =================
-- Análisis Matemático I — 1er cuatrimestre — Lun 19:55-23:05, Mar 18:15-20:40, Jue 18:15-20:40
UPDATE public."ComisionMaterias" SET cuatrimestre = 1, horarios = '[{"dia":"Lunes","hora_inicio":"19:55","hora_fin":"23:05"},
    {"dia":"Martes","hora_inicio":"18:15","hora_fin":"20:40"},
    {"dia":"Jueves","hora_inicio":"18:15","hora_fin":"20:40"}]'::jsonb
WHERE "idComision" = 87 AND "idMateria" = 1;
-- Álgebra y Geometría Analítica — 1er cuatrimestre — Mar 20:40-23:05, Jue 20:40-23:05, Vie 18:15-21:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 1, horarios = '[{"dia":"Martes","hora_inicio":"20:40","hora_fin":"23:05"},
    {"dia":"Jueves","hora_inicio":"20:40","hora_fin":"23:05"},
    {"dia":"Viernes","hora_inicio":"18:15","hora_fin":"21:25"}]'::jsonb
WHERE "idComision" = 87 AND "idMateria" = 2;
-- Física I — 2do cuatrimestre — Lun 19:55-23:05, Vie 18:15-23:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 2, horarios = '[{"dia":"Lunes","hora_inicio":"19:55","hora_fin":"23:05"},
    {"dia":"Viernes","hora_inicio":"18:15","hora_fin":"23:05"}]'::jsonb
WHERE "idComision" = 87 AND "idMateria" = 3;
-- Ingeniería y Sociedad — anual — Lun 18:15-19:45
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"18:15","hora_fin":"19:45"}]'::jsonb
WHERE "idComision" = 87 AND "idMateria" = 5;
-- Análisis Matemático II — 2do cuatrimestre — Mar 18:15-22:20, Jue 18:15-22:20
UPDATE public."ComisionMaterias" SET cuatrimestre = 2, horarios = '[{"dia":"Martes","hora_inicio":"18:15","hora_fin":"22:20"},
    {"dia":"Jueves","hora_inicio":"18:15","hora_fin":"22:20"}]'::jsonb
WHERE "idComision" = 87 AND "idMateria" = 6;
-- Informática I — anual — Mie 19:00-23:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Miercoles","hora_inicio":"19:00","hora_fin":"23:05"}]'::jsonb
WHERE "idComision" = 87 AND "idMateria" = 126;
-- Diseño Asistido por Computadora — 2do cuatrimestre — Vie 14:00-16:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 2, horarios = '[{"dia":"Viernes","hora_inicio":"14:00","hora_fin":"16:25"}]'::jsonb
WHERE "idComision" = 87 AND "idMateria" = 127;

-- ---------- Verificación ----------
DO $verif$
DECLARE v_filas int; v_bloques int; v_malas int;
BEGIN
  SELECT count(*) INTO v_filas FROM public."ComisionMaterias"
   WHERE "idComision" IN (82,85,87)
     AND horarios IS NOT NULL AND jsonb_array_length(horarios) > 0;
  IF v_filas <> 21 THEN RAISE EXCEPTION 'Se esperaban 21 filas con horarios, hay %', v_filas; END IF;

  SELECT count(*) INTO v_bloques FROM public."ComisionMaterias" cm,
         jsonb_array_elements(cm.horarios) h WHERE cm."idComision" IN (82,85,87);
  IF v_bloques <> 41 THEN RAISE EXCEPTION 'Se esperaban 41 bloques, hay %', v_bloques; END IF;

  -- forma del jsonb: exactamente dia/hora_inicio/hora_fin, día sin tilde
  SELECT count(*) INTO v_malas FROM public."ComisionMaterias" cm,
         jsonb_array_elements(cm.horarios) h
   WHERE cm."idComision" IN (82,85,87)
     AND (NOT (h ?& array['dia','hora_inicio','hora_fin'])
          OR (SELECT count(*) FROM jsonb_object_keys(h)) <> 3
          OR h->>'dia' NOT IN ('Lunes','Martes','Miercoles','Jueves','Viernes')
          OR h->>'hora_inicio' !~ '^[0-9]{1,2}:[0-9]{2}$'
          OR h->>'hora_fin'    !~ '^[0-9]{1,2}:[0-9]{2}$');
  IF v_malas > 0 THEN RAISE EXCEPTION '% bloque(s) con forma inválida', v_malas; END IF;

  RAISE NOTICE 'OK: 21 filas, 41 bloques, forma válida.';
END $verif$;

COMMIT;
