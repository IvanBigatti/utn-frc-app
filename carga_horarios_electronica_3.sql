-- ============================================================
-- Horarios Ingeniería Electrónica — 3er año
-- Fuente: "3er año electronica.xlsx" (hojas 3R1, 3R2, 3R3, 3R4)
--
-- UPDATE puro: las 4 comisiones (92, 93, 94, 95) y sus 7 materias ya
-- existen en `ComisionMaterias` con horarios NULL. No se crea nada.
-- No hacen falta franjas nuevas: todos los bordes ya están en FRANJAS.
--
-- TODAS LAS MATERIAS QUEDAN COMO ANUALES (cuatrimestre = 0).
-- A diferencia de 1er y 2do año, cada hoja trae UNA sola grilla, y los
-- títulos se contradicen entre sí: 3R1 y 3R3 dicen sólo "Turno Noche",
-- mientras 3R2 y 3R4 dicen "Primer Cuatrimestre". Ese "Primer
-- Cuatrimestre" es resto de plantilla, no un dato.
--
-- La evidencia que decide es `materia.horas_semanales`. La hora cátedra
-- dura 45 min, y la grilla única entrega la carga semanal COMPLETA de
-- las 7 materias (el excedente son los recreos de 10 min que se unen):
--
--   Inglés II                   2 hs -> 1h30 esperado, 1h30 en la grilla
--   Legislación                 2 hs -> 1h30                 1h30
--   Técnicas Digitales I        4 hs -> 3h00                 3h00
--   Medios de Enlace            4 hs -> 3h00                 3h00
--   Dispositivos Electrónicos   5 hs -> 3h45                 3h55
--   Electrónica Aplicada I      5 hs -> 3h45                 3h55
--   Teoría de los Circuitos I   6 hs -> 4h30                 4h50
--
-- Si la grilla fuera sólo del 1er cuatrimestre, el alumno cursaría 28
-- horas cátedra semanales en la primera mitad del año y ninguna en la
-- segunda. Además 3Q1 (Eléctrica) y 3S2/3S3 (Mecánica), que también son
-- grillas de año completo, ya están cargadas sin partir por cuatrimestre.
--
-- Otros criterios de lectura, iguales a los años anteriores:
--  · Los recreos son bandas D:H fusionadas y vacías; se atraviesan sólo
--    si el hueco real es de hasta 15 min. Los 20 atravesados acá son
--    todos de 10 min.
--  · 3R1 tiene un salto dentro de la grilla (la fila r6 termina 14:55 y
--    la siguiente arranca 16:35). El parser corta ahí: un salto de grilla
--    no es un recreo.
--  · Abreviaturas normalizadas: TC = Teoría de los Circuitos,
--    TD = Técnicas Digitales 1, DE = Dispositivos Electrónicos,
--    EA 1 = Electrónica Aplicada 1, ME = Medios de Enlace.
-- ============================================================

BEGIN;

-- ---------- Snapshot para rollback ----------
CREATE SCHEMA IF NOT EXISTS backup;
REVOKE ALL ON SCHEMA backup FROM anon, authenticated;

DROP TABLE IF EXISTS backup._bkp_electronica3_comisionmaterias;
CREATE TABLE backup._bkp_electronica3_comisionmaterias AS
SELECT * FROM public."ComisionMaterias" WHERE "idComision" IN (92, 93, 94, 95);
REVOKE ALL ON backup._bkp_electronica3_comisionmaterias FROM anon, authenticated;

