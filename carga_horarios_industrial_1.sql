-- ============================================================
-- Horarios Ingeniería Industrial — 1er año
-- Fuente: "1er año industrial.xlsx" (hojas 1D1 a 1D7)
--
-- UPDATE puro: las 7 comisiones (103,104,105,106,107,108,109) y sus 8 materias ya
-- existen en `ComisionMaterias` con horarios NULL. No se crea ninguna
-- materia ni comisión, y no hacen falta franjas nuevas.
--
-- TODAS LAS MATERIAS QUEDAN COMO ANUALES (cuatrimestre = 0), pese a que
-- las 7 hojas se titulen "1er/Primer Cuatrimestre". Ese título ya
-- demostró ser resto de plantilla en Electrónica, donde hojas del mismo
-- archivo se contradecían entre sí. Lo que decide es el test de
-- `materia.horas_semanales` (hora cátedra = 45 min): hay UNA grilla por
-- hoja y entrega la carga semanal COMPLETA. De las 56 combinaciones
-- materia x comisión, 54 dan exactamente los módulos declarados:
--
--   Álgebra y Geometría Analítica  5 -> 5 en las 7 comisiones
--   Física I                       5 -> 5 en las 7
--   Química General                5 -> 5 en las 7
--   Informática I                  3 -> 3 en las 7
--   Pensamiento Sistémico          3 -> 3 en las 7
--   Ingeniería y Sociedad          2 -> 2 en las 7
--   Análisis Matemático I          5 -> 5 salvo 1D7, que da 4
--   Sistemas de Representación     3 -> 3 salvo 1D1, que da 4
--
-- Las 2 excepciones son de la fuente, no de la lectura: se verificó
-- celda por celda que en 1D7 Análisis 1 tiene sólo 4 celdas y en 1D1
-- Sistemas de Representación tiene 4 donde el plan declara 3. Tampoco
-- hay ninguna celda pintada sin texto en el archivo. Se carga lo que la
-- fuente dice.
--
-- Abreviaturas normalizadas antes de unir bloques: ISO = Ingeniería y
-- Sociedad, PS = Pensamiento Sistémico, SdR = Sistemas de
-- Representación, QG = Química General.
-- ============================================================

BEGIN;

-- ---------- Snapshot para rollback ----------
CREATE SCHEMA IF NOT EXISTS backup;
REVOKE ALL ON SCHEMA backup FROM anon, authenticated;

DROP TABLE IF EXISTS backup._bkp_industrial1_comisionmaterias;
CREATE TABLE backup._bkp_industrial1_comisionmaterias AS
SELECT * FROM public."ComisionMaterias" WHERE "idComision" IN (103,104,105,106,107,108,109);
REVOKE ALL ON backup._bkp_industrial1_comisionmaterias FROM anon, authenticated;

-- ---------- Guardas ----------
DO $guard$
DECLARE v int;
BEGIN
  SELECT count(*) INTO v FROM public.comision
   WHERE id IN (103,104,105,106,107,108,109) AND nombre IN ('1D1','1D2','1D3','1D4','1D5','1D6','1D7');
  IF v <> 7 THEN RAISE EXCEPTION 'Las comisiones 1D1..1D7 no son 103,104,105,106,107,108,109 (encontradas: %)', v; END IF;

  SELECT count(*) INTO v FROM public.materia WHERE id IN (1,2,3,5,38,39,40,41);
  IF v <> 8 THEN RAISE EXCEPTION 'Faltan materias de 1er año de Industrial (encontradas: %)', v; END IF;

  SELECT count(*) INTO v FROM public."ComisionMaterias" WHERE "idComision" IN (103,104,105,106,107,108,109);
  IF v <> 56 THEN RAISE EXCEPTION 'Se esperaban 56 filas ComisionMaterias, hay %', v; END IF;

  SELECT count(*) INTO v FROM backup._bkp_industrial1_comisionmaterias;
  IF v <> 56 THEN RAISE EXCEPTION 'El snapshot tiene % filas, se esperaban 56', v; END IF;
END $guard$;


-- ================= 1D1 (comision 103) =================
-- Análisis Matemático I — anual — Lun 8:00-9:30, Jue 10:25-12:50
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"8:00","hora_fin":"9:30"},
    {"dia":"Jueves","hora_inicio":"10:25","hora_fin":"12:50"}]'::jsonb
