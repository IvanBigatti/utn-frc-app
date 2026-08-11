-- ============================================================
-- Horarios Ingeniería Civil  ·  carga completa
-- Fuente: 1er..6to año.xlsx (formato grilla, sin hojas normalizadas)
-- 69 pares (comisión, materia) · 116 bloques horarios
--
-- REQUIERE en app/armadorHorarios/page.tsx que FRANJAS incluya
-- "8:40", "13:00", "15:00" y "17:00": son horarios de sábado y de
-- cursado especial que el Excel declara en el texto de la celda
-- ("(08:40 a 11:10)"), fuera de la grilla de módulos. Sin esas
-- franjas, franjaIdx() devuelve -1 y los bloques se rompen.
--
-- Decisiones tomadas (cambialas acá si no coinciden con la realidad):
--  · 1C1 está DUPLICADA en la base (ids 44 y 46, mismas 9 materias).
--    Se carga sobre la 44. La 46 NO se toca ni se borra.
--  · Hojas sin cabecera de cuatrimestre (2C1, 2C2, 3C2 Anual, 6C1) y
--    materias con horario idéntico en ambos cuatrimestres -> cuatrimestre 0.
--  · 2C2 Estabilidad: vale el horario del texto (15:00-17:00); se
--    descarta la aproximación a la grilla (16:35-17:20).
--  · 5C1 Org. y Cond. de Obras difiere entre cuatrimestres
--    (18:15 vs 19:00) -> una fila anual con la envolvente 18:15-23:05.
--  · Las hojas "3C2 Anual" y "3C2 Cuatri" son la misma comisión 3C2.
--  · La hoja "Electivas" de 6to pertenece a 6C1.
--  · Se corrige el typo "11:!0" -> "11:10" (aparece en 3 hojas).
-- ============================================================

BEGIN;

-- ---------- 0. Snapshot ----------
DO $$
BEGIN
  IF to_regclass('backup._bkp_civil_cm') IS NOT NULL THEN
    RAISE EXCEPTION 'Ya existe backup._bkp_civil_cm: la carga ya se corrió. Corré el rollback antes de repetirla.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='materia' AND column_name='es_electiva') THEN
    RAISE EXCEPTION 'Falta materia.es_electiva. Corré carga_horarios_quimica.sql primero.';
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS backup;
REVOKE ALL ON SCHEMA backup FROM anon, authenticated;

CREATE TABLE backup._bkp_civil_cm AS
SELECT cm.* FROM "ComisionMaterias" cm JOIN comision c ON c.id = cm."idComision"
WHERE c.ingenieria_id = (SELECT ingenieria_id FROM comision WHERE id = 44);
CREATE TABLE backup._bkp_civil_materia AS SELECT id, tipo, horas_semanales, es_electiva FROM materia;
CREATE TABLE backup._bkp_civil_comision AS SELECT id FROM comision;
REVOKE ALL ON ALL TABLES IN SCHEMA backup FROM anon, authenticated;

-- ---------- 1. Comisión faltante: 1C3 (turno tarde) ----------
INSERT INTO comision (nombre, "año", ingenieria_id)
SELECT '1C3', 1, (SELECT ingenieria_id FROM comision WHERE id = 44)
WHERE NOT EXISTS (SELECT 1 FROM comision
  WHERE nombre = '1C3' AND ingenieria_id = (SELECT ingenieria_id FROM comision WHERE id = 44));

-- ---------- 2. Materias nuevas ----------
-- Las 7 electivas salen de la hoja "Electivas" y de las celdas marcadas
-- "(Electiva)" en 6C1. Sin carga horaria conocida: horas_semanales NULL.
CREATE TEMP TABLE mat_nueva (nombre text PRIMARY KEY, electiva boolean NOT NULL) ON COMMIT DROP;
INSERT INTO mat_nueva (nombre, electiva) VALUES
  ('Obras Fluviales', false),
  ('Diseño', true),
  ('Línea de Rivera', true),
  ('Puentes', true),
  ('Vialidad Especial', true),
  ('Obras Subterráneas', true),
  ('Prefabricación', true),
  ('Tránsito y Transporte', true);

