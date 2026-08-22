-- ============================================================
-- Rollback de carga_horarios_industrial_3_ingles.sql
--
-- Devuelve las 3 filas de Inglés II (materia 62) en 3D1, 3D2 y 3D3
-- al estado que tenían antes: horarios NULL.
--
-- No toca ninguna otra materia ni comisión.
-- ============================================================

BEGIN;

DO $guard$
BEGIN
  IF to_regclass('backup._bkp_industrial3_ingles') IS NULL THEN
    RAISE EXCEPTION 'No existe el snapshot backup._bkp_industrial3_ingles';
  END IF;
END $guard$;

UPDATE public."ComisionMaterias" cm
   SET horarios     = b.horarios,
       cuatrimestre = b.cuatrimestre
  FROM backup._bkp_industrial3_ingles b
 WHERE cm."idComision" = b."idComision"
   AND cm."idMateria"  = b."idMateria";

DO $verif$
DECLARE v int;
BEGIN
  SELECT count(*) INTO v
    FROM public."ComisionMaterias" cm
    JOIN backup._bkp_industrial3_ingles b
      ON b."idComision" = cm."idComision" AND b."idMateria" = cm."idMateria"
   WHERE cm.horarios IS DISTINCT FROM b.horarios
      OR cm.cuatrimestre IS DISTINCT FROM b.cuatrimestre;
  IF v > 0 THEN RAISE EXCEPTION '% fila(s) no volvieron al snapshot', v; END IF;
  RAISE NOTICE 'OK: Inglés II vuelve a quedar sin horarios en 3D1..3D3.';
END $verif$;

COMMIT;

-- Cuando ya no haga falta:
-- DROP TABLE backup._bkp_industrial3_ingles;