WHERE "idComision" = 103 AND "idMateria" = 1;
-- Álgebra y Geometría Analítica — anual — Mar 8:00-10:25, Mie 8:00-9:30
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"8:00","hora_fin":"10:25"},
    {"dia":"Miercoles","hora_inicio":"8:00","hora_fin":"9:30"}]'::jsonb
WHERE "idComision" = 103 AND "idMateria" = 2;
-- Física I — anual — Lun 9:40-14:00
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"9:40","hora_fin":"14:00"}]'::jsonb
WHERE "idComision" = 103 AND "idMateria" = 3;
-- Ingeniería y Sociedad — anual — Vie 9:40-11:10
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Viernes","hora_inicio":"9:40","hora_fin":"11:10"}]'::jsonb
WHERE "idComision" = 103 AND "idMateria" = 5;
-- Química General — anual — Mar 10:25-12:50, Vie 8:00-9:30
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"10:25","hora_fin":"12:50"},
    {"dia":"Viernes","hora_inicio":"8:00","hora_fin":"9:30"}]'::jsonb
WHERE "idComision" = 103 AND "idMateria" = 38;
-- Sistemas de Representación — anual — Mie 9:40-12:50
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Miercoles","hora_inicio":"9:40","hora_fin":"12:50"}]'::jsonb
WHERE "idComision" = 103 AND "idMateria" = 39;
-- Informática I — anual — Jue 8:00-10:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Jueves","hora_inicio":"8:00","hora_fin":"10:25"}]'::jsonb
WHERE "idComision" = 103 AND "idMateria" = 40;
-- Pensamiento Sistémico — anual — Vie 11:20-14:00
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Viernes","hora_inicio":"11:20","hora_fin":"14:00"}]'::jsonb
WHERE "idComision" = 103 AND "idMateria" = 41;

-- ================= 1D2 (comision 104) =================
-- Análisis Matemático I — anual — Jue 18:15-20:40, Vie 21:35-23:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Jueves","hora_inicio":"18:15","hora_fin":"20:40"},
    {"dia":"Viernes","hora_inicio":"21:35","hora_fin":"23:05"}]'::jsonb
WHERE "idComision" = 104 AND "idMateria" = 1;
-- Álgebra y Geometría Analítica — anual — Lun 19:00-20:40, Mie 20:40-23:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"19:00","hora_fin":"20:40"},
    {"dia":"Miercoles","hora_inicio":"20:40","hora_fin":"23:05"}]'::jsonb
WHERE "idComision" = 104 AND "idMateria" = 2;
-- Física I — anual — Mar 17:20-21:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"17:20","hora_fin":"21:25"}]'::jsonb
WHERE "idComision" = 104 AND "idMateria" = 3;
-- Ingeniería y Sociedad — anual — Lun 17:20-19:00
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"17:20","hora_fin":"19:00"}]'::jsonb
WHERE "idComision" = 104 AND "idMateria" = 5;
-- Química General — anual — Mar 21:35-23:05, Mie 18:15-20:40
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"21:35","hora_fin":"23:05"},
    {"dia":"Miercoles","hora_inicio":"18:15","hora_fin":"20:40"}]'::jsonb
WHERE "idComision" = 104 AND "idMateria" = 38;
-- Sistemas de Representación — anual — Jue 20:40-23:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Jueves","hora_inicio":"20:40","hora_fin":"23:05"}]'::jsonb
WHERE "idComision" = 104 AND "idMateria" = 39;
-- Informática I — anual — Vie 18:15-20:40
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Viernes","hora_inicio":"18:15","hora_fin":"20:40"}]'::jsonb
WHERE "idComision" = 104 AND "idMateria" = 40;
-- Pensamiento Sistémico — anual — Lun 20:40-23:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"20:40","hora_fin":"23:05"}]'::jsonb
WHERE "idComision" = 104 AND "idMateria" = 41;

-- ================= 1D3 (comision 105) =================
-- Análisis Matemático I — anual — Mie 8:00-10:25, Vie 10:25-12:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Miercoles","hora_inicio":"8:00","hora_fin":"10:25"},
    {"dia":"Viernes","hora_inicio":"10:25","hora_fin":"12:05"}]'::jsonb
