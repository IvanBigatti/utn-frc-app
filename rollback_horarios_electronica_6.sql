-- ============================================================
-- Rollback de carga_horarios_electronica_6.sql
--
-- Esta carga fue la única de Electrónica que CREÓ materias e INSERTÓ
-- filas, así que el rollback tiene tres pasos en vez de uno:
--   1. borrar las filas de ComisionMaterias que no estaban en el snapshot
--   2. restaurar las que sí estaban (Economía)
--   3. borrar las 12 electivas creadas
--
-- El paso 3 se niega a borrar una materia que ya tenga uso real
-- (progreso, archivos o posts del foro): si alguien la cargó en su
-- avance, borrarla se llevaría ese dato puesto. En ese caso el script
-- falla y avisa cuáles son, en vez de destruir información.
--
-- No toca los años 1 a 5, que tienen sus propios snapshots.
-- ============================================================

BEGIN;

DO $guard$
BEGIN
  IF to_regclass('backup._bkp_electronica6_comisionmaterias') IS NULL
     OR to_regclass('backup._bkp_electronica6_materia_ids') IS NULL THEN
    RAISE EXCEPTION 'Faltan los snapshots de la carga de 6to año';
  END IF;
END $guard$;

-- ---------- 1. Borrar las filas que la carga agregó ----------
DELETE FROM public."ComisionMaterias" cm
 WHERE cm."idComision" IN (100,101,102)
   AND NOT EXISTS (
     SELECT 1 FROM backup._bkp_electronica6_comisionmaterias b
      WHERE b."idComision" = cm."idComision" AND b."idMateria" = cm."idMateria");

-- ---------- 2. Restaurar las que ya existían ----------
UPDATE public."ComisionMaterias" cm
   SET horarios     = b.horarios,
       cuatrimestre = b.cuatrimestre
  FROM backup._bkp_electronica6_comisionmaterias b
 WHERE cm."idComision" = b."idComision"
   AND cm."idMateria"  = b."idMateria";

-- ---------- 3. Borrar las electivas creadas ----------
DO $mat$
DECLARE v_usadas text;
BEGIN
  SELECT string_agg(m.nombre, ', ') INTO v_usadas
    FROM public.materia m
   WHERE m.id IN (SELECT id FROM backup._bkp_electronica6_materia_ids)
     AND (EXISTS (SELECT 1 FROM public.progreso  p WHERE p.materia_id = m.id)
       OR EXISTS (SELECT 1 FROM public.archivos  a WHERE a.materia_id = m.id)
       OR EXISTS (SELECT 1 FROM public.foro_post f WHERE f.materia_id = m.id)
       OR EXISTS (SELECT 1 FROM public."ComisionMaterias" cm
                   WHERE cm."idMateria" = m.id AND cm."idComision" NOT IN (100,101,102)));
  IF v_usadas IS NOT NULL THEN
    RAISE EXCEPTION 'No se borran: estas materias ya tienen uso real -> %', v_usadas;
  END IF;
END $mat$;

DELETE FROM public."ComisionMaterias"
 WHERE "idMateria" IN (SELECT id FROM backup._bkp_electronica6_materia_ids);

DELETE FROM public.materia
 WHERE id IN (SELECT id FROM backup._bkp_electronica6_materia_ids);

-- ---------- Verificación ----------
DO $verif$
DECLARE v_extra int; v_dif int; v_mat int;
BEGIN
  SELECT count(*) INTO v_extra FROM public."ComisionMaterias" cm
   WHERE cm."idComision" IN (100,101,102)
     AND NOT EXISTS (SELECT 1 FROM backup._bkp_electronica6_comisionmaterias b
                      WHERE b."idComision" = cm."idComision" AND b."idMateria" = cm."idMateria");
  IF v_extra > 0 THEN RAISE EXCEPTION 'Quedaron % fila(s) que no estaban en el snapshot', v_extra; END IF;

  SELECT count(*) INTO v_dif
    FROM public."ComisionMaterias" cm
    JOIN backup._bkp_electronica6_comisionmaterias b
      ON b."idComision" = cm."idComision" AND b."idMateria" = cm."idMateria"
   WHERE cm.horarios IS DISTINCT FROM b.horarios
      OR cm.cuatrimestre IS DISTINCT FROM b.cuatrimestre;
  IF v_dif > 0 THEN RAISE EXCEPTION '% fila(s) no volvieron al snapshot', v_dif; END IF;

  SELECT count(*) INTO v_mat FROM public.materia
   WHERE id IN (SELECT id FROM backup._bkp_electronica6_materia_ids);
  IF v_mat > 0 THEN RAISE EXCEPTION 'Quedaron % electiva(s) sin borrar', v_mat; END IF;

  RAISE NOTICE 'OK: 6R1/6R2/6R3 restauradas y las 12 electivas eliminadas.';
END $verif$;

COMMIT;

-- Cuando ya no haga falta:
-- DROP TABLE backup._bkp_electronica6_comisionmaterias;
-- DROP TABLE backup._bkp_electronica6_materia_ids;