-- ---------- Guardas ----------
DO $guard$
DECLARE v int;
BEGIN
  SELECT count(*) INTO v FROM public.comision
   WHERE id IN (92,93,94,95) AND nombre IN ('3R1','3R2','3R3','3R4');
  IF v <> 4 THEN RAISE EXCEPTION 'Las comisiones 3R1..3R4 no son 92..95 (encontradas: %)', v; END IF;

  SELECT count(*) INTO v FROM public.materia WHERE id IN (8,24,131,132,133,134,135);
  IF v <> 7 THEN RAISE EXCEPTION 'Faltan materias de 3er año de Electrónica (encontradas: %)', v; END IF;

  SELECT count(*) INTO v FROM public."ComisionMaterias" WHERE "idComision" IN (92,93,94,95);
  IF v <> 28 THEN RAISE EXCEPTION 'Se esperaban 28 filas ComisionMaterias, hay %', v; END IF;

  SELECT count(*) INTO v FROM backup._bkp_electronica3_comisionmaterias;
  IF v <> 28 THEN RAISE EXCEPTION 'El snapshot tiene % filas, se esperaban 28', v; END IF;
END $guard$;


-- ================= 3R1 (comision 92) =================
-- Inglés II — anual — 1h30 — Lun 13:15-14:45
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"13:15","hora_fin":"14:45"}]'::jsonb
WHERE "idComision" = 92 AND "idMateria" = 8;
-- Legislación — anual — 1h30 — Mie 19:55-21:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Miercoles","hora_inicio":"19:55","hora_fin":"21:25"}]'::jsonb
WHERE "idComision" = 92 AND "idMateria" = 24;
-- Teoría de los Circuitos I — anual — 4h50 — Lun 20:40-23:05, Vie 18:15-20:40
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"20:40","hora_fin":"23:05"},
    {"dia":"Viernes","hora_inicio":"18:15","hora_fin":"20:40"}]'::jsonb
WHERE "idComision" = 92 AND "idMateria" = 131;
-- Técnicas Digitales I — anual — 3h00 — Mar 19:55-21:25, Mie 18:15-19:45
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"19:55","hora_fin":"21:25"},
    {"dia":"Miercoles","hora_inicio":"18:15","hora_fin":"19:45"}]'::jsonb
WHERE "idComision" = 92 AND "idMateria" = 132;
-- Dispositivos Electrónicos — anual — 3h55 — Mar 18:15-19:45, Jue 19:55-22:20
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"18:15","hora_fin":"19:45"},
    {"dia":"Jueves","hora_inicio":"19:55","hora_fin":"22:20"}]'::jsonb
WHERE "idComision" = 92 AND "idMateria" = 133;
-- Electrónica Aplicada I — anual — 3h55 — Lun 18:15-20:40, Jue 18:15-19:45
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"18:15","hora_fin":"20:40"},
    {"dia":"Jueves","hora_inicio":"18:15","hora_fin":"19:45"}]'::jsonb
WHERE "idComision" = 92 AND "idMateria" = 134;
-- Medios de Enlace — anual — 3h00 — Mar 21:35-23:05, Mie 21:35-23:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"21:35","hora_fin":"23:05"},
    {"dia":"Miercoles","hora_inicio":"21:35","hora_fin":"23:05"}]'::jsonb
WHERE "idComision" = 92 AND "idMateria" = 135;

-- ================= 3R2 (comision 93) =================
-- Inglés II — anual — 1h30 — Lun 16:35-18:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"16:35","hora_fin":"18:05"}]'::jsonb
WHERE "idComision" = 93 AND "idMateria" = 8;
-- Legislación — anual — 1h30 — Mar 18:15-19:45
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"18:15","hora_fin":"19:45"}]'::jsonb
WHERE "idComision" = 93 AND "idMateria" = 24;
-- Teoría de los Circuitos I — anual — 4h50 — Lun 18:15-20:40, Vie 18:15-20:40
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"18:15","hora_fin":"20:40"},
    {"dia":"Viernes","hora_inicio":"18:15","hora_fin":"20:40"}]'::jsonb
WHERE "idComision" = 93 AND "idMateria" = 131;
-- Técnicas Digitales I — anual — 3h00 — Mar 21:35-23:05, Jue 18:15-19:45
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"21:35","hora_fin":"23:05"},
    {"dia":"Jueves","hora_inicio":"18:15","hora_fin":"19:45"}]'::jsonb
