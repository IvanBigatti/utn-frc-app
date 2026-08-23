-- ============================================================
-- Horarios Ingeniería Electrónica — 6to año
-- Fuente: "6to año.xlsx" (hojas 6R1, 6R2, 6R3 y la compartida 6R16R2)
--
-- A diferencia de los años 1 a 5, este NO es un UPDATE puro: de las 14
-- materias del Excel, 12 no existían en la base. Se crean como
-- ELECTIVAS, con el sufijo "(electiva)" que ya usan las 48 electivas
-- cargadas de Sistemas, Química, Civil, Mecánica y Eléctrica.
--
-- Economía (18) ya estaba vinculada a las 3 comisiones sin horarios: es
-- un UPDATE. Proyecto Final (36) existía pero sin vincular a 6R1/6R2/6R3.
-- Ninguna de las dos es electiva y así quedan.
--
-- `materia.id` es IDENTITY, así que las materias nuevas no llevan id
-- explícito y las filas de ComisionMaterias las referencian por nombre.
-- Todos los INSERT están guardados con NOT EXISTS / ON CONFLICT, así que
-- el script se puede volver a correr sin duplicar nada.
--
-- No hacen falta franjas nuevas: todos los bordes ya están en FRANJAS.
--
-- ---------- La hoja compartida 6R16R2 ----------
-- Sirve a 6R1 y 6R2 en turno tarde, y NO tiene cinco columnas de día:
-- miércoles y jueves están partidos en dos columnas paralelas —electivas
-- que se dictan a la misma hora, el alumno elige una— y la grilla llega
-- hasta la J. Un parser que asuma D..H lee días equivocados y se pierde
-- columnas enteras. Sus 4 materias se cargan en AMBAS comisiones.
--
-- Por eso hay solapamientos esperados entre electivas del mismo día:
-- Fundamentos de Robótica Móvil (jueves 13:15-18:05) y Fundamentos de
-- Acústica (jueves 15:40-18:05) se pisan a propósito. No es un error.
--
-- ---------- Proyecto Final duplicado ----------
-- Aparece en las hojas nocturnas como viernes 16:35-23:05 y otra vez en
-- la compartida como viernes 16:50-18:05. El segundo está contenido en
-- el primero: se descarta por redundante. Por eso tampoco se agrega la
-- franja "16:50".
--
-- ---------- Cuatrimestre ----------
-- Todo queda anual (0), igual que 3ro a 5to, pero acá la evidencia es
-- más débil: el test de `horas_semanales` (hora cátedra = 45 min) NO
-- cierra para las dos materias preexistentes —Economía declara 3 hs y la
-- grilla da 6; Proyecto Final declara 6 y la grilla da 8—. Como esos
-- valores son compartidos con otras carreras (Proyecto Final está en 8
-- comisiones), no sirven como evidencia para Electrónica. Se elige 0
-- porque preserva la visibilidad actual: hoy estas filas tienen
-- cuatrimestre NULL, que el armador trata igual que 0. Marcarlas como 1
-- las escondería en el 2do cuatrimestre, una afirmación más fuerte que
-- lo que la fuente respalda.
-- ============================================================

BEGIN;

-- ---------- Snapshot para rollback ----------
CREATE SCHEMA IF NOT EXISTS backup;
REVOKE ALL ON SCHEMA backup FROM anon, authenticated;

DROP TABLE IF EXISTS backup._bkp_electronica6_comisionmaterias;
CREATE TABLE backup._bkp_electronica6_comisionmaterias AS
SELECT * FROM public."ComisionMaterias" WHERE "idComision" IN (100, 101, 102);
REVOKE ALL ON backup._bkp_electronica6_comisionmaterias FROM anon, authenticated;

DROP TABLE IF EXISTS backup._bkp_electronica6_materia_ids;
CREATE TABLE backup._bkp_electronica6_materia_ids (id bigint PRIMARY KEY, nombre text);
REVOKE ALL ON backup._bkp_electronica6_materia_ids FROM anon, authenticated;