INSERT INTO materia (nombre, tipo, es_electiva)
SELECT n.nombre, false, n.electiva FROM mat_nueva n
WHERE NOT EXISTS (SELECT 1 FROM materia m WHERE m.nombre = n.nombre);

-- ---------- 3. Resolución de IDs ----------
CREATE TEMP TABLE mat_map (nombre text PRIMARY KEY, id bigint NOT NULL) ON COMMIT DROP;
INSERT INTO mat_map (nombre, id) VALUES
  ('Análisis 1', 1),
  ('Álgebra', 2),
  ('Física 1', 3),
  ('Inglés 1', 4),
  ('Ingeniería y Sociedad', 5),
  ('Análisis 2', 6),
  ('Física 2', 7),
  ('Inglés 2', 8),
  ('Probabilidad y Estadística', 9),
  ('Economía', 18),
  ('Proyecto Final', 36),
  ('Química General', 38),
  ('Sistemas de Representación', 39),
  ('Fundamentos de Informática', 72),
  ('Ingeniería Civil 1', 183),
  ('Estabilidad', 184),
  ('Ingeniería Civil 2', 185),
  ('Tecnología de los Materiales', 186),
  ('Resistencia de los Materiales', 187),
  ('Tecnología del Hormigón', 188),
  ('Tecnología de la Construcción', 189),
  ('Geotopografía', 190),
  ('Hidráulica General y Aplicada', 191),
  ('Cálculo Avanzado', 192),
  ('Instalaciones Eléctricas y Acústicas', 193),
  ('Instalaciones Termomecánicas', 194),
  ('Geotecnia', 195),
  ('Instalaciones Sanitarias y de Gas 1', 196),
  ('Diseño Arquitectónico, Planeamiento y Urbanismo', 197),
  ('Análisis Estructural 1', 198),
  ('Estructuras del Hormigón', 199),
  ('Hidrología y Obras Hidráulicas', 200),
  ('Ingeniería Legal 1', 201),
  ('Construcciones Metálicas y de Madera', 202),
  ('Cimentaciones', 203),
  ('Ingeniería Sanitaria', 204),
  ('Org. y Cond. de Obras', 205),
  ('Vías de Comunicación 1', 206),
  ('Análisis Estructural 2', 207),
  ('Vías de Comunicación 2', 208),
  ('Gestión Ambiental y Desarrollo Sustentable', 209);
INSERT INTO mat_map (nombre, id)
SELECT n.nombre, m.id FROM mat_nueva n JOIN materia m ON m.nombre = n.nombre;

CREATE TEMP TABLE com_map (clave text PRIMARY KEY, id bigint NOT NULL) ON COMMIT DROP;
INSERT INTO com_map (clave, id) VALUES
  ('1C1', 44), ('1C2', 45), ('2C1', 47), ('2C2', 48),
  ('3C1', 49), ('3C2', 50), ('4C1', 51), ('5C1', 52), ('6C1', 53);
INSERT INTO com_map (clave, id)
SELECT '1C3', id FROM comision
WHERE nombre = '1C3' AND ingenieria_id = (SELECT ingenieria_id FROM comision WHERE id = 44);

