-- ============================================================
-- Horarios Ingeniería Química  ·  carga completa
-- Fuente: "Horarios Ingeniería Química.xlsx" (hojas normalizadas 1v1..5v1)
-- 60 pares (comisión, materia) · 94 bloques horarios
-- (96 filas en el Excel: PPS no tiene horario, y Proyecto Final figura
--  repetido en ambos cuatrimestres con el mismo bloque)
--
-- REQUIERE, en app/armadorHorarios/page.tsx, que FRANJAS incluya "22:10":
-- es borde de módulo del turno noche (21:35-22:10 y 22:10-23:05) y lo usan
-- 21 bloques. Sin esa franja, franjaIdx() devuelve -1, los bloques colapsan
-- a la altura de su texto y el detector de conflictos los ignora en silencio.
--
-- Dos horas de las hojas normalizadas son typos y van corregidas contra las
-- hojas de grilla, que son la fuente autoritativa del eje de módulos:
--   3V1 Economía jueves  20:45 -> 20:40  (hoja "3V1 TN", fila 20:40-21:25)
--   5V1 Hidrógeno martes 17:00 -> 17:20  (hoja "5V1 TN", fila 16:35-17:20)
--
-- Agrega además `materia.es_electiva` y marca las 8 electivas del
-- Plan 2023 de Ing. Química que aparecen en el horario de 5V1. El flag
-- sirve para excluirlas del total de horas obligatorias en /progreso;
-- no hay sistema de puntos ni de créditos de electiva.
-- OJO: `materia.tipo` NO sirve para esto — ya significa "materia común
-- del ciclo básico" (9 filas en true, compartidas por las 8 carreras).
-- ============================================================

BEGIN;

-- ---------- 0. Snapshot para poder revertir ----------
-- Tablas permanentes (sobreviven al COMMIT). `rollback_horarios_quimica.sql`
-- las usa para saber qué filas existían antes y con qué valores.
-- Si ya existen, se abortan: significa que la carga ya se corrió y el
-- snapshot vigente es el bueno — no hay que pisarlo.
DO $$
BEGIN
  IF to_regclass('backup._bkp_quimica_cm') IS NOT NULL THEN
    RAISE EXCEPTION 'Ya existe backup._bkp_quimica_cm: la carga ya se corrió. Corré el rollback antes de repetirla.';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='materia'
               AND column_name='es_electiva') THEN
    RAISE EXCEPTION 'materia.es_electiva ya existe. Revisá el estado antes de seguir: el rollback la borra.';
  END IF;
END $$;

-- Schema aparte a propósito: PostgREST solo expone `public`, así que acá
-- los snapshots quedan fuera del API y del dashboard. En `public` habrían
-- sido tablas sin RLS legibles con la anon key.
CREATE SCHEMA IF NOT EXISTS backup;
REVOKE ALL ON SCHEMA backup FROM anon, authenticated;
COMMENT ON SCHEMA backup IS
  'Snapshots para revertir cargas de datos. Fuera de public: PostgREST no lo expone. No consumir desde la app.';

CREATE TABLE backup._bkp_quimica_cm AS
SELECT cm.* FROM "ComisionMaterias" cm
JOIN comision c ON c.id = cm."idComision"
WHERE c.ingenieria_id = (SELECT ingenieria_id FROM comision WHERE id = 65);

-- Guarda tipo y horas_semanales además del id: la carga le toca las horas
-- a PPS (id 37) y el rollback tiene que poder devolverlas.
CREATE TABLE backup._bkp_quimica_materia AS SELECT id, tipo, horas_semanales FROM materia;
CREATE TABLE backup._bkp_quimica_comision AS SELECT id FROM comision;

REVOKE ALL ON ALL TABLES IN SCHEMA backup FROM anon, authenticated;

COMMENT ON TABLE backup._bkp_quimica_cm IS
  'ComisionMaterias de Ing. Química previo a carga_horarios_quimica.sql. Lo usa rollback_horarios_quimica.sql.';