-- ---------- Guardas ----------
DO $guard$
DECLARE v int;
BEGIN
  SELECT count(*) INTO v FROM public.comision
   WHERE id IN (100,101,102) AND nombre IN ('6R1','6R2','6R3');
  IF v <> 3 THEN RAISE EXCEPTION 'Las comisiones 6R1..6R3 no son 100..102 (encontradas: %)', v; END IF;

  SELECT count(*) INTO v FROM public.materia WHERE id IN (18,36) AND es_electiva = false;
  IF v <> 2 THEN RAISE EXCEPTION 'Economía(18) y Proyecto Final(36) deben existir y no ser electivas'; END IF;

  SELECT count(*) INTO v FROM public."ComisionMaterias"
   WHERE "idComision" IN (100,101,102) AND "idMateria" = 18;
  IF v <> 3 THEN RAISE EXCEPTION 'Economía deberia estar vinculada a las 3 comisiones, esta en %', v; END IF;
END $guard$;

-- ---------- 1. Crear las 12 electivas ----------
INSERT INTO public.materia (nombre, horas_semanales, es_electiva)
SELECT 'Sistemas de Comunicación 2 (electiva)', 6, true
 WHERE NOT EXISTS (SELECT 1 FROM public.materia WHERE nombre = 'Sistemas de Comunicación 2 (electiva)');
INSERT INTO public.materia (nombre, horas_semanales, es_electiva)
SELECT 'Sistemas de Comunicación 3 (electiva)', 6, true
 WHERE NOT EXISTS (SELECT 1 FROM public.materia WHERE nombre = 'Sistemas de Comunicación 3 (electiva)');
INSERT INTO public.materia (nombre, horas_semanales, es_electiva)
SELECT 'Tecnología para la Transmisión Digital de Video (electiva)', 6, true
 WHERE NOT EXISTS (SELECT 1 FROM public.materia WHERE nombre = 'Tecnología para la Transmisión Digital de Video (electiva)');
INSERT INTO public.materia (nombre, horas_semanales, es_electiva)
SELECT 'Equipos de Microondas (electiva)', 6, true
 WHERE NOT EXISTS (SELECT 1 FROM public.materia WHERE nombre = 'Equipos de Microondas (electiva)');
INSERT INTO public.materia (nombre, horas_semanales, es_electiva)
SELECT 'Sistemas de Telecomunicaciones (electiva)', 6, true
 WHERE NOT EXISTS (SELECT 1 FROM public.materia WHERE nombre = 'Sistemas de Telecomunicaciones (electiva)');
INSERT INTO public.materia (nombre, horas_semanales, es_electiva)
SELECT 'Bioelectrónica (electiva)', 6, true
 WHERE NOT EXISTS (SELECT 1 FROM public.materia WHERE nombre = 'Bioelectrónica (electiva)');
INSERT INTO public.materia (nombre, horas_semanales, es_electiva)
SELECT 'Control de Procesos (electiva)', 6, true
 WHERE NOT EXISTS (SELECT 1 FROM public.materia WHERE nombre = 'Control de Procesos (electiva)');
INSERT INTO public.materia (nombre, horas_semanales, es_electiva)
SELECT 'Software en Tiempo Real (electiva)', 6, true
 WHERE NOT EXISTS (SELECT 1 FROM public.materia WHERE nombre = 'Software en Tiempo Real (electiva)');
INSERT INTO public.materia (nombre, horas_semanales, es_electiva)
SELECT 'Técnicas Digitales IV (electiva)', 6, true
 WHERE NOT EXISTS (SELECT 1 FROM public.materia WHERE nombre = 'Técnicas Digitales IV (electiva)');
INSERT INTO public.materia (nombre, horas_semanales, es_electiva)
SELECT 'Visión por Computadora (electiva)', 6, true
 WHERE NOT EXISTS (SELECT 1 FROM public.materia WHERE nombre = 'Visión por Computadora (electiva)');
