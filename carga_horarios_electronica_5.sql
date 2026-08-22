-- ============================================================
-- Horarios Ingeniería Electrónica — 5to año
-- Fuente: "5to año electronica.xlsx" (hojas 5R1, 5R2)
--
-- UPDATE puro: las 2 comisiones (98, 99) y sus 7 materias ya existen en
-- `ComisionMaterias` con horarios NULL. No se crea nada, y no hacen
-- falta franjas nuevas: todos los bordes ya están en FRANJAS.
--
-- TODAS LAS MATERIAS QUEDAN COMO ANUALES (cuatrimestre = 0). Una sola
-- grilla por hoja, y los títulos vuelven a contradecirse: 5R1 dice
-- "Turno Noche" y 5R2 "Primer Cuatrimestre - Turno Noche". El test de
-- `materia.horas_semanales` (hora cátedra = 45 min) cierra en las 14
-- filas, sin una sola excepción:
--
--   Organización Industrial    2 hs -> 1h30 | 5R1 1h40 | 5R2 1h30
--   Sistemas de Control        4 hs -> 3h00 | 5R1 3h00 | 5R2 3h00
--   Electrónica de Potencia    4 hs -> 3h00 | 5R1 3h00 | 5R2 3h00
--   Técnicas Digitales III     5 hs -> 3h45 | 5R1 4h05 | 5R2 3h55
--   Medidas Electrónicas II    5 hs -> 3h45 | 5R1 3h55 | 5R2 3h55
--   Electrónica Aplicada III   5 hs -> 3h45 | 5R1 3h55 | 5R2 3h55
--   Tecnología Electrónica     5 hs -> 3h45 | 5R1 3h55 | 5R2 3h55
--
-- (el excedente son los recreos de 10 min que se unen; los 10
-- atravesados acá son todos de 10 min)
--
-- PRÁCTICAS PROFESIONALES SUPERVISADAS: figura en la leyenda de 5R1
-- pero no tiene ningún bloque en la grilla, y tampoco existe como fila
-- de `ComisionMaterias` para estas comisiones. Es esperable: la PPS no
-- tiene horario fijo de cursado. No se carga nada por ella.
--
-- Abreviaturas normalizadas: TD 3 = Técnicas Digitales 3,
-- ME 2 = Medidas Electrónicas 2, EA 3 = Electrónica Aplicada 3,
-- TE = Tecnología Electrónica, OI = Organización Industrial.
-- ============================================================

BEGIN;

-- ---------- Snapshot para rollback ----------
CREATE SCHEMA IF NOT EXISTS backup;
REVOKE ALL ON SCHEMA backup FROM anon, authenticated;

DROP TABLE IF EXISTS backup._bkp_electronica5_comisionmaterias;
CREATE TABLE backup._bkp_electronica5_comisionmaterias AS
SELECT * FROM public."ComisionMaterias" WHERE "idComision" IN (98, 99);
REVOKE ALL ON backup._bkp_electronica5_comisionmaterias FROM anon, authenticated;

-- ---------- Guardas ----------
DO $guard$
DECLARE v int;
BEGIN
  SELECT count(*) INTO v FROM public.comision
   WHERE id IN (98,99) AND nombre IN ('5R1','5R2');
  IF v <> 2 THEN RAISE EXCEPTION 'Las comisiones 5R1/5R2 no son 98/99 (encontradas: %)', v; END IF;

  SELECT count(*) INTO v FROM public.materia WHERE id IN (143,144,145,146,147,148,149);
  IF v <> 7 THEN RAISE EXCEPTION 'Faltan materias de 5to año de Electrónica (encontradas: %)', v; END IF;

  SELECT count(*) INTO v FROM public."ComisionMaterias" WHERE "idComision" IN (98,99);
  IF v <> 14 THEN RAISE EXCEPTION 'Se esperaban 14 filas ComisionMaterias, hay %', v; END IF;

  SELECT count(*) INTO v FROM backup._bkp_electronica5_comisionmaterias;
  IF v <> 14 THEN RAISE EXCEPTION 'El snapshot tiene % filas, se esperaban 14', v; END IF;
END $guard$;


-- ================= 5R1 (comision 98) =================
-- Técnicas Digitales III — anual — 4h05 — Mie 19:00-20:40, Vie 19:55-22:20
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Miercoles","hora_inicio":"19:00","hora_fin":"20:40"},
    {"dia":"Viernes","hora_inicio":"19:55","hora_fin":"22:20"}]'::jsonb
WHERE "idComision" = 98 AND "idMateria" = 143;
-- Medidas Electrónicas II — anual — 3h55 — Lun 21:35-23:05, Mie 20:40-23:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"21:35","hora_fin":"23:05"},
    {"dia":"Miercoles","hora_inicio":"20:40","hora_fin":"23:05"}]'::jsonb
WHERE "idComision" = 98 AND "idMateria" = 144;
-- Sistemas de Control — anual — 3h00 — Lun 18:15-19:45, Mar 19:55-21:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"18:15","hora_fin":"19:45"},
    {"dia":"Martes","hora_inicio":"19:55","hora_fin":"21:25"}]'::jsonb
WHERE "idComision" = 98 AND "idMateria" = 145;
-- Electrónica Aplicada III — anual — 3h55 — Mar 21:35-23:05, Jue 20:40-23:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"21:35","hora_fin":"23:05"},
    {"dia":"Jueves","hora_inicio":"20:40","hora_fin":"23:05"}]'::jsonb