-- ---------- 1. Marcar electivas ----------
-- Flag global en `materia`: una materia es electiva en todas las carreras
-- o en ninguna. Si algún día una carrera la toma como obligatoria, hay que
-- mover el flag a ComisionMaterias (que es donde vive el par plan↔materia).
ALTER TABLE materia ADD COLUMN es_electiva boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN materia.es_electiva IS
  'Electiva del plan de estudios: no cuenta para el total de horas obligatorias en /progreso.';

-- Prácticas Profesionales Supervisadas (id 37) NO se toca. Figura en la
-- tabla de electivas del plan, pero funciona aparte del régimen de
-- electivas y su carga horaria (150) es el total de la práctica, no una
-- carga semanal: mezclarla con las horas semanales del resto daría
-- cualquier cosa. Queda como materia normal con horas_semanales NULL,
-- que suma 0 horas y no distorsiona ningún total.

-- ---------- 2. Comisión faltante: 1V3 (recursantes, turno tarde) ----------
INSERT INTO comision (nombre, "año", ingenieria_id)
SELECT '1V3', 1, (SELECT ingenieria_id FROM comision WHERE id = 65)
WHERE NOT EXISTS (
  SELECT 1 FROM comision
  WHERE nombre = '1V3'
    AND ingenieria_id = (SELECT ingenieria_id FROM comision WHERE id = 65)
);

-- ---------- 3. Materias inexistentes en la tabla `materia` ----------
-- horas: columna "Carga horaria" de ELECTIVAS VIGENTES PLAN 2023.
-- Las 8 son electivas. H2PX no figura en esa tabla (¿seminario posterior
-- al plan?); se marca electiva igual, que es la opción conservadora:
-- así no infla el denominador de /progreso.
CREATE TEMP TABLE mat_nueva (clave text PRIMARY KEY, nombre text NOT NULL,
                             horas smallint, electiva boolean NOT NULL) ON COMMIT DROP;
INSERT INTO mat_nueva (clave, nombre, horas, electiva) VALUES
  ('GPH',  'Gestión de Potencial Humano',                     4,    true),
  ('H2PX', 'Hidrógeno y Power-to-X Renovable',                NULL, true),
  ('TALI', 'Tecnología de los Alimentos',                     6,    true),
  ('CATA', 'Catalizadores y Procesos Catalíticos',            6,    true),
  ('FMAT', 'Física de los Materiales (FAMAF)',                6,    true),
  ('FTE',  'Formación de Tutores Emprendedores',              4,    true),
  ('HDGE', 'Herramientas de Dirección y Gestión Empresarial', 4,    true),
  ('IINS', 'Ingeniería de las Instalaciones',                 4,    true);

INSERT INTO materia (nombre, tipo, horas_semanales, es_electiva)
SELECT n.nombre, false, n.horas, n.electiva FROM mat_nueva n
WHERE NOT EXISTS (SELECT 1 FROM materia m WHERE m.nombre = n.nombre);

-- ---------- 4. Resolución de IDs ----------
CREATE TEMP TABLE mat_map (clave text PRIMARY KEY, id bigint NOT NULL) ON COMMIT DROP;
INSERT INTO mat_map (clave, id) VALUES
  ('AM1', 1),
  ('ALG', 2),
  ('FIS1', 3),
  ('ING1', 4),
  ('IYS', 5),
  ('AM2', 6),
  ('FIS2', 7),
  ('ING2', 8),
  ('PYE', 9),
  ('PF', 36),
  ('PPS', 37),
  ('SR', 39),
  ('LEG', 64),
  ('IIQ', 97),
  ('QUI', 98),
  ('QINO', 99),
  ('IEP', 100),
  ('QORG', 101),
  ('MSA', 102),
  ('FINF', 103),
  ('TERMO', 104),
  ('CMAT', 105),
  ('QANA', 106),
  ('MQB', 107),
  ('ECO', 108),
  ('BME', 109),
  ('FQ', 110),
  ('FT', 111),
  ('QAPL', 112),
  ('OU1', 113),
  ('TET', 114),
  ('IRQ', 115),
  ('DSOP', 116),
  ('OU2', 117),
  ('HYS', 118),
  ('ORGI', 119),
  ('PBIO', 120),
  ('CAP', 121),
  ('MECI', 122),
  ('IAMB', 123),
  ('CCEP', 124),
  ('MIE', 141);