INSERT INTO public.materia (nombre, horas_semanales, es_electiva)
SELECT 'Fundamentos de Robótica Móvil (electiva)', 9, true
 WHERE NOT EXISTS (SELECT 1 FROM public.materia WHERE nombre = 'Fundamentos de Robótica Móvil (electiva)');
INSERT INTO public.materia (nombre, horas_semanales, es_electiva)
SELECT 'Fundamentos de Acústica (electiva)', 3, true
 WHERE NOT EXISTS (SELECT 1 FROM public.materia WHERE nombre = 'Fundamentos de Acústica (electiva)');

-- Registrar los ids recién creados, para que el rollback sepa cuáles borrar
INSERT INTO backup._bkp_electronica6_materia_ids (id, nombre)
SELECT id, nombre FROM public.materia WHERE nombre IN ('Sistemas de Comunicación 2 (electiva)',
  'Sistemas de Comunicación 3 (electiva)',
  'Tecnología para la Transmisión Digital de Video (electiva)',
  'Equipos de Microondas (electiva)',
  'Sistemas de Telecomunicaciones (electiva)',
  'Bioelectrónica (electiva)',
  'Control de Procesos (electiva)',
  'Software en Tiempo Real (electiva)',
  'Técnicas Digitales IV (electiva)',
  'Visión por Computadora (electiva)',
  'Fundamentos de Robótica Móvil (electiva)',
  'Fundamentos de Acústica (electiva)')
ON CONFLICT (id) DO NOTHING;

-- ---------- 2. Economía (18) — anual — ya vinculada, sólo horarios ----------
-- Lun 18:15-20:40, Mar 18:15-20:40 (idéntica en las 3 comisiones)
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[{"dia":"Lunes","hora_inicio":"18:15","hora_fin":"20:40"},{"dia":"Martes","hora_inicio":"18:15","hora_fin":"20:40"}]'::jsonb
WHERE "idComision" IN (100,101,102) AND "idMateria" = 18;

-- ---------- 3. Proyecto Final (36) — anual — no estaba vinculada ----------
-- Vie 16:35-23:05
INSERT INTO public."ComisionMaterias" ("idMateria", "idComision", cuatrimestre, horarios)
SELECT 36, c, 0, '[{"dia":"Viernes","hora_inicio":"16:35","hora_fin":"23:05"}]'::jsonb FROM unnest(ARRAY[100,101,102]) AS c
ON CONFLICT ("idMateria", "idComision") DO UPDATE
  SET cuatrimestre = EXCLUDED.cuatrimestre, horarios = EXCLUDED.horarios;

-- ---------- 4. Vincular las electivas a sus comisiones ----------

-- ---- 6R1 (comision 100) ----
-- Fundamentos de Acústica (electiva) — Jue 15:40-18:05
INSERT INTO public."ComisionMaterias" ("idMateria", "idComision", cuatrimestre, horarios)
SELECT m.id, 100, 0, '[{"dia":"Jueves","hora_inicio":"15:40","hora_fin":"18:05"}]'::jsonb FROM public.materia m WHERE m.nombre = 'Fundamentos de Acústica (electiva)'
ON CONFLICT ("idMateria", "idComision") DO UPDATE
  SET cuatrimestre = EXCLUDED.cuatrimestre, horarios = EXCLUDED.horarios;
-- Fundamentos de Robótica Móvil (electiva) — Mie 15:40-18:05, Jue 13:15-18:05
INSERT INTO public."ComisionMaterias" ("idMateria", "idComision", cuatrimestre, horarios)
SELECT m.id, 100, 0, '[{"dia":"Miercoles","hora_inicio":"15:40","hora_fin":"18:05"},{"dia":"Jueves","hora_inicio":"13:15","hora_fin":"18:05"}]'::jsonb FROM public.materia m WHERE m.nombre = 'Fundamentos de Robótica Móvil (electiva)'
ON CONFLICT ("idMateria", "idComision") DO UPDATE
  SET cuatrimestre = EXCLUDED.cuatrimestre, horarios = EXCLUDED.horarios;