WHERE "idComision" = 98 AND "idMateria" = 146;
-- Tecnología Electrónica — anual — 3h55 — Mar 18:15-19:45, Jue 18:15-20:40
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"18:15","hora_fin":"19:45"},
    {"dia":"Jueves","hora_inicio":"18:15","hora_fin":"20:40"}]'::jsonb
WHERE "idComision" = 98 AND "idMateria" = 147;
-- Electrónica de Potencia — anual — 3h00 — Lun 19:55-21:25, Vie 18:15-19:45
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"19:55","hora_fin":"21:25"},
    {"dia":"Viernes","hora_inicio":"18:15","hora_fin":"19:45"}]'::jsonb
WHERE "idComision" = 98 AND "idMateria" = 148;
-- Organización Industrial — anual — 1h40 — Mie 17:20-19:00
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Miercoles","hora_inicio":"17:20","hora_fin":"19:00"}]'::jsonb
WHERE "idComision" = 98 AND "idMateria" = 149;

-- ================= 5R2 (comision 99) =================
-- Técnicas Digitales III — anual — 3h55 — Mie 21:35-23:05, Vie 17:20-19:45
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Miercoles","hora_inicio":"21:35","hora_fin":"23:05"},
    {"dia":"Viernes","hora_inicio":"17:20","hora_fin":"19:45"}]'::jsonb
WHERE "idComision" = 99 AND "idMateria" = 143;
-- Medidas Electrónicas II — anual — 3h55 — Lun 18:15-19:45, Mar 17:20-19:45
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"18:15","hora_fin":"19:45"},
    {"dia":"Martes","hora_inicio":"17:20","hora_fin":"19:45"}]'::jsonb
WHERE "idComision" = 99 AND "idMateria" = 144;
-- Sistemas de Control — anual — 3h00 — Lun 19:55-21:25, Mar 21:35-23:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"19:55","hora_fin":"21:25"},
    {"dia":"Martes","hora_inicio":"21:35","hora_fin":"23:05"}]'::jsonb
WHERE "idComision" = 99 AND "idMateria" = 145;
-- Electrónica Aplicada III — anual — 3h55 — Mar 19:55-21:25, Jue 18:15-20:40
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"19:55","hora_fin":"21:25"},
    {"dia":"Jueves","hora_inicio":"18:15","hora_fin":"20:40"}]'::jsonb
WHERE "idComision" = 99 AND "idMateria" = 146;
-- Tecnología Electrónica — anual — 3h55 — Mie 18:15-19:45, Jue 20:40-23:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Miercoles","hora_inicio":"18:15","hora_fin":"19:45"},
    {"dia":"Jueves","hora_inicio":"20:40","hora_fin":"23:05"}]'::jsonb
WHERE "idComision" = 99 AND "idMateria" = 147;
-- Electrónica de Potencia — anual — 3h00 — Lun 21:35-23:05, Vie 19:55-21:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"21:35","hora_fin":"23:05"},
    {"dia":"Viernes","hora_inicio":"19:55","hora_fin":"21:25"}]'::jsonb
WHERE "idComision" = 99 AND "idMateria" = 148;
-- Organización Industrial — anual — 1h30 — Mie 19:55-21:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Miercoles","hora_inicio":"19:55","hora_fin":"21:25"}]'::jsonb
WHERE "idComision" = 99 AND "idMateria" = 149;

-- ---------- Verificación ----------
DO $verif$
DECLARE v_filas int; v_bloques int; v_malas int; v_cuatri int;
BEGIN
  SELECT count(*) INTO v_filas FROM public."ComisionMaterias"
   WHERE "idComision" IN (98,99)
     AND horarios IS NOT NULL AND jsonb_array_length(horarios) > 0;
  IF v_filas <> 14 THEN RAISE EXCEPTION 'Se esperaban 14 filas con horarios, hay %', v_filas; END IF;

  SELECT count(*) INTO v_cuatri FROM public."ComisionMaterias"
   WHERE "idComision" IN (98,99) AND cuatrimestre IS DISTINCT FROM 0;
  IF v_cuatri > 0 THEN RAISE EXCEPTION '% fila(s) no quedaron como anuales', v_cuatri; END IF;

  SELECT count(*) INTO v_bloques FROM public."ComisionMaterias" cm,
         jsonb_array_elements(cm.horarios) h WHERE cm."idComision" IN (98,99);
  IF v_bloques <> 26 THEN RAISE EXCEPTION 'Se esperaban 26 bloques, hay %', v_bloques; END IF;

  SELECT count(*) INTO v_malas FROM public."ComisionMaterias" cm,
         jsonb_array_elements(cm.horarios) h
   WHERE cm."idComision" IN (98,99)
     AND (NOT (h ?& array['dia','hora_inicio','hora_fin'])
          OR (SELECT count(*) FROM jsonb_object_keys(h)) <> 3
          OR h->>'dia' NOT IN ('Lunes','Martes','Miercoles','Jueves','Viernes')
          OR h->>'hora_inicio' !~ '^[0-9]{1,2}:[0-9]{2}$'
          OR h->>'hora_fin'    !~ '^[0-9]{1,2}:[0-9]{2}$');
  IF v_malas > 0 THEN RAISE EXCEPTION '% bloque(s) con forma inválida', v_malas; END IF;

  RAISE NOTICE 'OK: 14 filas anuales, 26 bloques, forma válida.';
END $verif$;

COMMIT;