INSERT INTO mat_map (clave, id)
SELECT n.clave, m.id FROM mat_nueva n JOIN materia m ON m.nombre = n.nombre;

CREATE TEMP TABLE com_map (clave text PRIMARY KEY, id bigint NOT NULL) ON COMMIT DROP;
INSERT INTO com_map (clave, id) VALUES
  ('1V1', 65),
  ('1V2', 66),
  ('1V4', 67),
  ('2V1', 68),
  ('3V1', 69),
  ('4V1', 70),
  ('5V1', 71);
INSERT INTO com_map (clave, id)
SELECT '1V3', id FROM comision
WHERE nombre = '1V3'
  AND ingenieria_id = (SELECT ingenieria_id FROM comision WHERE id = 65);

-- ---------- 5. Carga de horarios ----------
-- `cuatrimestre` = columna de la fila (0 = anual/ambos cuatrimestres).
-- Cada objeto de `horarios` lleva SOLO dia / hora_inicio / hora_fin:
-- es la convención de los 940 registros ya cargados.
CREATE TEMP TABLE carga (com text, mat text, cuat smallint, horarios jsonb) ON COMMIT DROP;
INSERT INTO carga (com, mat, cuat, horarios) VALUES
  ('1V1', 'AM1', 1, '[{"dia":"Lunes","hora_inicio":"13:15","hora_fin":"17:20"},{"dia":"Jueves","hora_inicio":"13:15","hora_fin":"17:20"}]'),
  ('1V1', 'AM2', 2, '[{"dia":"Lunes","hora_inicio":"14:00","hora_fin":"18:05"},{"dia":"Jueves","hora_inicio":"14:00","hora_fin":"18:05"}]'),
  ('1V1', 'IYS', 1, '[{"dia":"Martes","hora_inicio":"13:15","hora_fin":"14:45"},{"dia":"Miercoles","hora_inicio":"13:15","hora_fin":"14:45"}]'),
  ('1V1', 'ING1', 2, '[{"dia":"Viernes","hora_inicio":"16:35","hora_fin":"19:45"}]'),
  ('1V1', 'IIQ', 1, '[{"dia":"Lunes","hora_inicio":"17:20","hora_fin":"19:45"},{"dia":"Viernes","hora_inicio":"15:40","hora_fin":"18:05"}]'),
  ('1V1', 'QUI', 2, '[{"dia":"Martes","hora_inicio":"13:15","hora_fin":"17:20"},{"dia":"Miercoles","hora_inicio":"13:15","hora_fin":"17:20"}]'),
  ('1V1', 'SR', 2, '[{"dia":"Viernes","hora_inicio":"13:15","hora_fin":"16:25"}]'),
  ('1V1', 'ALG', 1, '[{"dia":"Martes","hora_inicio":"14:55","hora_fin":"17:20"},{"dia":"Miercoles","hora_inicio":"14:55","hora_fin":"18:05"},{"dia":"Viernes","hora_inicio":"13:15","hora_fin":"15:40"}]'),
  ('1V2', 'AM1', 1, '[{"dia":"Miercoles","hora_inicio":"18:15","hora_fin":"22:10"},{"dia":"Viernes","hora_inicio":"18:15","hora_fin":"22:10"}]'),
  ('1V2', 'AM2', 2, '[{"dia":"Lunes","hora_inicio":"18:15","hora_fin":"22:10"},{"dia":"Miercoles","hora_inicio":"18:15","hora_fin":"22:10"}]'),
  ('1V2', 'IYS', 1, '[{"dia":"Jueves","hora_inicio":"19:55","hora_fin":"23:05"}]'),
  ('1V2', 'ING1', 2, '[{"dia":"Viernes","hora_inicio":"16:35","hora_fin":"19:45"}]'),
  ('1V2', 'IIQ', 1, '[{"dia":"Lunes","hora_inicio":"16:35","hora_fin":"19:45"},{"dia":"Viernes","hora_inicio":"15:40","hora_fin":"18:05"}]'),
  ('1V2', 'QUI', 2, '[{"dia":"Martes","hora_inicio":"18:15","hora_fin":"22:10"},{"dia":"Jueves","hora_inicio":"18:15","hora_fin":"22:10"}]'),
  ('1V2', 'SR', 2, '[{"dia":"Viernes","hora_inicio":"13:15","hora_fin":"16:25"}]'),
  ('1V2', 'ALG', 1, '[{"dia":"Lunes","hora_inicio":"19:55","hora_fin":"22:10"},{"dia":"Martes","hora_inicio":"18:15","hora_fin":"23:05"},{"dia":"Jueves","hora_inicio":"18:15","hora_fin":"19:45"}]'),
  ('1V3', 'QUI', 1, '[{"dia":"Martes","hora_inicio":"14:00","hora_fin":"18:05"},{"dia":"Miercoles","hora_inicio":"14:00","hora_fin":"18:05"}]'),
  ('1V4', 'QUI', 1, '[{"dia":"Martes","hora_inicio":"8:00","hora_fin":"12:05"},{"dia":"Jueves","hora_inicio":"8:00","hora_fin":"12:05"}]'),
  ('2V1', 'FINF', 1, '[{"dia":"Martes","hora_inicio":"14:55","hora_fin":"16:25"},{"dia":"Miercoles","hora_inicio":"14:55","hora_fin":"16:25"}]'),
  ('2V1', 'FIS1', 1, '[{"dia":"Martes","hora_inicio":"18:15","hora_fin":"22:10"},{"dia":"Miercoles","hora_inicio":"18:15","hora_fin":"22:10"}]'),
  ('2V1', 'FIS2', 2, '[{"dia":"Miercoles","hora_inicio":"18:15","hora_fin":"22:10"},{"dia":"Viernes","hora_inicio":"18:15","hora_fin":"22:10"}]'),
  ('2V1', 'ING2', 1, '[{"dia":"Lunes","hora_inicio":"14:55","hora_fin":"16:25"},{"dia":"Jueves","hora_inicio":"18:15","hora_fin":"19:45"}]'),
  ('2V1', 'IEP', 2, '[{"dia":"Lunes","hora_inicio":"15:40","hora_fin":"18:05"},{"dia":"Miercoles","hora_inicio":"15:40","hora_fin":"18:05"}]'),
  ('2V1', 'MSA', 2, '[{"dia":"Lunes","hora_inicio":"18:15","hora_fin":"23:05"}]'),
  ('2V1', 'PYE', 1, '[{"dia":"Viernes","hora_inicio":"18:15","hora_fin":"23:05"}]'),
  ('2V1', 'QINO', 1, '[{"dia":"Lunes","hora_inicio":"18:15","hora_fin":"21:25"},{"dia":"Jueves","hora_inicio":"14:55","hora_fin":"18:05"}]'),
  ('2V1', 'QORG', 2, '[{"dia":"Martes","hora_inicio":"18:15","hora_fin":"22:10"},{"dia":"Jueves","hora_inicio":"18:15","hora_fin":"22:10"}]'),
  ('3V1', 'BME', 2, '[{"dia":"Lunes","hora_inicio":"18:15","hora_fin":"23:05"}]'),
  ('3V1', 'CMAT', 1, '[{"dia":"Viernes","hora_inicio":"18:15","hora_fin":"21:25"}]'),
  ('3V1', 'ECO', 1, '[{"dia":"Lunes","hora_inicio":"19:55","hora_fin":"23:05"},{"dia":"Jueves","hora_inicio":"20:40","hora_fin":"22:10"}]'),
  ('3V1', 'FT', 2, '[{"dia":"Jueves","hora_inicio":"16:35","hora_fin":"19:45"},{"dia":"Viernes","hora_inicio":"18:15","hora_fin":"23:05"}]'),
  ('3V1', 'FQ', 2, '[{"dia":"Martes","hora_inicio":"19:55","hora_fin":"22:10"},{"dia":"Miercoles","hora_inicio":"18:15","hora_fin":"22:10"}]'),
  ('3V1', 'LEG', 2, '[{"dia":"Martes","hora_inicio":"18:15","hora_fin":"19:45"},{"dia":"Miercoles","hora_inicio":"16:35","hora_fin":"18:05"}]'),
  ('3V1', 'MQB', 1, '[{"dia":"Miercoles","hora_inicio":"18:15","hora_fin":"23:05"}]'),
  ('3V1', 'QANA', 1, '[{"dia":"Lunes","hora_inicio":"15:40","hora_fin":"19:45"},{"dia":"Jueves","hora_inicio":"18:15","hora_fin":"20:40"}]'),
  ('3V1', 'QAPL', 2, '[{"dia":"Jueves","hora_inicio":"20:40","hora_fin":"23:05"}]'),
  ('3V1', 'TERMO', 1, '[{"dia":"Martes","hora_inicio":"18:15","hora_fin":"23:05"},{"dia":"Viernes","hora_inicio":"21:35","hora_fin":"23:05"}]'),
  ('4V1', 'DSOP', 2, '[{"dia":"Viernes","hora_inicio":"16:35","hora_fin":"23:05"}]'),
  ('4V1', 'HYS', 2, '[{"dia":"Jueves","hora_inicio":"19:55","hora_fin":"23:05"}]'),
  ('4V1', 'IRQ', 1, '[{"dia":"Miercoles","hora_inicio":"19:55","hora_fin":"23:05"},{"dia":"Jueves","hora_inicio":"18:15","hora_fin":"23:05"}]'),
  ('4V1', 'OU1', 1, '[{"dia":"Lunes","hora_inicio":"18:15","hora_fin":"23:05"},{"dia":"Miercoles","hora_inicio":"17:20","hora_fin":"19:45"}]'),
  ('4V1', 'OU2', 2, '[{"dia":"Martes","hora_inicio":"18:15","hora_fin":"23:05"},{"dia":"Jueves","hora_inicio":"16:35","hora_fin":"19:45"}]'),
  ('4V1', 'ORGI', 2, '[{"dia":"Lunes","hora_inicio":"18:15","hora_fin":"23:05"}]'),
  ('4V1', 'PBIO', 2, '[{"dia":"Miercoles","hora_inicio":"18:15","hora_fin":"23:05"}]'),
  ('4V1', 'TET', 1, '[{"dia":"Martes","hora_inicio":"18:15","hora_fin":"22:10"},{"dia":"Viernes","hora_inicio":"18:15","hora_fin":"22:10"}]'),
  ('5V1', 'CCEP', 2, '[{"dia":"Martes","hora_inicio":"18:15","hora_fin":"23:05"}]'),
  ('5V1', 'CATA', 2, '[{"dia":"Lunes","hora_inicio":"14:55","hora_fin":"19:45"}]'),
  ('5V1', 'CAP', 1, '[{"dia":"Miercoles","hora_inicio":"18:15","hora_fin":"22:10"},{"dia":"Viernes","hora_inicio":"18:15","hora_fin":"20:40"}]'),
  ('5V1', 'FTE', 2, '[{"dia":"Miercoles","hora_inicio":"19:00","hora_fin":"22:10"}]'),
  ('5V1', 'FMAT', 2, '[{"dia":"Miercoles","hora_inicio":"15:40","hora_fin":"18:05"},{"dia":"Jueves","hora_inicio":"15:40","hora_fin":"18:05"}]'),
  ('5V1', 'GPH', 1, '[{"dia":"Lunes","hora_inicio":"16:35","hora_fin":"19:45"}]'),
  ('5V1', 'HDGE', 2, '[{"dia":"Jueves","hora_inicio":"19:00","hora_fin":"22:10"}]'),
  ('5V1', 'H2PX', 1, '[{"dia":"Martes","hora_inicio":"14:00","hora_fin":"17:20"}]'),
  ('5V1', 'IAMB', 1, '[{"dia":"Miercoles","hora_inicio":"15:40","hora_fin":"18:05"},{"dia":"Jueves","hora_inicio":"20:40","hora_fin":"23:05"}]'),
  ('5V1', 'IINS', 2, '[{"dia":"Viernes","hora_inicio":"16:35","hora_fin":"19:45"}]'),
  ('5V1', 'MECI', 1, '[{"dia":"Martes","hora_inicio":"18:15","hora_fin":"23:05"}]'),
  ('5V1', 'MIE', 1, '[{"dia":"Jueves","hora_inicio":"17:20","hora_fin":"20:40"}]'),
  ('5V1', 'PF', 0, '[{"dia":"Lunes","hora_inicio":"19:55","hora_fin":"23:05"}]'),
  ('5V1', 'PPS', 0, '[]'),
  ('5V1', 'TALI', 1, '[{"dia":"Viernes","hora_inicio":"13:15","hora_fin":"18:05"}]');