-- ---------- 4. Carga de horarios ----------
CREATE TEMP TABLE carga (com text, mat text, cuat smallint, horarios jsonb) ON COMMIT DROP;
INSERT INTO carga (com, mat, cuat, horarios) VALUES
  ('1C1', 'Análisis 1', 0, '[{"dia":"Jueves","hora_inicio":"21:35","hora_fin":"23:05"},{"dia":"Martes","hora_inicio":"18:15","hora_fin":"20:40"}]'),
  ('1C1', 'Fundamentos de Informática', 2, '[{"dia":"Lunes","hora_inicio":"16:35","hora_fin":"18:05"},{"dia":"Sabado","hora_inicio":"11:20","hora_fin":"13:00"}]'),
  ('1C1', 'Física 1', 0, '[{"dia":"Jueves","hora_inicio":"19:00","hora_fin":"21:25"},{"dia":"Miercoles","hora_inicio":"20:40","hora_fin":"22:20"}]'),
  ('1C1', 'Ingeniería Civil 1', 1, '[{"dia":"Jueves","hora_inicio":"17:20","hora_fin":"19:00"},{"dia":"Viernes","hora_inicio":"19:55","hora_fin":"23:05"}]'),
  ('1C1', 'Ingeniería y Sociedad', 0, '[{"dia":"Martes","hora_inicio":"20:40","hora_fin":"22:20"}]'),
  ('1C1', 'Química General', 0, '[{"dia":"Lunes","hora_inicio":"18:15","hora_fin":"20:40"},{"dia":"Miercoles","hora_inicio":"19:00","hora_fin":"20:40"}]'),
  ('1C1', 'Sistemas de Representación', 2, '[{"dia":"Lunes","hora_inicio":"14:00","hora_fin":"16:25"},{"dia":"Sabado","hora_inicio":"8:40","hora_fin":"11:10"}]'),
  ('1C1', 'Álgebra', 0, '[{"dia":"Lunes","hora_inicio":"20:40","hora_fin":"23:05"},{"dia":"Viernes","hora_inicio":"18:15","hora_fin":"19:45"}]'),
  ('1C2', 'Análisis 1', 0, '[{"dia":"Martes","hora_inicio":"9:40","hora_fin":"11:10"},{"dia":"Viernes","hora_inicio":"8:00","hora_fin":"10:25"}]'),
  ('1C2', 'Fundamentos de Informática', 2, '[{"dia":"Lunes","hora_inicio":"13:15","hora_fin":"14:45"},{"dia":"Sabado","hora_inicio":"11:20","hora_fin":"13:00"}]'),
  ('1C2', 'Física 1', 0, '[{"dia":"Jueves","hora_inicio":"10:25","hora_fin":"12:50"},{"dia":"Lunes","hora_inicio":"8:00","hora_fin":"9:30"}]'),
  ('1C2', 'Ingeniería Civil 1', 0, '[{"dia":"Jueves","hora_inicio":"8:00","hora_fin":"10:25"},{"dia":"Miercoles","hora_inicio":"10:25","hora_fin":"12:50"}]'),
  ('1C2', 'Ingeniería y Sociedad', 0, '[{"dia":"Lunes","hora_inicio":"9:40","hora_fin":"11:10"}]'),
  ('1C2', 'Química General', 0, '[{"dia":"Martes","hora_inicio":"8:00","hora_fin":"9:30"},{"dia":"Miercoles","hora_inicio":"8:00","hora_fin":"10:25"}]'),
  ('1C2', 'Sistemas de Representación', 2, '[{"dia":"Martes","hora_inicio":"13:15","hora_fin":"15:40"},{"dia":"Sabado","hora_inicio":"8:45","hora_fin":"11:10"}]'),
  ('1C2', 'Álgebra', 0, '[{"dia":"Lunes","hora_inicio":"11:20","hora_fin":"12:50"},{"dia":"Viernes","hora_inicio":"10:25","hora_fin":"12:50"}]'),
  ('2C1', 'Análisis 2', 0, '[{"dia":"Viernes","hora_inicio":"18:15","hora_fin":"22:20"}]'),
  ('2C1', 'Estabilidad', 0, '[{"dia":"Jueves","hora_inicio":"18:15","hora_fin":"19:45"},{"dia":"Lunes","hora_inicio":"20:40","hora_fin":"23:05"}]'),
  ('2C1', 'Física 2', 0, '[{"dia":"Miercoles","hora_inicio":"18:15","hora_fin":"22:20"}]'),
  ('2C1', 'Ingeniería Civil 2', 0, '[{"dia":"Lunes","hora_inicio":"18:15","hora_fin":"20:40"}]'),
  ('2C1', 'Inglés 1', 0, '[{"dia":"Miercoles","hora_inicio":"16:35","hora_fin":"18:05"}]'),
  ('2C1', 'Probabilidad y Estadística', 0, '[{"dia":"Jueves","hora_inicio":"19:55","hora_fin":"22:20"}]'),
  ('2C1', 'Tecnología de los Materiales', 0, '[{"dia":"Martes","hora_inicio":"17:20","hora_fin":"20:40"}]'),
  ('2C2', 'Estabilidad', 0, '[{"dia":"Jueves","hora_inicio":"15:00","hora_fin":"17:00"},{"dia":"Martes","hora_inicio":"15:00","hora_fin":"17:00"}]'),
  ('2C2', 'Ingeniería Civil 2', 0, '[{"dia":"Lunes","hora_inicio":"15:40","hora_fin":"18:05"}]'),
  ('3C1', 'Cálculo Avanzado', 2, '[{"dia":"Martes","hora_inicio":"19:55","hora_fin":"23:05"}]'),
  ('3C1', 'Economía', 0, '[{"dia":"Miercoles","hora_inicio":"20:40","hora_fin":"23:05"}]'),
  ('3C1', 'Geotopografía', 0, '[{"dia":"Lunes","hora_inicio":"20:40","hora_fin":"23:05"},{"dia":"Sabado","hora_inicio":"8:00","hora_fin":"9:30"}]'),
  ('3C1', 'Hidráulica General y Aplicada', 0, '[{"dia":"Jueves","hora_inicio":"17:20","hora_fin":"19:45"},{"dia":"Martes","hora_inicio":"18:15","hora_fin":"19:45"}]'),
  ('3C1', 'Inglés 2', 0, '[{"dia":"Lunes","hora_inicio":"16:35","hora_fin":"18:05"}]'),
  ('3C1', 'Instalaciones Eléctricas y Acústicas', 2, '[{"dia":"Jueves","hora_inicio":"19:55","hora_fin":"23:05"}]'),
  ('3C1', 'Instalaciones Termomecánicas', 1, '[{"dia":"Miercoles","hora_inicio":"17:20","hora_fin":"20:40"}]'),
  ('3C1', 'Resistencia de los Materiales', 1, '[{"dia":"Jueves","hora_inicio":"19:55","hora_fin":"23:05"},{"dia":"Martes","hora_inicio":"19:55","hora_fin":"23:05"}]'),
  ('3C1', 'Tecnología de la Construcción', 0, '[{"dia":"Lunes","hora_inicio":"18:15","hora_fin":"20:40"},{"dia":"Viernes","hora_inicio":"18:15","hora_fin":"20:40"}]'),
  ('3C1', 'Tecnología del Hormigón', 2, '[{"dia":"Miercoles","hora_inicio":"17:20","hora_fin":"20:40"}]'),
  ('3C2', 'Hidráulica General y Aplicada', 0, '[{"dia":"Jueves","hora_inicio":"14:55","hora_fin":"17:20"},{"dia":"Martes","hora_inicio":"18:15","hora_fin":"19:45"}]'),
  ('3C2', 'Resistencia de los Materiales', 1, '[{"dia":"Jueves","hora_inicio":"14:00","hora_fin":"17:20"},{"dia":"Martes","hora_inicio":"14:55","hora_fin":"18:15"}]'),
  ('4C1', 'Análisis Estructural 1', 1, '[{"dia":"Jueves","hora_inicio":"19:55","hora_fin":"23:05"},{"dia":"Martes","hora_inicio":"20:40","hora_fin":"23:05"},{"dia":"Viernes","hora_inicio":"20:40","hora_fin":"23:05"}]'),
  ('4C1', 'Diseño Arquitectónico, Planeamiento y Urbanismo', 0, '[{"dia":"Lunes","hora_inicio":"18:15","hora_fin":"22:20"}]'),
  ('4C1', 'Estructuras del Hormigón', 2, '[{"dia":"Jueves","hora_inicio":"17:20","hora_fin":"22:20"},{"dia":"Martes","hora_inicio":"19:55","hora_fin":"23:05"}]'),
  ('4C1', 'Geotecnia', 1, '[{"dia":"Jueves","hora_inicio":"18:15","hora_fin":"19:45"},{"dia":"Martes","hora_inicio":"17:20","hora_fin":"20:40"},{"dia":"Miercoles","hora_inicio":"17:20","hora_fin":"20:40"}]'),
  ('4C1', 'Hidrología y Obras Hidráulicas', 0, '[{"dia":"Viernes","hora_inicio":"17:20","hora_fin":"20:40"}]'),
  ('4C1', 'Ingeniería Legal 1', 2, '[{"dia":"Martes","hora_inicio":"17:20","hora_fin":"19:45"},{"dia":"Miercoles","hora_inicio":"18:15","hora_fin":"20:40"}]'),
  ('4C1', 'Instalaciones Sanitarias y de Gas 1', 0, '[{"dia":"Miercoles","hora_inicio":"20:40","hora_fin":"23:05"}]'),
  ('5C1', 'Análisis Estructural 2', 1, '[{"dia":"Lunes","hora_inicio":"17:20","hora_fin":"19:00"},{"dia":"Martes","hora_inicio":"19:55","hora_fin":"23:05"},{"dia":"Miercoles","hora_inicio":"19:55","hora_fin":"23:05"}]'),
  ('5C1', 'Cimentaciones', 1, '[{"dia":"Martes","hora_inicio":"17:20","hora_fin":"19:45"},{"dia":"Miercoles","hora_inicio":"17:20","hora_fin":"19:45"}]'),
  ('5C1', 'Construcciones Metálicas y de Madera', 2, '[{"dia":"Martes","hora_inicio":"20:40","hora_fin":"23:05"},{"dia":"Miercoles","hora_inicio":"17:20","hora_fin":"21:25"}]'),
  ('5C1', 'Gestión Ambiental y Desarrollo Sustentable', 2, '[{"dia":"Jueves","hora_inicio":"19:55","hora_fin":"23:05"},{"dia":"Miercoles","hora_inicio":"21:35","hora_fin":"23:05"}]'),
  ('5C1', 'Ingeniería Sanitaria', 0, '[{"dia":"Jueves","hora_inicio":"17:20","hora_fin":"19:45"}]'),
  ('5C1', 'Org. y Cond. de Obras', 0, '[{"dia":"Viernes","hora_inicio":"18:15","hora_fin":"23:05"}]'),
  ('5C1', 'Vías de Comunicación 1', 1, '[{"dia":"Jueves","hora_inicio":"19:55","hora_fin":"23:05"},{"dia":"Lunes","hora_inicio":"19:00","hora_fin":"23:05"}]'),
  ('5C1', 'Vías de Comunicación 2', 2, '[{"dia":"Lunes","hora_inicio":"19:00","hora_fin":"22:20"},{"dia":"Martes","hora_inicio":"17:20","hora_fin":"20:40"}]'),
  ('6C1', 'Diseño', 0, '[{"dia":"Lunes","hora_inicio":"13:15","hora_fin":"18:05"}]'),
  ('6C1', 'Línea de Rivera', 0, '[{"dia":"Jueves","hora_inicio":"14:55","hora_fin":"17:20"},{"dia":"Martes","hora_inicio":"14:55","hora_fin":"17:20"}]'),
  ('6C1', 'Obras Fluviales', 0, '[{"dia":"Lunes","hora_inicio":"14:00","hora_fin":"18:05"}]'),
  ('6C1', 'Obras Subterráneas', 2, '[{"dia":"Lunes","hora_inicio":"16:35","hora_fin":"18:05"},{"dia":"Martes","hora_inicio":"16:35","hora_fin":"18:05"},{"dia":"Viernes","hora_inicio":"16:35","hora_fin":"18:05"}]'),
  ('6C1', 'Prefabricación', 2, '[{"dia":"Martes","hora_inicio":"14:00","hora_fin":"17:20"}]'),
  ('6C1', 'Proyecto Final', 0, '[{"dia":"Lunes","hora_inicio":"19:00","hora_fin":"23:05"},{"dia":"Miercoles","hora_inicio":"17:20","hora_fin":"19:45"}]'),
  ('6C1', 'Puentes', 0, '[{"dia":"Viernes","hora_inicio":"18:15","hora_fin":"23:05"}]'),
  ('6C1', 'Tránsito y Transporte', 2, '[{"dia":"Sabado","hora_inicio":"8:45","hora_fin":"11:10"},{"dia":"Viernes","hora_inicio":"16:35","hora_fin":"18:05"}]'),
  ('6C1', 'Vialidad Especial', 0, '[{"dia":"Jueves","hora_inicio":"18:15","hora_fin":"23:05"}]'),
  ('1C3', 'Análisis 1', 0, '[{"dia":"Martes","hora_inicio":"15:40","hora_fin":"18:05"},{"dia":"Viernes","hora_inicio":"13:15","hora_fin":"14:45"}]'),
  ('1C3', 'Fundamentos de Informática', 2, '[{"dia":"Lunes","hora_inicio":"11:20","hora_fin":"12:50"},{"dia":"Sabado","hora_inicio":"11:20","hora_fin":"13:00"}]'),
  ('1C3', 'Física 1', 0, '[{"dia":"Martes","hora_inicio":"14:00","hora_fin":"15:40"},{"dia":"Miercoles","hora_inicio":"15:40","hora_fin":"18:05"}]'),
  ('1C3', 'Ingeniería Civil 1', 1, '[{"dia":"Miercoles","hora_inicio":"13:15","hora_fin":"15:40"},{"dia":"Viernes","hora_inicio":"14:55","hora_fin":"17:20"}]'),
  ('1C3', 'Ingeniería y Sociedad', 0, '[{"dia":"Lunes","hora_inicio":"14:00","hora_fin":"15:40"}]'),
  ('1C3', 'Química General', 0, '[{"dia":"Jueves","hora_inicio":"13:15","hora_fin":"17:20"}]'),
  ('1C3', 'Sistemas de Representación', 2, '[{"dia":"Miercoles","hora_inicio":"13:15","hora_fin":"15:40"},{"dia":"Sabado","hora_inicio":"8:45","hora_fin":"11:10"}]'),
  ('1C3', 'Álgebra', 0, '[{"dia":"Lunes","hora_inicio":"15:40","hora_fin":"18:05"},{"dia":"Martes","hora_inicio":"12:05","hora_fin":"12:50"},{"dia":"Martes","hora_inicio":"13:15","hora_fin":"14:00"}]');

