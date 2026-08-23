-- ============================================================
-- Rollback de carga_horarios_electronica_3.sql
--
-- Restaura las 28 filas de ComisionMaterias de 3R1/3R2/3R3/3R4
-- (92/93/94/95) desde el snapshot que tomó el script de carga.
--
-- NO borra materias ni comisiones: la carga fue un UPDATE puro.
-- Tampoco toca 1er ni 2do año, que tienen sus propios snapshots y rollback.
-- ============================================================

BEGIN;

DO $guard$
BEGIN
  IF to_regclass('backup._bkp_electronica3_comisionmaterias') IS NULL THEN
    RAISE EXCEPTION 'No existe el snapshot backup._bkp_electronica3_comisionmaterias';
  END IF;
END $guard$;

UPDATE public."ComisionMaterias" cm
   SET horarios     = b.horarios,
       cuatrimestre = b.cuatrimestre
  FROM backup._bkp_electronica3_comisionmaterias b
 WHERE cm."idComision" = b."idComision"
   AND cm."idMateria"  = b."idMateria";

DO $verif$
DECLARE v int;
BEGIN
  SELECT count(*) INTO v
    FROM public."ComisionMaterias" cm
    JOIN backup._bkp_electronica3_comisionmaterias b
      ON b."idComision" = cm."idComision" AND b."idMateria" = cm."idMateria"
   WHERE cm.horarios IS DISTINCT FROM b.horarios
      OR cm.cuatrimestre IS DISTINCT FROM b.cuatrimestre;
  IF v > 0 THEN RAISE EXCEPTION '% fila(s) no volvieron al snapshot', v; END IF;
  RAISE NOTICE 'OK: 3R1/3R2/3R3/3R4 restauradas al estado previo a la carga.';
END $verif$;

COMMIT;

-- Cuando ya no haga falta:
-- DROP TABLE backup._bkp_electronica3_comisionmaterias;
