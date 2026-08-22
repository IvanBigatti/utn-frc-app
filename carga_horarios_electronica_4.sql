-- ============================================================
-- Horarios Ingeniería Electrónica — 4to año
-- Fuente: "4to año electronica.xlsx" (hojas 4R1, 4R2)
--
-- UPDATE puro: las 2 comisiones (96, 97) y sus 7 materias ya existen en
-- `ComisionMaterias` con horarios NULL. No se crea nada.
--
-- TODAS LAS MATERIAS QUEDAN COMO ANUALES (cuatrimestre = 0), por el
-- mismo criterio que 3er año: hay UNA sola grilla por hoja y entrega la
-- carga semanal completa. Las dos hojas se titulan "Primer Cuatrimestre"
-- pero ese título es resto de plantilla — en 3er año el mismo archivo se
-- contradecía entre hojas. Contra `materia.horas_semanales` (hora
-- cátedra = 45 min), 13 de las 14 filas cierran:
--
--   Seguridad, Higiene y Medio Ambiente  2 hs -> 1h30 | 4R1 1h30 | 4R2 1h30
--   Máquinas e Instalaciones Eléctricas  4 hs -> 3h00 | 4R1 3h10 | 4R2 3h10
--   Sistemas de Comunicaciones           4 hs -> 3h00 | 4R1 3h10 | 4R2 3h00
--   Medidas Electrónicas I               5 hs -> 3h45 | 4R1 3h55 | 4R2 3h45
--   Teoría de los Circuitos II           5 hs -> 3h45 | 4R1 3h55 | 4R2 3h55
--   Técnicas Digitales II                5 hs -> 3h45 | 4R1 3h55 | 4R2 3h55
--   Electrónica Aplicada II              5 hs -> 3h45 | 4R1 1h40 | 4R2 3h55
--                                                       ^^^^^^^^
-- HUECO EN LA FUENTE: en 4R1, Electrónica Aplicada II sólo tiene dos
-- celdas en el Excel (miércoles 19:00-19:45 y 19:55-20:40), 1h40 contra
-- las 3h45 que corresponden a 5 horas cátedra. Se verificó que no es un
-- problema de lectura: no hay ninguna celda pintada con su color y sin
-- texto, ni en esta hoja ni en ningún otro archivo de Electrónica. Falta
-- en el Excel. Se carga lo que la fuente dice; corregir requiere la
-- grilla completa de 4R1.
--
-- Ojo con el nombre: el Excel la llama "Seguridad e Higiene Industrial"
-- y la base "Seguridad, Higiene y Medio Ambiente" (id 142). Es la misma
-- materia: las otras 6 mapean exactamente y queda 1 a 1 por descarte.
--
-- Otros criterios, iguales a los años anteriores: los recreos son bandas
-- D:H fusionadas y vacías y se atraviesan sólo si el hueco real es de
-- hasta 15 min (los 13 de acá son todos de 10 min). Abreviaturas
-- normalizadas: ME 1 = Medidas Electrónicas 1, EA 2 = Electrónica
-- Aplicada 2, TC 2 = Teoría de los Circuitos 2, TD 2 = Técnicas
-- Digitales 2, SC = Sistemas de Comunicaciones.
--
-- Requiere agregar "17:30" a FRANJAS en app/armadorHorarios/page.tsx:
-- este Excel parte el módulo 16:35-18:05 en 16:35-17:30 y 17:30-18:05.
-- ============================================================

BEGIN;

-- ---------- Snapshot para rollback ----------
CREATE SCHEMA IF NOT EXISTS backup;
REVOKE ALL ON SCHEMA backup FROM anon, authenticated;

DROP TABLE IF EXISTS backup._bkp_electronica4_comisionmaterias;
CREATE TABLE backup._bkp_electronica4_comisionmaterias AS
SELECT * FROM public."ComisionMaterias" WHERE "idComision" IN (96, 97);
REVOKE ALL ON backup._bkp_electronica4_comisionmaterias FROM anon, authenticated;

-- ---------- Guardas ----------
DO $guard$
DECLARE v int;
BEGIN
  SELECT count(*) INTO v FROM public.comision
   WHERE id IN (96,97) AND nombre IN ('4R1','4R2');
  IF v <> 2 THEN RAISE EXCEPTION 'Las comisiones 4R1/4R2 no son 96/97 (encontradas: %)', v; END IF;

  SELECT count(*) INTO v FROM public.materia WHERE id IN (125,136,137,138,139,140,142);
  IF v <> 7 THEN RAISE EXCEPTION 'Faltan materias de 4to año de Electrónica (encontradas: %)', v; END IF;

  SELECT count(*) INTO v FROM public."ComisionMaterias" WHERE "idComision" IN (96,97);
  IF v <> 14 THEN RAISE EXCEPTION 'Se esperaban 14 filas ComisionMaterias, hay %', v; END IF;

  SELECT count(*) INTO v FROM backup._bkp_electronica4_comisionmaterias;
  IF v <> 14 THEN RAISE EXCEPTION 'El snapshot tiene % filas, se esperaban 14', v; END IF;
END $guard$;


-- ================= 4R1 (comision 96) =================
-- Máquinas e Instalaciones Eléctricas — anual — 3h10 — Mar 18:15-21:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"18:15","hora_fin":"21:25"}]'::jsonb
WHERE "idComision" = 96 AND "idMateria" = 125;
-- Técnicas Digitales II — anual — 3h55 — Mar 21:35-23:05, Jue 18:15-20:40
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"21:35","hora_fin":"23:05"},
    {"dia":"Jueves","hora_inicio":"18:15","hora_fin":"20:40"}]'::jsonb
