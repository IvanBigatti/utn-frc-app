-- ============================================================
-- Rollback de carga_horarios_electronica_4.sql
--
-- Restaura las 14 filas de ComisionMaterias de 4R1/4R2
-- (96/97) desde el snapshot que tomó el script de carga.
--
-- NO borra materias ni comisiones: la carga fue un UPDATE puro.
-- Tampoco toca 1er, 2do ni 3er año, que tienen sus propios snapshots y rollback.
-- ============================================================

BEGIN;

DO $guard$
BEGIN
  IF to_regclass('backup._bkp_electronica4_comisionmaterias') IS NULL THEN
    RAISE EXCEPTION 'No existe el snapshot backup._bkp_electronica4_comisionmaterias';
  END IF;
END $guard$;

UPDATE public."ComisionMaterias" cm
   SET horarios     = b.horarios,
       cuatrimestre = b.cuatrimestre
  FROM backup._bkp_electronica4_comisionmaterias b
 WHERE cm."idComision" = b."idComision"
   AND cm."idMateria"  = b."idMateria";

DO $verif$
DECLARE v int;
BEGIN
  SELECT count(*) INTO v
    FROM public."ComisionMaterias" cm
    JOIN backup._bkp_electronica4_comisionmaterias b
      ON b."idComision" = cm."idComision" AND b."idMateria" = cm."idMateria"
   WHERE cm.horarios IS DISTINCT FROM b.horarios
      OR cm.cuatrimestre IS DISTINCT FROM b.cuatrimestre;
  IF v > 0 THEN RAISE EXCEPTION '% fila(s) no volvieron al snapshot', v; END IF;
  RAISE NOTICE 'OK: 4R1/4R2 restauradas al estado previo a la carga.';
END $verif$;

COMMIT;

-- Cuando ya no haga falta:
-- DROP TABLE backup._bkp_electronica4_comisionmaterias;