WHERE "idComision" = 105 AND "idMateria" = 1;
-- Álgebra y Geometría Analítica — anual — Lun 8:00-10:25, Jue 8:00-9:30
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"8:00","hora_fin":"10:25"},
    {"dia":"Jueves","hora_inicio":"8:00","hora_fin":"9:30"}]'::jsonb
WHERE "idComision" = 105 AND "idMateria" = 2;
-- Física I — anual — Jue 9:40-14:00
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Jueves","hora_inicio":"9:40","hora_fin":"14:00"}]'::jsonb
WHERE "idComision" = 105 AND "idMateria" = 3;
-- Ingeniería y Sociedad — anual — Mar 9:40-11:10
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"9:40","hora_fin":"11:10"}]'::jsonb
WHERE "idComision" = 105 AND "idMateria" = 5;
-- Química General — anual — Mar 8:00-9:30, Mie 10:25-12:50
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"8:00","hora_fin":"9:30"},
    {"dia":"Miercoles","hora_inicio":"10:25","hora_fin":"12:50"}]'::jsonb
WHERE "idComision" = 105 AND "idMateria" = 38;
-- Sistemas de Representación — anual — Vie 8:00-10:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Viernes","hora_inicio":"8:00","hora_fin":"10:25"}]'::jsonb
WHERE "idComision" = 105 AND "idMateria" = 39;
-- Informática I — anual — Lun 10:25-12:50
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"10:25","hora_fin":"12:50"}]'::jsonb
WHERE "idComision" = 105 AND "idMateria" = 40;
-- Pensamiento Sistémico — anual — Mar 11:20-14:00
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"11:20","hora_fin":"14:00"}]'::jsonb
WHERE "idComision" = 105 AND "idMateria" = 41;

-- ================= 1D4 (comision 106) =================
-- Análisis Matemático I — anual — Lun 9:40-11:10, Mie 8:00-10:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"9:40","hora_fin":"11:10"},
    {"dia":"Miercoles","hora_inicio":"8:00","hora_fin":"10:25"}]'::jsonb
WHERE "idComision" = 106 AND "idMateria" = 1;
-- Álgebra y Geometría Analítica — anual — Mar 10:25-12:05, Vie 8:00-10:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"10:25","hora_fin":"12:05"},
    {"dia":"Viernes","hora_inicio":"8:00","hora_fin":"10:25"}]'::jsonb
WHERE "idComision" = 106 AND "idMateria" = 2;
-- Física I — anual — Lun 8:00-9:30, Mar 8:00-10:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"8:00","hora_fin":"9:30"},
    {"dia":"Martes","hora_inicio":"8:00","hora_fin":"10:25"}]'::jsonb
WHERE "idComision" = 106 AND "idMateria" = 3;
-- Ingeniería y Sociedad — anual — Lun 11:20-12:50
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"11:20","hora_fin":"12:50"}]'::jsonb
WHERE "idComision" = 106 AND "idMateria" = 5;
-- Química General — anual — Mar 12:05-14:00, Jue 8:00-10:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"12:05","hora_fin":"14:00"},
    {"dia":"Jueves","hora_inicio":"8:00","hora_fin":"10:25"}]'::jsonb
WHERE "idComision" = 106 AND "idMateria" = 38;
-- Sistemas de Representación — anual — Vie 10:25-12:50
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Viernes","hora_inicio":"10:25","hora_fin":"12:50"}]'::jsonb
WHERE "idComision" = 106 AND "idMateria" = 39;
-- Informática I — anual — Jue 10:25-12:50
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Jueves","hora_inicio":"10:25","hora_fin":"12:50"}]'::jsonb
WHERE "idComision" = 106 AND "idMateria" = 40;
-- Pensamiento Sistémico — anual — Mie 10:25-12:50
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Miercoles","hora_inicio":"10:25","hora_fin":"12:50"}]'::jsonb
WHERE "idComision" = 106 AND "idMateria" = 41;

-- ================= 1D5 (comision 107) =================
-- Análisis Matemático I — anual — Lun 14:55-16:25, Mie 13:15-15:40
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"14:55","hora_fin":"16:25"},
    {"dia":"Miercoles","hora_inicio":"13:15","hora_fin":"15:40"}]'::jsonb