-- Sistemas de Comunicación 2 (electiva) — Lun 20:40-23:05, Mar 20:40-23:05
INSERT INTO public."ComisionMaterias" ("idMateria", "idComision", cuatrimestre, horarios)
SELECT m.id, 100, 0, '[{"dia":"Lunes","hora_inicio":"20:40","hora_fin":"23:05"},{"dia":"Martes","hora_inicio":"20:40","hora_fin":"23:05"}]'::jsonb FROM public.materia m WHERE m.nombre = 'Sistemas de Comunicación 2 (electiva)'
ON CONFLICT ("idMateria", "idComision") DO UPDATE
  SET cuatrimestre = EXCLUDED.cuatrimestre, horarios = EXCLUDED.horarios;
-- Sistemas de Comunicación 3 (electiva) — Jue 18:15-23:05
INSERT INTO public."ComisionMaterias" ("idMateria", "idComision", cuatrimestre, horarios)
SELECT m.id, 100, 0, '[{"dia":"Jueves","hora_inicio":"18:15","hora_fin":"23:05"}]'::jsonb FROM public.materia m WHERE m.nombre = 'Sistemas de Comunicación 3 (electiva)'
ON CONFLICT ("idMateria", "idComision") DO UPDATE
  SET cuatrimestre = EXCLUDED.cuatrimestre, horarios = EXCLUDED.horarios;
-- Tecnología para la Transmisión Digital de Video (electiva) — Mie 18:15-23:05
INSERT INTO public."ComisionMaterias" ("idMateria", "idComision", cuatrimestre, horarios)
SELECT m.id, 100, 0, '[{"dia":"Miercoles","hora_inicio":"18:15","hora_fin":"23:05"}]'::jsonb FROM public.materia m WHERE m.nombre = 'Tecnología para la Transmisión Digital de Video (electiva)'
ON CONFLICT ("idMateria", "idComision") DO UPDATE
  SET cuatrimestre = EXCLUDED.cuatrimestre, horarios = EXCLUDED.horarios;
-- Técnicas Digitales IV (electiva) — Lun 15:40-18:05, Mar 15:40-18:05
INSERT INTO public."ComisionMaterias" ("idMateria", "idComision", cuatrimestre, horarios)
SELECT m.id, 100, 0, '[{"dia":"Lunes","hora_inicio":"15:40","hora_fin":"18:05"},{"dia":"Martes","hora_inicio":"15:40","hora_fin":"18:05"}]'::jsonb FROM public.materia m WHERE m.nombre = 'Técnicas Digitales IV (electiva)'
ON CONFLICT ("idMateria", "idComision") DO UPDATE
  SET cuatrimestre = EXCLUDED.cuatrimestre, horarios = EXCLUDED.horarios;
-- Visión por Computadora (electiva) — Mie 13:15-18:05
INSERT INTO public."ComisionMaterias" ("idMateria", "idComision", cuatrimestre, horarios)
SELECT m.id, 100, 0, '[{"dia":"Miercoles","hora_inicio":"13:15","hora_fin":"18:05"}]'::jsonb FROM public.materia m WHERE m.nombre = 'Visión por Computadora (electiva)'
ON CONFLICT ("idMateria", "idComision") DO UPDATE
  SET cuatrimestre = EXCLUDED.cuatrimestre, horarios = EXCLUDED.horarios;

-- ---- 6R2 (comision 101) ----
-- Equipos de Microondas (electiva) — Mie 18:15-23:05
INSERT INTO public."ComisionMaterias" ("idMateria", "idComision", cuatrimestre, horarios)
SELECT m.id, 101, 0, '[{"dia":"Miercoles","hora_inicio":"18:15","hora_fin":"23:05"}]'::jsonb FROM public.materia m WHERE m.nombre = 'Equipos de Microondas (electiva)'
ON CONFLICT ("idMateria", "idComision") DO UPDATE
  SET cuatrimestre = EXCLUDED.cuatrimestre, horarios = EXCLUDED.horarios;