WHERE "idComision" = 93 AND "idMateria" = 132;
-- Dispositivos Electrónicos — anual — 3h55 — Mar 19:55-21:25, Mie 18:15-20:40
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"19:55","hora_fin":"21:25"},
    {"dia":"Miercoles","hora_inicio":"18:15","hora_fin":"20:40"}]'::jsonb
WHERE "idComision" = 93 AND "idMateria" = 133;
-- Electrónica Aplicada I — anual — 3h55 — Mie 20:40-23:05, Jue 19:55-21:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Miercoles","hora_inicio":"20:40","hora_fin":"23:05"},
    {"dia":"Jueves","hora_inicio":"19:55","hora_fin":"21:25"}]'::jsonb
WHERE "idComision" = 93 AND "idMateria" = 134;
-- Medios de Enlace — anual — 3h10 — Lun 20:40-22:20, Jue 21:35-23:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"20:40","hora_fin":"22:20"},
    {"dia":"Jueves","hora_inicio":"21:35","hora_fin":"23:05"}]'::jsonb
WHERE "idComision" = 93 AND "idMateria" = 135;

-- ================= 3R3 (comision 94) =================
-- Inglés II — anual — 1h30 — Jue 16:35-18:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Jueves","hora_inicio":"16:35","hora_fin":"18:05"}]'::jsonb
WHERE "idComision" = 94 AND "idMateria" = 8;
-- Legislación — anual — 1h30 — Jue 18:15-19:45
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Jueves","hora_inicio":"18:15","hora_fin":"19:45"}]'::jsonb
WHERE "idComision" = 94 AND "idMateria" = 24;
-- Teoría de los Circuitos I — anual — 4h50 — Mar 19:55-22:20, Mie 18:15-20:40
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"19:55","hora_fin":"22:20"},
    {"dia":"Miercoles","hora_inicio":"18:15","hora_fin":"20:40"}]'::jsonb
WHERE "idComision" = 94 AND "idMateria" = 131;
-- Técnicas Digitales I — anual — 3h00 — Lun 21:35-23:05, Mar 18:15-19:45
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"21:35","hora_fin":"23:05"},
    {"dia":"Martes","hora_inicio":"18:15","hora_fin":"19:45"}]'::jsonb
WHERE "idComision" = 94 AND "idMateria" = 132;
-- Dispositivos Electrónicos — anual — 3h55 — Lun 19:55-21:25, Mie 20:40-23:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"19:55","hora_fin":"21:25"},
    {"dia":"Miercoles","hora_inicio":"20:40","hora_fin":"23:05"}]'::jsonb
WHERE "idComision" = 94 AND "idMateria" = 133;
-- Electrónica Aplicada I — anual — 3h55 — Jue 21:35-23:05, Vie 20:40-23:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Jueves","hora_inicio":"21:35","hora_fin":"23:05"},
    {"dia":"Viernes","hora_inicio":"20:40","hora_fin":"23:05"}]'::jsonb
WHERE "idComision" = 94 AND "idMateria" = 134;
-- Medios de Enlace — anual — 3h00 — Lun 18:15-19:45, Jue 19:55-21:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"18:15","hora_fin":"19:45"},
    {"dia":"Jueves","hora_inicio":"19:55","hora_fin":"21:25"}]'::jsonb
WHERE "idComision" = 94 AND "idMateria" = 135;

-- ================= 3R4 (comision 95) =================
-- Inglés II — anual — 1h30 — Lun 11:20-12:50
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"11:20","hora_fin":"12:50"}]'::jsonb
WHERE "idComision" = 95 AND "idMateria" = 8;
-- Legislación — anual — 1h30 — Jue 14:55-16:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Jueves","hora_inicio":"14:55","hora_fin":"16:25"}]'::jsonb
WHERE "idComision" = 95 AND "idMateria" = 24;
-- Teoría de los Circuitos I — anual — 4h50 — Mar 15:40-18:05, Vie 15:40-18:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"15:40","hora_fin":"18:05"},
    {"dia":"Viernes","hora_inicio":"15:40","hora_fin":"18:05"}]'::jsonb
