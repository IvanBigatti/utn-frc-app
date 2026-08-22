-- ============================================================
-- Rollback de carga_electivas_industrial.sql
--
-- Borra las 15 filas de ComisionMaterias y las 13 materias electivas
-- creadas por ese script. No toca ninguna otra materia ni comisión, y
-- se niega a borrar una materia que tenga uso real.
-- ============================================================

BEGIN;

DO $guard$
BEGIN
  IF to_regclass('backup._bkp_electivas_industrial_materia') IS NULL THEN
    RAISE EXCEPTION 'No existe el snapshot backup._bkp_electivas_industrial_materia';
  END IF;
END $guard$;

-- Ninguna de estas materias puede tener uso real antes de borrarla.
DO $guard2$
DECLARE v int;
BEGIN
  SELECT count(*) INTO v FROM public.progreso p
    JOIN backup._bkp_electivas_industrial_materia b ON b.id = p.materia_id;
  IF v > 0 THEN RAISE EXCEPTION '% fila(s) de progreso apuntan a estas electivas: no se borran', v; END IF;
END $guard2$;

DELETE FROM public."ComisionMaterias" cm
 USING backup._bkp_electivas_industrial_materia b
 WHERE cm."idMateria" = b.id;

DELETE FROM public.materia m
 USING backup._bkp_electivas_industrial_materia b
 WHERE m.id = b.id;

DO $verif$
DECLARE v int;
BEGIN
  SELECT count(*) INTO v FROM public.materia m
    JOIN backup._bkp_electivas_industrial_materia b ON b.id = m.id;
  IF v > 0 THEN RAISE EXCEPTION '% materia(s) no se borraron', v; END IF;
  RAISE NOTICE 'OK: electivas de Industrial eliminadas.';
END $verif$;

COMMIT;

-- Cuando ya no haga falta:
-- DROP TABLE backup._bkp_electivas_industrial_materia;