INSERT INTO "ComisionMaterias" ("idComision", "idMateria", cuatrimestre, horarios)
SELECT cm.id, mm.id, c.cuat, c.horarios
FROM carga c
JOIN com_map cm ON cm.clave = c.com
JOIN mat_map mm ON mm.nombre = c.mat
ON CONFLICT ("idMateria", "idComision") DO UPDATE
SET cuatrimestre = EXCLUDED.cuatrimestre, horarios = EXCLUDED.horarios;

-- ---------- 5. Verificación ----------
DO $$
DECLARE v_filas int; v_bloques int; v_fuera int;
BEGIN
  SELECT count(*) INTO v_filas
  FROM "ComisionMaterias" cm JOIN com_map c ON c.id = cm."idComision"
  WHERE cm.horarios IS NOT NULL;
  IF v_filas <> 69 THEN
    RAISE EXCEPTION 'Se esperaban 69 filas con horarios, hay %', v_filas;
  END IF;

  SELECT count(*) INTO v_bloques
  FROM "ComisionMaterias" cm JOIN com_map c ON c.id = cm."idComision",
       jsonb_array_elements(cm.horarios) h;
  IF v_bloques <> 116 THEN
    RAISE EXCEPTION 'Se esperaban 116 bloques, hay %', v_bloques;
  END IF;

  SELECT count(*) INTO v_fuera
  FROM "ComisionMaterias" cm JOIN com_map c ON c.id = cm."idComision",
       jsonb_array_elements(cm.horarios) h
  WHERE h->>'dia' NOT IN ('Lunes','Martes','Miercoles','Jueves','Viernes','Sabado')
     OR h->>'hora_inicio' NOT IN ('8:00','8:40','8:45','9:30','9:40','10:25','11:10','11:20','12:05',
        '12:50','13:00','13:15','14:00','14:45','14:55','15:00','15:40','16:25','16:35','17:00','17:20',
        '18:05','18:15','19:00','19:45','19:55','20:40','21:25','21:35','22:10','22:20','23:05')
     OR h->>'hora_fin' NOT IN ('8:00','8:40','8:45','9:30','9:40','10:25','11:10','11:20','12:05',
        '12:50','13:00','13:15','14:00','14:45','14:55','15:00','15:40','16:25','16:35','17:00','17:20',
        '18:05','18:15','19:00','19:45','19:55','20:40','21:25','21:35','22:10','22:20','23:05');
  IF v_fuera > 0 THEN
    RAISE EXCEPTION '% bloque(s) con dia/hora fuera de DIAS o FRANJAS', v_fuera;
  END IF;

  RAISE NOTICE 'OK: 69 filas, 116 bloques, 0 valores fuera de rango.';
END $$;

COMMIT;