WHERE "idComision" = 107 AND "idMateria" = 1;
-- Álgebra y Geometría Analítica — anual — Mar 13:15-15:40, Vie 14:55-16:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"13:15","hora_fin":"15:40"},
    {"dia":"Viernes","hora_inicio":"14:55","hora_fin":"16:25"}]'::jsonb
WHERE "idComision" = 107 AND "idMateria" = 2;
-- Física I — anual — Lun 16:35-18:05, Vie 12:05-12:50, Vie 13:15-14:45
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"16:35","hora_fin":"18:05"},
    {"dia":"Viernes","hora_inicio":"12:05","hora_fin":"12:50"},
    {"dia":"Viernes","hora_inicio":"13:15","hora_fin":"14:45"}]'::jsonb
WHERE "idComision" = 107 AND "idMateria" = 3;
-- Ingeniería y Sociedad — anual — Lun 13:15-14:45
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"13:15","hora_fin":"14:45"}]'::jsonb
WHERE "idComision" = 107 AND "idMateria" = 5;
-- Química General — anual — Mar 15:40-18:05, Vie 16:35-18:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"15:40","hora_fin":"18:05"},
    {"dia":"Viernes","hora_inicio":"16:35","hora_fin":"18:05"}]'::jsonb
WHERE "idComision" = 107 AND "idMateria" = 38;
-- Sistemas de Representación — anual — Jue 15:40-18:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Jueves","hora_inicio":"15:40","hora_fin":"18:05"}]'::jsonb
WHERE "idComision" = 107 AND "idMateria" = 39;
-- Informática I — anual — Mie 15:40-18:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Miercoles","hora_inicio":"15:40","hora_fin":"18:05"}]'::jsonb
WHERE "idComision" = 107 AND "idMateria" = 40;
-- Pensamiento Sistémico — anual — Jue 13:15-15:40
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Jueves","hora_inicio":"13:15","hora_fin":"15:40"}]'::jsonb
WHERE "idComision" = 107 AND "idMateria" = 41;

-- ================= 1D6 (comision 108) =================
-- Análisis Matemático I — anual — Mar 9:40-11:10, Mie 10:25-12:50
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"9:40","hora_fin":"11:10"},
    {"dia":"Miercoles","hora_inicio":"10:25","hora_fin":"12:50"}]'::jsonb
WHERE "idComision" = 108 AND "idMateria" = 1;
-- Álgebra y Geometría Analítica — anual — Lun 10:25-12:05, Mie 8:00-10:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"10:25","hora_fin":"12:05"},
    {"dia":"Miercoles","hora_inicio":"8:00","hora_fin":"10:25"}]'::jsonb
WHERE "idComision" = 108 AND "idMateria" = 2;
-- Física I — anual — Mar 8:00-9:30, Vie 10:25-12:50
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"8:00","hora_fin":"9:30"},
    {"dia":"Viernes","hora_inicio":"10:25","hora_fin":"12:50"}]'::jsonb
WHERE "idComision" = 108 AND "idMateria" = 3;
-- Ingeniería y Sociedad — anual — Lun 12:05-14:00
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"12:05","hora_fin":"14:00"}]'::jsonb
WHERE "idComision" = 108 AND "idMateria" = 5;
-- Química General — anual — Mar 11:20-12:50, Jue 8:00-10:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"11:20","hora_fin":"12:50"},
    {"dia":"Jueves","hora_inicio":"8:00","hora_fin":"10:25"}]'::jsonb
WHERE "idComision" = 108 AND "idMateria" = 38;
-- Sistemas de Representación — anual — Jue 10:25-12:50
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Jueves","hora_inicio":"10:25","hora_fin":"12:50"}]'::jsonb
WHERE "idComision" = 108 AND "idMateria" = 39;
-- Informática I — anual — Lun 8:00-10:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"8:00","hora_fin":"10:25"}]'::jsonb
WHERE "idComision" = 108 AND "idMateria" = 40;
-- Pensamiento Sistémico — anual — Vie 8:00-10:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Viernes","hora_inicio":"8:00","hora_fin":"10:25"}]'::jsonb
WHERE "idComision" = 108 AND "idMateria" = 41;

-- ================= 1D7 (comision 109) =================
-- Análisis Matemático I — anual — Mar 14:00-15:40, Jue 12:05-12:50, Jue 13:15-14:00
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"14:00","hora_fin":"15:40"},
    {"dia":"Jueves","hora_inicio":"12:05","hora_fin":"12:50"},
    {"dia":"Jueves","hora_inicio":"13:15","hora_fin":"14:00"}]'::jsonb