WHERE "idComision" = 96 AND "idMateria" = 136;
-- Medidas Electrónicas I — anual — 3h55 — Lun 17:30-19:00, Jue 20:40-23:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"17:30","hora_fin":"19:00"},
    {"dia":"Jueves","hora_inicio":"20:40","hora_fin":"23:05"}]'::jsonb
WHERE "idComision" = 96 AND "idMateria" = 137;
-- Teoría de los Circuitos II — anual — 3h55 — Mie 20:40-23:05, Vie 18:15-19:45
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Miercoles","hora_inicio":"20:40","hora_fin":"23:05"},
    {"dia":"Viernes","hora_inicio":"18:15","hora_fin":"19:45"}]'::jsonb
WHERE "idComision" = 96 AND "idMateria" = 138;
-- Sistemas de Comunicaciones — anual — 3h10 — Lun 19:00-20:40, Vie 19:55-21:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"19:00","hora_fin":"20:40"},
    {"dia":"Viernes","hora_inicio":"19:55","hora_fin":"21:25"}]'::jsonb
WHERE "idComision" = 96 AND "idMateria" = 139;
-- Electrónica Aplicada II — anual — 1h40 — Mie 19:00-20:40
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Miercoles","hora_inicio":"19:00","hora_fin":"20:40"}]'::jsonb
WHERE "idComision" = 96 AND "idMateria" = 140;
-- Seguridad, Higiene y Medio Ambiente — anual — 1h30 — Vie 21:35-23:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Viernes","hora_inicio":"21:35","hora_fin":"23:05"}]'::jsonb
WHERE "idComision" = 96 AND "idMateria" = 142;

-- ================= 4R2 (comision 97) =================
-- Máquinas e Instalaciones Eléctricas — anual — 3h10 — Jue 19:55-23:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Jueves","hora_inicio":"19:55","hora_fin":"23:05"}]'::jsonb
WHERE "idComision" = 97 AND "idMateria" = 125;
-- Técnicas Digitales II — anual — 3h55 — Mar 17:30-21:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"17:30","hora_fin":"21:25"}]'::jsonb
WHERE "idComision" = 97 AND "idMateria" = 136;
-- Medidas Electrónicas I — anual — 3h45 — Lun 19:55-21:25, Jue 17:30-19:45
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"19:55","hora_fin":"21:25"},
    {"dia":"Jueves","hora_inicio":"17:30","hora_fin":"19:45"}]'::jsonb
WHERE "idComision" = 97 AND "idMateria" = 137;
-- Teoría de los Circuitos II — anual — 3h55 — Mie 18:15-20:40, Vie 19:55-21:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Miercoles","hora_inicio":"18:15","hora_fin":"20:40"},
    {"dia":"Viernes","hora_inicio":"19:55","hora_fin":"21:25"}]'::jsonb
WHERE "idComision" = 97 AND "idMateria" = 138;
-- Sistemas de Comunicaciones — anual — 3h00 — Lun 21:35-23:05, Vie 21:35-23:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"21:35","hora_fin":"23:05"},
    {"dia":"Viernes","hora_inicio":"21:35","hora_fin":"23:05"}]'::jsonb
WHERE "idComision" = 97 AND "idMateria" = 139;
-- Electrónica Aplicada II — anual — 3h55 — Lun 18:15-19:45, Mie 20:40-23:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"18:15","hora_fin":"19:45"},
    {"dia":"Miercoles","hora_inicio":"20:40","hora_fin":"23:05"}]'::jsonb
WHERE "idComision" = 97 AND "idMateria" = 140;
-- Seguridad, Higiene y Medio Ambiente — anual — 1h30 — Vie 18:15-19:45
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Viernes","hora_inicio":"18:15","hora_fin":"19:45"}]'::jsonb
WHERE "idComision" = 97 AND "idMateria" = 142;

-- ---------- Verificación ----------
DO $verif$
DECLARE v_filas int; v_bloques int; v_malas int; v_cuatri int;
BEGIN
  SELECT count(*) INTO v_filas FROM public."ComisionMaterias"
   WHERE "idComision" IN (96,97)
     AND horarios IS NOT NULL AND jsonb_array_length(horarios) > 0;
  IF v_filas <> 14 THEN RAISE EXCEPTION 'Se esperaban 14 filas con horarios, hay %', v_filas; END IF;

  SELECT count(*) INTO v_cuatri FROM public."ComisionMaterias"
   WHERE "idComision" IN (96,97) AND cuatrimestre IS DISTINCT FROM 0;
  IF v_cuatri > 0 THEN RAISE EXCEPTION '% fila(s) no quedaron como anuales', v_cuatri; END IF;

  SELECT count(*) INTO v_bloques FROM public."ComisionMaterias" cm,
         jsonb_array_elements(cm.horarios) h WHERE cm."idComision" IN (96,97);
  IF v_bloques <> 22 THEN RAISE EXCEPTION 'Se esperaban 22 bloques, hay %', v_bloques; END IF;

  SELECT count(*) INTO v_malas FROM public."ComisionMaterias" cm,
         jsonb_array_elements(cm.horarios) h
   WHERE cm."idComision" IN (96,97)
     AND (NOT (h ?& array['dia','hora_inicio','hora_fin'])
          OR (SELECT count(*) FROM jsonb_object_keys(h)) <> 3
          OR h->>'dia' NOT IN ('Lunes','Martes','Miercoles','Jueves','Viernes')
          OR h->>'hora_inicio' !~ '^[0-9]{1,2}:[0-9]{2}$'
          OR h->>'hora_fin'    !~ '^[0-9]{1,2}:[0-9]{2}$');
  IF v_malas > 0 THEN RAISE EXCEPTION '% bloque(s) con forma inválida', v_malas; END IF;

  RAISE NOTICE 'OK: 14 filas anuales, 22 bloques, forma válida.';
END $verif$;

COMMIT;