-- Fundamentos de Acústica (electiva) — Jue 15:40-18:05
INSERT INTO public."ComisionMaterias" ("idMateria", "idComision", cuatrimestre, horarios)
SELECT m.id, 101, 0, '[{"dia":"Jueves","hora_inicio":"15:40","hora_fin":"18:05"}]'::jsonb FROM public.materia m WHERE m.nombre = 'Fundamentos de Acústica (electiva)'
ON CONFLICT ("idMateria", "idComision") DO UPDATE
  SET cuatrimestre = EXCLUDED.cuatrimestre, horarios = EXCLUDED.horarios;
-- Fundamentos de Robótica Móvil (electiva) — Mie 15:40-18:05, Jue 13:15-18:05
INSERT INTO public."ComisionMaterias" ("idMateria", "idComision", cuatrimestre, horarios)
SELECT m.id, 101, 0, '[{"dia":"Miercoles","hora_inicio":"15:40","hora_fin":"18:05"},{"dia":"Jueves","hora_inicio":"13:15","hora_fin":"18:05"}]'::jsonb FROM public.materia m WHERE m.nombre = 'Fundamentos de Robótica Móvil (electiva)'
ON CONFLICT ("idMateria", "idComision") DO UPDATE
  SET cuatrimestre = EXCLUDED.cuatrimestre, horarios = EXCLUDED.horarios;
-- Sistemas de Telecomunicaciones (electiva) — Jue 18:15-23:05
INSERT INTO public."ComisionMaterias" ("idMateria", "idComision", cuatrimestre, horarios)
SELECT m.id, 101, 0, '[{"dia":"Jueves","hora_inicio":"18:15","hora_fin":"23:05"}]'::jsonb FROM public.materia m WHERE m.nombre = 'Sistemas de Telecomunicaciones (electiva)'
ON CONFLICT ("idMateria", "idComision") DO UPDATE
  SET cuatrimestre = EXCLUDED.cuatrimestre, horarios = EXCLUDED.horarios;
-- Técnicas Digitales IV (electiva) — Lun 15:40-18:05, Mar 15:40-18:05
INSERT INTO public."ComisionMaterias" ("idMateria", "idComision", cuatrimestre, horarios)
SELECT m.id, 101, 0, '[{"dia":"Lunes","hora_inicio":"15:40","hora_fin":"18:05"},{"dia":"Martes","hora_inicio":"15:40","hora_fin":"18:05"}]'::jsonb FROM public.materia m WHERE m.nombre = 'Técnicas Digitales IV (electiva)'
ON CONFLICT ("idMateria", "idComision") DO UPDATE
  SET cuatrimestre = EXCLUDED.cuatrimestre, horarios = EXCLUDED.horarios;
-- Visión por Computadora (electiva) — Mie 13:15-18:05
INSERT INTO public."ComisionMaterias" ("idMateria", "idComision", cuatrimestre, horarios)
SELECT m.id, 101, 0, '[{"dia":"Miercoles","hora_inicio":"13:15","hora_fin":"18:05"}]'::jsonb FROM public.materia m WHERE m.nombre = 'Visión por Computadora (electiva)'
ON CONFLICT ("idMateria", "idComision") DO UPDATE
  SET cuatrimestre = EXCLUDED.cuatrimestre, horarios = EXCLUDED.horarios;

-- ---- 6R3 (comision 102) ----
-- Bioelectrónica (electiva) — Lun 20:40-23:05, Mar 20:40-23:05
INSERT INTO public."ComisionMaterias" ("idMateria", "idComision", cuatrimestre, horarios)
SELECT m.id, 102, 0, '[{"dia":"Lunes","hora_inicio":"20:40","hora_fin":"23:05"},{"dia":"Martes","hora_inicio":"20:40","hora_fin":"23:05"}]'::jsonb FROM public.materia m WHERE m.nombre = 'Bioelectrónica (electiva)'
ON CONFLICT ("idMateria", "idComision") DO UPDATE
  SET cuatrimestre = EXCLUDED.cuatrimestre, horarios = EXCLUDED.horarios;