WHERE "idComision" = 109 AND "idMateria" = 1;
-- Álgebra y Geometría Analítica — anual — Lun 14:00-15:40, Vie 14:00-16:25
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"14:00","hora_fin":"15:40"},
    {"dia":"Viernes","hora_inicio":"14:00","hora_fin":"16:25"}]'::jsonb
WHERE "idComision" = 109 AND "idMateria" = 2;
-- Física I — anual — Mar 15:40-18:05, Jue 14:00-15:40
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Martes","hora_inicio":"15:40","hora_fin":"18:05"},
    {"dia":"Jueves","hora_inicio":"14:00","hora_fin":"15:40"}]'::jsonb
WHERE "idComision" = 109 AND "idMateria" = 3;
-- Ingeniería y Sociedad — anual — Vie 16:35-18:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Viernes","hora_inicio":"16:35","hora_fin":"18:05"}]'::jsonb
WHERE "idComision" = 109 AND "idMateria" = 5;
-- Química General — anual — Mie 15:40-18:05, Vie 12:05-12:50, Vie 13:15-14:00
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Miercoles","hora_inicio":"15:40","hora_fin":"18:05"},
    {"dia":"Viernes","hora_inicio":"12:05","hora_fin":"12:50"},
    {"dia":"Viernes","hora_inicio":"13:15","hora_fin":"14:00"}]'::jsonb
WHERE "idComision" = 109 AND "idMateria" = 38;
-- Sistemas de Representación — anual — Mie 13:15-15:40
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Miercoles","hora_inicio":"13:15","hora_fin":"15:40"}]'::jsonb
WHERE "idComision" = 109 AND "idMateria" = 39;
-- Informática I — anual — Lun 15:40-18:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"15:40","hora_fin":"18:05"}]'::jsonb
WHERE "idComision" = 109 AND "idMateria" = 40;
-- Pensamiento Sistémico — anual — Jue 15:40-18:05
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Jueves","hora_inicio":"15:40","hora_fin":"18:05"}]'::jsonb
WHERE "idComision" = 109 AND "idMateria" = 41;

-- ---------- Verificación ----------
DO $verif$
DECLARE v int;
BEGIN
  SELECT count(*) INTO v FROM public."ComisionMaterias"
   WHERE "idComision" IN (103,104,105,106,107,108,109) AND horarios IS NOT NULL AND jsonb_array_length(horarios) > 0;
  IF v <> 56 THEN RAISE EXCEPTION 'Se esperaban 56 filas con horarios, hay %', v; END IF;

  SELECT count(*) INTO v FROM public."ComisionMaterias"
   WHERE "idComision" IN (103,104,105,106,107,108,109) AND cuatrimestre IS DISTINCT FROM 0;
  IF v > 0 THEN RAISE EXCEPTION '% fila(s) no quedaron como anuales', v; END IF;

  SELECT count(*) INTO v FROM public."ComisionMaterias" cm,
         jsonb_array_elements(cm.horarios) h WHERE cm."idComision" IN (103,104,105,106,107,108,109);
  IF v <> 84 THEN RAISE EXCEPTION 'Se esperaban 84 bloques, hay %', v; END IF;

  SELECT count(*) INTO v FROM public."ComisionMaterias" cm,
         jsonb_array_elements(cm.horarios) h
   WHERE cm."idComision" IN (103,104,105,106,107,108,109)
     AND (NOT (h ?& array['dia','hora_inicio','hora_fin'])
          OR (SELECT count(*) FROM jsonb_object_keys(h)) <> 3
          OR h->>'dia' NOT IN ('Lunes','Martes','Miercoles','Jueves','Viernes')
          OR h->>'hora_inicio' !~ '^[0-9]{1,2}:[0-9]{2}$'
          OR h->>'hora_fin'    !~ '^[0-9]{1,2}:[0-9]{2}$');
  IF v > 0 THEN RAISE EXCEPTION '% bloque(s) con forma inválida', v; END IF;

  RAISE NOTICE 'OK: 56 filas anuales, 84 bloques, forma válida.';
END $verif$;

COMMIT;