INSERT INTO "ComisionMaterias" ("idComision", "idMateria", cuatrimestre, horarios)
SELECT cm.id, mm.id, c.cuat, c.horarios
FROM carga c
JOIN com_map cm ON cm.clave = c.com
JOIN mat_map mm ON mm.clave = c.mat
ON CONFLICT ("idMateria", "idComision") DO UPDATE
SET cuatrimestre = EXCLUDED.cuatrimestre,
    horarios     = EXCLUDED.horarios;

-- ---------- 6. Verificación (abortá si algo no cierra) ----------
DO $$
DECLARE v_filas int; v_bloques int; v_fuera int; v_electivas int; v_choque int;
BEGIN
  SELECT count(*) INTO v_filas
  FROM "ComisionMaterias" cm JOIN com_map c ON c.id = cm."idComision"
  WHERE cm.horarios IS NOT NULL;
  IF v_filas <> 60 THEN
    RAISE EXCEPTION 'Se esperaban 60 filas con horarios, hay %', v_filas;
  END IF;

  SELECT count(*) INTO v_bloques
  FROM "ComisionMaterias" cm JOIN com_map c ON c.id = cm."idComision",
       jsonb_array_elements(cm.horarios) h;
  IF v_bloques <> 94 THEN
    RAISE EXCEPTION 'Se esperaban 94 bloques, hay %', v_bloques;
  END IF;

  SELECT count(*) INTO v_fuera
  FROM "ComisionMaterias" cm JOIN com_map c ON c.id = cm."idComision",
       jsonb_array_elements(cm.horarios) h
  WHERE h->>'dia' NOT IN ('Lunes','Martes','Miercoles','Jueves','Viernes','Sabado')
     OR h->>'hora_inicio' NOT IN ('8:00','8:45','9:30','9:40','10:25','11:10','11:20','12:05',
        '12:50','13:15','14:00','14:45','14:55','15:40','16:25','16:35','17:20','18:05',
        '18:15','19:00','19:45','19:55','20:40','21:25','21:35','22:10','22:20','23:05')
     OR h->>'hora_fin' NOT IN ('8:00','8:45','9:30','9:40','10:25','11:10','11:20','12:05',
        '12:50','13:15','14:00','14:45','14:55','15:40','16:25','16:35','17:20','18:05',
        '18:15','19:00','19:45','19:55','20:40','21:25','21:35','22:10','22:20','23:05');
  IF v_fuera > 0 THEN
    RAISE EXCEPTION '% bloque(s) con dia/hora fuera de DIAS o FRANJAS', v_fuera;
  END IF;

  SELECT count(*) INTO v_electivas FROM materia WHERE es_electiva;
  IF v_electivas <> 8 THEN
    RAISE EXCEPTION 'Se esperaban 8 electivas, hay %', v_electivas;
  END IF;

  -- Ninguna materia común del ciclo básico puede haber quedado marcada
  -- como electiva: eso rompería /progreso para las 8 carreras.
  SELECT count(*) INTO v_choque FROM materia WHERE es_electiva AND tipo IS TRUE;
  IF v_choque > 0 THEN
    RAISE EXCEPTION '% materia(s) del ciclo básico quedaron marcadas como electivas', v_choque;
  END IF;

  RAISE NOTICE 'OK: 60 filas, 94 bloques, 8 electivas, 0 valores fuera de rango.';
END $$;

COMMIT;
