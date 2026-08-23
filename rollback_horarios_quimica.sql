-- ============================================================
-- ROLLBACK de carga_horarios_quimica.sql
--
-- Deja Ingeniería Química exactamente como estaba antes de la carga.
-- Se apoya en las tablas _bkp_quimica_* que crea el paso 0 de la carga:
-- NO adivina nada, restaura valor por valor desde el snapshot.
--
-- Si el snapshot no existe, aborta sin tocar nada.
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('backup._bkp_quimica_cm') IS NULL
     OR to_regclass('backup._bkp_quimica_materia') IS NULL
     OR to_regclass('backup._bkp_quimica_comision') IS NULL THEN
    RAISE EXCEPTION 'Falta el snapshot _bkp_quimica_*. Sin él no se puede revertir con seguridad.';
  END IF;
END $$;

-- ---------- 1. Borrar las filas de ComisionMaterias que NO existían ----------
DELETE FROM "ComisionMaterias" cm
USING comision c
WHERE c.id = cm."idComision"
  AND c.ingenieria_id = (SELECT ingenieria_id FROM comision WHERE id = 65)
  AND NOT EXISTS (
    SELECT 1 FROM backup._bkp_quimica_cm b
    WHERE b."idComision" = cm."idComision"
      AND b."idMateria"  = cm."idMateria"
  );

-- ---------- 2. Restaurar las que sí existían, a su valor original ----------
UPDATE "ComisionMaterias" cm
SET cuatrimestre = b.cuatrimestre,
    horarios     = b.horarios
FROM backup._bkp_quimica_cm b
WHERE cm."idComision" = b."idComision"
  AND cm."idMateria"  = b."idMateria";

-- ---------- 3. Borrar las 8 materias creadas por la carga ----------
-- Acotado por nombre además del snapshot: si alguien creó otras materias
-- por su cuenta después del snapshot, no se las lleva puestas.
-- Si alguna quedó referenciada por archivos/foro/progreso, la FK aborta
-- la transacción. Es lo correcto: no borra datos de usuarios en cascada.
DELETE FROM materia m
WHERE NOT EXISTS (SELECT 1 FROM backup._bkp_quimica_materia b WHERE b.id = m.id)
  AND m.nombre IN (
    'Gestión de Potencial Humano',
    'Hidrógeno y Power-to-X Renovable',
    'Tecnología de los Alimentos',
    'Catalizadores y Procesos Catalíticos',
    'Física de los Materiales (FAMAF)',
    'Formación de Tutores Emprendedores',
    'Herramientas de Dirección y Gestión Empresarial',
    'Ingeniería de las Instalaciones'
  );

-- ---------- 4. Borrar la comisión 1V3 creada por la carga ----------
DELETE FROM comision c
WHERE NOT EXISTS (SELECT 1 FROM backup._bkp_quimica_comision b WHERE b.id = c.id)
  AND c.nombre = '1V3'
  AND c.ingenieria_id = (SELECT ingenieria_id FROM comision WHERE id = 65);

-- ---------- 5. Restaurar tipo y horas_semanales de las materias que ya existían ----------
-- Hoy la carga no modifica ninguna materia preexistente, así que esto no
-- toca nada. Queda como red de seguridad: si la carga se amplía y empieza a
-- pisar `tipo` u `horas_semanales`, el rollback ya lo revierte.
UPDATE materia m
SET tipo = b.tipo,
    horas_semanales = b.horas_semanales
FROM backup._bkp_quimica_materia b
WHERE b.id = m.id
  AND (m.tipo            IS DISTINCT FROM b.tipo
    OR m.horas_semanales IS DISTINCT FROM b.horas_semanales);

-- ---------- 6. Quitar la columna es_electiva ----------
-- La carga verifica que la columna NO existiera antes de crearla, así que
-- borrarla es exactamente volver atrás.
ALTER TABLE materia DROP COLUMN IF EXISTS es_electiva;

-- ---------- 7. Verificación ----------
DO $$
DECLARE v_cm int; v_dirty int; v_1v3 int; v_mat int; v_mat_dirty int;
BEGIN
  SELECT count(*) INTO v_cm
  FROM "ComisionMaterias" cm JOIN comision c ON c.id = cm."idComision"
  WHERE c.ingenieria_id = (SELECT ingenieria_id FROM comision WHERE id = 65);
  IF v_cm <> (SELECT count(*) FROM backup._bkp_quimica_cm) THEN
    RAISE EXCEPTION 'Quedaron % filas en ComisionMaterias, el snapshot tiene %',
      v_cm, (SELECT count(*) FROM backup._bkp_quimica_cm);
  END IF;

  SELECT count(*) INTO v_dirty
  FROM "ComisionMaterias" cm
  JOIN backup._bkp_quimica_cm b
    ON b."idComision" = cm."idComision" AND b."idMateria" = cm."idMateria"
  WHERE cm.cuatrimestre IS DISTINCT FROM b.cuatrimestre
     OR cm.horarios     IS DISTINCT FROM b.horarios;
  IF v_dirty > 0 THEN
    RAISE EXCEPTION '% fila(s) no volvieron a su valor original', v_dirty;
  END IF;

  SELECT count(*) INTO v_1v3 FROM comision
  WHERE nombre = '1V3'
    AND ingenieria_id = (SELECT ingenieria_id FROM comision WHERE id = 65);
  IF v_1v3 <> 0 THEN
    RAISE EXCEPTION 'La comisión 1V3 sigue existiendo';
  END IF;

  SELECT count(*) INTO v_mat FROM materia;
  IF v_mat <> (SELECT count(*) FROM backup._bkp_quimica_materia) THEN
    RAISE EXCEPTION 'Hay % materias, el snapshot tenía %',
      v_mat, (SELECT count(*) FROM backup._bkp_quimica_materia);
  END IF;

  SELECT count(*) INTO v_mat_dirty
  FROM materia m JOIN backup._bkp_quimica_materia b ON b.id = m.id
  WHERE m.tipo            IS DISTINCT FROM b.tipo
     OR m.horas_semanales IS DISTINCT FROM b.horas_semanales;
  IF v_mat_dirty > 0 THEN
    RAISE EXCEPTION '% materia(s) no volvieron a su tipo/horas original', v_mat_dirty;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='materia'
               AND column_name='es_electiva') THEN
    RAISE EXCEPTION 'La columna materia.es_electiva sigue existiendo';
  END IF;

  RAISE NOTICE 'Rollback OK: base idéntica al snapshot previo a la carga.';
END $$;

DROP TABLE backup._bkp_quimica_cm;
DROP TABLE backup._bkp_quimica_materia;
DROP TABLE backup._bkp_quimica_comision;

COMMIT;

-- Nota: los IDs consumidos de materia_id_seq y comision_id_seq NO se
-- devuelven. Quedan huecos en la numeración. Es inofensivo.