-- Control de Procesos (electiva) — Mie 18:15-20:40, Jue 18:15-20:40
INSERT INTO public."ComisionMaterias" ("idMateria", "idComision", cuatrimestre, horarios)
SELECT m.id, 102, 0, '[{"dia":"Miercoles","hora_inicio":"18:15","hora_fin":"20:40"},{"dia":"Jueves","hora_inicio":"18:15","hora_fin":"20:40"}]'::jsonb FROM public.materia m WHERE m.nombre = 'Control de Procesos (electiva)'
ON CONFLICT ("idMateria", "idComision") DO UPDATE
  SET cuatrimestre = EXCLUDED.cuatrimestre, horarios = EXCLUDED.horarios;
-- Software en Tiempo Real (electiva) — Mie 20:40-23:05, Jue 20:40-23:05
INSERT INTO public."ComisionMaterias" ("idMateria", "idComision", cuatrimestre, horarios)
SELECT m.id, 102, 0, '[{"dia":"Miercoles","hora_inicio":"20:40","hora_fin":"23:05"},{"dia":"Jueves","hora_inicio":"20:40","hora_fin":"23:05"}]'::jsonb FROM public.materia m WHERE m.nombre = 'Software en Tiempo Real (electiva)'
ON CONFLICT ("idMateria", "idComision") DO UPDATE
  SET cuatrimestre = EXCLUDED.cuatrimestre, horarios = EXCLUDED.horarios;

-- ---------- Verificación ----------
DO $verif$
DECLARE v int;
BEGIN
  SELECT count(*) INTO v FROM public.materia
   WHERE nombre LIKE '%(electiva)' AND es_electiva = true
     AND id IN (SELECT id FROM backup._bkp_electronica6_materia_ids);
  IF v <> 12 THEN RAISE EXCEPTION 'Se esperaban 12 electivas nuevas, hay %', v; END IF;

  SELECT count(*) INTO v FROM public."ComisionMaterias"
   WHERE "idComision" IN (100,101,102);
  IF v <> 22 THEN RAISE EXCEPTION 'Se esperaban 22 filas ComisionMaterias, hay %', v; END IF;

  SELECT count(*) INTO v FROM public."ComisionMaterias"
   WHERE "idComision" IN (100,101,102)
     AND (horarios IS NULL OR jsonb_array_length(horarios) = 0);
  IF v > 0 THEN RAISE EXCEPTION '% fila(s) quedaron sin horarios', v; END IF;

  SELECT count(*) INTO v FROM public."ComisionMaterias"
   WHERE "idComision" IN (100,101,102) AND cuatrimestre IS DISTINCT FROM 0;
  IF v > 0 THEN RAISE EXCEPTION '% fila(s) no quedaron como anuales', v; END IF;

  SELECT count(*) INTO v FROM public."ComisionMaterias" cm,
         jsonb_array_elements(cm.horarios) h WHERE cm."idComision" IN (100,101,102);
  IF v <> 33 THEN RAISE EXCEPTION 'Se esperaban 33 bloques, hay %', v; END IF;

  SELECT count(*) INTO v FROM public."ComisionMaterias" cm,
         jsonb_array_elements(cm.horarios) h
   WHERE cm."idComision" IN (100,101,102)
     AND (NOT (h ?& array['dia','hora_inicio','hora_fin'])
          OR (SELECT count(*) FROM jsonb_object_keys(h)) <> 3
          OR h->>'dia' NOT IN ('Lunes','Martes','Miercoles','Jueves','Viernes')
          OR h->>'hora_inicio' !~ '^[0-9]{1,2}:[0-9]{2}$'
          OR h->>'hora_fin'    !~ '^[0-9]{1,2}:[0-9]{2}$');
  IF v > 0 THEN RAISE EXCEPTION '% bloque(s) con forma inválida', v; END IF;

  RAISE NOTICE 'OK: 12 electivas creadas, 22 filas anuales, 33 bloques.';
END $verif$;

COMMIT;
