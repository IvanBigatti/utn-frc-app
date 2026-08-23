-- ============================================================
-- ROLLBACK de carga_horarios_civil.sql
--
-- Deja Ingeniería Civil exactamente como estaba antes de la carga,
-- restaurando valor por valor desde backup._bkp_civil_*.
-- Si el snapshot no existe, aborta sin tocar nada.
--
-- NO borra materia.es_electiva: esa columna la crea la carga de
-- Química y la comparten las dos carreras.
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('backup._bkp_civil_cm') IS NULL
     OR to_regclass('backup._bkp_civil_materia') IS NULL
     OR to_regclass('backup._bkp_civil_comision') IS NULL THEN
    RAISE EXCEPTION 'Falta el snapshot backup._bkp_civil_*. Sin él no se puede revertir con seguridad.';
  END IF;
END $$;

-- ---------- 1. Borrar las filas de ComisionMaterias que NO existían ----------
DELETE FROM "ComisionMaterias" cm
USING comision c
WHERE c.id = cm."idComision"
  AND c.ingenieria_id = (SELECT ingenieria_id FROM comision WHERE id = 44)
  AND NOT EXISTS (
    SELECT 1 FROM backup._bkp_civil_cm b
    WHERE b."idComision" = cm."idComision" AND b."idMateria" = cm."idMateria"
  );

-- ---------- 2. Restaurar las que sí existían ----------
UPDATE "ComisionMaterias" cm
SET cuatrimestre = b.cuatrimestre,
    horarios     = b.horarios
FROM backup._bkp_civil_cm b
WHERE cm."idComision" = b."idComision"
  AND cm."idMateria"  = b."idMateria";

-- ---------- 3. Borrar las 8 materias creadas por la carga ----------
-- Acotado por nombre además del snapshot. Si alguna quedó referenciada
-- por archivos/foro/progreso, la FK aborta la transacción: es lo correcto,
-- no se borran datos de usuarios en cascada.
DELETE FROM materia m
WHERE NOT EXISTS (SELECT 1 FROM backup._bkp_civil_materia b WHERE b.id = m.id)
  AND m.nombre IN (
    'Obras Fluviales',
    'Diseño',
    'Línea de Rivera',
    'Puentes',
    'Vialidad Especial',
    'Obras Subterráneas',
    'Prefabricación',
    'Tránsito y Transporte'
  );

-- ---------- 4. Borrar la comisión 1C3 creada por la carga ----------
DELETE FROM comision c
WHERE NOT EXISTS (SELECT 1 FROM backup._bkp_civil_comision b WHERE b.id = c.id)
  AND c.nombre = '1C3'
  AND c.ingenieria_id = (SELECT ingenieria_id FROM comision WHERE id = 44);

-- ---------- 5. Restaurar tipo/horas/es_electiva de materias preexistentes ----------
-- Hoy la carga no pisa ninguna materia que ya existiera. Queda como red de
-- seguridad si la carga se amplía.
UPDATE materia m
SET tipo = b.tipo,
    horas_semanales = b.horas_semanales,
    es_electiva = b.es_electiva
FROM backup._bkp_civil_materia b
WHERE b.id = m.id
  AND (m.tipo            IS DISTINCT FROM b.tipo
    OR m.horas_semanales IS DISTINCT FROM b.horas_semanales
    OR m.es_electiva     IS DISTINCT FROM b.es_electiva);

-- ---------- 6. Verificación ----------
DO $$
DECLARE v_cm int; v_dirty int; v_1c3 int; v_mat int;
BEGIN
  SELECT count(*) INTO v_cm
  FROM "ComisionMaterias" cm JOIN comision c ON c.id = cm."idComision"
  WHERE c.ingenieria_id = (SELECT ingenieria_id FROM comision WHERE id = 44);
  IF v_cm <> (SELECT count(*) FROM backup._bkp_civil_cm) THEN
    RAISE EXCEPTION 'Quedaron % filas en ComisionMaterias, el snapshot tiene %',
      v_cm, (SELECT count(*) FROM backup._bkp_civil_cm);
  END IF;

  SELECT count(*) INTO v_dirty
  FROM "ComisionMaterias" cm
  JOIN backup._bkp_civil_cm b
    ON b."idComision" = cm."idComision" AND b."idMateria" = cm."idMateria"
  WHERE cm.cuatrimestre IS DISTINCT FROM b.cuatrimestre
     OR cm.horarios     IS DISTINCT FROM b.horarios;
  IF v_dirty > 0 THEN
    RAISE EXCEPTION '% fila(s) no volvieron a su valor original', v_dirty;
  END IF;

  SELECT count(*) INTO v_1c3 FROM comision
  WHERE nombre = '1C3' AND ingenieria_id = (SELECT ingenieria_id FROM comision WHERE id = 44);
  IF v_1c3 <> 0 THEN
    RAISE EXCEPTION 'La comisión 1C3 sigue existiendo';
  END IF;

  SELECT count(*) INTO v_mat FROM materia;
  IF v_mat <> (SELECT count(*) FROM backup._bkp_civil_materia) THEN
    RAISE EXCEPTION 'Hay % materias, el snapshot tenía %',
      v_mat, (SELECT count(*) FROM backup._bkp_civil_materia);
  END IF;

  RAISE NOTICE 'Rollback OK: Civil idéntica al snapshot previo a la carga.';
END $$;

DROP TABLE backup._bkp_civil_cm;
DROP TABLE backup._bkp_civil_materia;
DROP TABLE backup._bkp_civil_comision;

COMMIT;

-- Nota: los IDs consumidos de materia_id_seq y comision_id_seq NO se
-- devuelven. Quedan huecos en la numeración. Es inofensivo.