WHERE "idComision" = 95 AND "idMateria" = 131;
-- Técnicas Digitales I — anual — 3h10 — Mie 14:00-15:40, Jue 16:35-18:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Miercoles","hora_inicio":"14:00","hora_fin":"15:40"},
    {"dia":"Jueves","hora_inicio":"16:35","hora_fin":"18:05"}]'::jsonb
WHERE "idComision" = 95 AND "idMateria" = 132;
-- Dispositivos Electrónicos — anual — 4h05 — Lun 14:00-16:25, Mie 15:40-17:20
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"14:00","hora_fin":"16:25"},
    {"dia":"Miercoles","hora_inicio":"15:40","hora_fin":"17:20"}]'::jsonb
WHERE "idComision" = 95 AND "idMateria" = 133;
-- Electrónica Aplicada I — anual — 3h55 — Jue 13:15-14:45, Vie 13:15-15:40
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Jueves","hora_inicio":"13:15","hora_fin":"14:45"},
    {"dia":"Viernes","hora_inicio":"13:15","hora_fin":"15:40"}]'::jsonb
WHERE "idComision" = 95 AND "idMateria" = 134;
-- Medios de Enlace — anual — 3h10 — Lun 16:35-18:05, Mar 14:00-15:40
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"16:35","hora_fin":"18:05"},
    {"dia":"Martes","hora_inicio":"14:00","hora_fin":"15:40"}]'::jsonb
WHERE "idComision" = 95 AND "idMateria" = 135;

-- ---------- Verificación ----------
DO $verif$
DECLARE v_filas int; v_bloques int; v_malas int; v_cuatri int;
BEGIN
  SELECT count(*) INTO v_filas FROM public."ComisionMaterias"
   WHERE "idComision" IN (92,93,94,95)
     AND horarios IS NOT NULL AND jsonb_array_length(horarios) > 0;
  IF v_filas <> 28 THEN RAISE EXCEPTION 'Se esperaban 28 filas con horarios, hay %', v_filas; END IF;

  SELECT count(*) INTO v_cuatri FROM public."ComisionMaterias"
   WHERE "idComision" IN (92,93,94,95) AND cuatrimestre IS DISTINCT FROM 0;
  IF v_cuatri > 0 THEN RAISE EXCEPTION '% fila(s) no quedaron como anuales', v_cuatri; END IF;

  SELECT count(*) INTO v_bloques FROM public."ComisionMaterias" cm,
         jsonb_array_elements(cm.horarios) h WHERE cm."idComision" IN (92,93,94,95);
  IF v_bloques <> 48 THEN RAISE EXCEPTION 'Se esperaban 48 bloques, hay %', v_bloques; END IF;

  SELECT count(*) INTO v_malas FROM public."ComisionMaterias" cm,
         jsonb_array_elements(cm.horarios) h
   WHERE cm."idComision" IN (92,93,94,95)
     AND (NOT (h ?& array['dia','hora_inicio','hora_fin'])
          OR (SELECT count(*) FROM jsonb_object_keys(h)) <> 3
          OR h->>'dia' NOT IN ('Lunes','Martes','Miercoles','Jueves','Viernes')
          OR h->>'hora_inicio' !~ '^[0-9]{1,2}:[0-9]{2}$'
          OR h->>'hora_fin'    !~ '^[0-9]{1,2}:[0-9]{2}$');
  IF v_malas > 0 THEN RAISE EXCEPTION '% bloque(s) con forma inválida', v_malas; END IF;

  RAISE NOTICE 'OK: 28 filas anuales, 48 bloques, forma válida.';
END $verif$;

COMMIT;
