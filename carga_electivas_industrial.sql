-- ============================================================
-- Electivas de Ingeniería Industrial (5to año)
--
-- Fuentes:
--   · "Regimen de corelativas industrial.docx (1).pdf" — plan 2023,
--     página 2 "ELECTIVAS VIGENTES". De ahí salen la MODALIDAD (1C/2C)
--     y la CARGA HORARIA de cada electiva.
--   · "5to año  indusrial.xlsx" — de ahí sale QUÉ COMISIÓN OFRECE CUÁL,
--     leyendo la leyenda de cada hoja.
--
-- ---------------------------------------------------------------
-- SIN HORARIOS: ninguna fuente los tiene
-- ---------------------------------------------------------------
-- El PDF es un régimen de correlativas: trae correlativas, carga
-- horaria, créditos y modalidad, pero NO días ni horas. El Excel de 5to
-- año lista las electivas en la leyenda de la columna K con su docente,
-- pero se verificó por color de relleno que NINGUNA aparece en las
-- columnas de días de ninguna hoja.
--
-- Por eso estas filas se crean con `horarios` NULL. No se inventa un
-- horario que la fuente no da. Sirven para /progreso (el flag
-- `es_electiva` las excluye de los totales de avance de carrera), no
-- para el armador de horarios, que sólo muestra materias con bloques.
--
-- ---------------------------------------------------------------
-- Validación cruzada del PDF contra la base
-- ---------------------------------------------------------------
-- Antes de tocar nada se comparó la carga horaria de las 42 asignaturas
-- del plan contra `materia.horas_semanales`: **41 de 42 coinciden
-- exactamente, 0 difieren**. La única ausente es "Proyecto Final"
-- (nº 42, carga 6), que no existe en la base — ver pendientes abajo.
--
-- Además el PDF declara TODAS las 42 asignaturas como modalidad "A"
-- (anual). Eso confirma de forma independiente la decisión que se tomó
-- en los 5 años de Industrial con el test del ratio minutos/(hs*45).
-- Las electivas, en cambio, son 1C o 2C: cuatrimestrales.
--
-- ---------------------------------------------------------------
-- Nombres
-- ---------------------------------------------------------------
-- Se usa el nombre canónico del PDF + el sufijo " (electiva)", que es la
-- convención ya establecida en la base (60 electivas de Civil,
-- Eléctrica, Electrónica, Mecánica, Química y Sistemas). El Excel usa
-- "(Elec.)" / "(Elect)" / "(Elec.):", que no se replica.
--
-- Ojo: ya existe la materia 28 "Simulación" (troncal de Sistemas). La
-- nueva "Simulación (electiva)" es otra cosa; el sufijo las distingue.
--
-- ---------------------------------------------------------------
-- "Industria 4.0" NO está en el plan del PDF
-- ---------------------------------------------------------------
-- La hoja 5D5 del Excel la ofrece ("Industria 4.0(Elect)", docentes
-- Abet / Casasnovas), pero NO figura en las "electivas vigentes plan
-- 2023" del PDF. Se crea igual porque la comisión la ofrece, pero
-- queda con `horas_semanales` NULL y `cuatrimestre` NULL: el PDF no da
-- ni su carga ni su modalidad, y no se inventan.
-- ============================================================

BEGIN;

-- ---------- Snapshot para rollback ----------
CREATE SCHEMA IF NOT EXISTS backup;
REVOKE ALL ON SCHEMA backup FROM anon, authenticated;

DROP TABLE IF EXISTS backup._bkp_electivas_industrial_materia;
CREATE TABLE backup._bkp_electivas_industrial_materia (id bigint PRIMARY KEY, nombre varchar);
REVOKE ALL ON backup._bkp_electivas_industrial_materia FROM anon, authenticated;

-- ---------- Guardas ----------
DO $guard$
DECLARE v int;
BEGIN
  SELECT count(*) INTO v FROM public.comision
   WHERE id IN (120,121,122,123,124) AND nombre IN ('5D1','5D2','5D3','5D4','5D5');
  IF v <> 5 THEN RAISE EXCEPTION 'Las comisiones 5D1..5D5 no son 120..124 (encontradas: %)', v; END IF;

  SELECT count(*) INTO v FROM public.materia
   WHERE nombre IN (
     'Gestión Ambiental (electiva)','Gestión de Proyectos (electiva)','Gestión Emprendedora (electiva)',
     'Logística (electiva)','Política Económica (electiva)','Energías Renovables (electiva)',
     'Gestión del Conocimiento, la Innovación y Economía Crítica (electiva)',
     'Coaching de Formadores (electiva)','Simulación (electiva)','Análisis de Datos I (electiva)',
     'Sustentabilidad y Nuevas Economías (electiva)','CNH Cátedra In Situ (electiva)',
     'Industria 4.0 (electiva)');
  IF v <> 0 THEN RAISE EXCEPTION 'Alguna electiva de Industrial ya existe (encontradas: %). Correr el rollback primero.', v; END IF;
END $guard$;

-- ---------- Alta de materias ----------
-- materia.id es IDENTITY: nunca se pasa un id explícito.
-- horas_semanales = "Carga horaria" del PDF.
WITH nuevas(nombre, hs) AS (VALUES
  ('Gestión Ambiental (electiva)',                                          4::smallint),
  ('Gestión de Proyectos (electiva)',                                       4),
  ('Gestión Emprendedora (electiva)',                                       4),
  ('Logística (electiva)',                                                  4),
  ('Política Económica (electiva)',                                         4),
  ('Energías Renovables (electiva)',                                        4),
  ('Gestión del Conocimiento, la Innovación y Economía Crítica (electiva)', 4),
  ('Coaching de Formadores (electiva)',                                     6),
  ('Simulación (electiva)',                                                 6),
  ('Análisis de Datos I (electiva)',                                        4),
  ('Sustentabilidad y Nuevas Economías (electiva)',                         4),
  ('CNH Cátedra In Situ (electiva)',                                        4),
  ('Industria 4.0 (electiva)',                                              NULL)   -- no está en el PDF
)
INSERT INTO public.materia (nombre, horas_semanales, es_electiva)
SELECT nombre, hs, true FROM nuevas;

-- Snapshot de los ids recién creados, para que el rollback sepa qué borrar
INSERT INTO backup._bkp_electivas_industrial_materia (id, nombre)
SELECT id, nombre FROM public.materia
 WHERE es_electiva = true
   AND nombre IN (
     'Gestión Ambiental (electiva)','Gestión de Proyectos (electiva)','Gestión Emprendedora (electiva)',
     'Logística (electiva)','Política Económica (electiva)','Energías Renovables (electiva)',
     'Gestión del Conocimiento, la Innovación y Economía Crítica (electiva)',
     'Coaching de Formadores (electiva)','Simulación (electiva)','Análisis de Datos I (electiva)',
     'Sustentabilidad y Nuevas Economías (electiva)','CNH Cátedra In Situ (electiva)',
     'Industria 4.0 (electiva)');

-- ---------- Alta en ComisionMaterias ----------
-- Qué comisión ofrece cuál, según la leyenda de cada hoja del Excel.
-- cuatrimestre = modalidad del PDF (1C -> 1, 2C -> 2). horarios NULL.
WITH mapa(idcom, nombre, cuatri) AS (VALUES
  -- 5D1 (120) — Turno Noche
  (120, 'Gestión del Conocimiento, la Innovación y Economía Crítica (electiva)', 2::smallint),
  (120, 'Gestión Emprendedora (electiva)',                                       1),
  (120, 'Logística (electiva)',                                                  1),
  (120, 'Análisis de Datos I (electiva)',                                        2),
  (120, 'Gestión Ambiental (electiva)',                                          1),
  (120, 'Gestión de Proyectos (electiva)',                                       1),
  (120, 'Política Económica (electiva)',                                         2),
  (120, 'Simulación (electiva)',                                                 2),
  -- 5D2 (121) — Turno Tarde
  (121, 'CNH Cátedra In Situ (electiva)',                                        2),
  (121, 'Sustentabilidad y Nuevas Economías (electiva)',                         1),
  -- 5D3 (122) — Turno Mañana
  (122, 'Logística (electiva)',                                                  1),
  (122, 'Política Económica (electiva)',                                         2),
  -- 5D4 (123)
  (123, 'Energías Renovables (electiva)',                                        1),
  -- 5D5 (124)
  (124, 'Coaching de Formadores (electiva)',                                     2),
  (124, 'Industria 4.0 (electiva)',                                           NULL)  -- modalidad desconocida
)
INSERT INTO public."ComisionMaterias" ("idMateria", "idComision", cuatrimestre, horarios)
SELECT m.id, mapa.idcom, mapa.cuatri, NULL
  FROM mapa JOIN public.materia m ON m.nombre = mapa.nombre AND m.es_electiva = true;

-- ---------- Verificación ----------
DO $verif$
DECLARE mats int; filas int; conhorario int; noelect int;
BEGIN
  SELECT count(*) INTO mats FROM backup._bkp_electivas_industrial_materia;
  IF mats <> 13 THEN RAISE EXCEPTION 'Se esperaban 13 materias nuevas, hay %', mats; END IF;

  SELECT count(*) INTO filas
    FROM public."ComisionMaterias" cm
    JOIN backup._bkp_electivas_industrial_materia b ON b.id = cm."idMateria";
  IF filas <> 15 THEN RAISE EXCEPTION 'Se esperaban 15 filas ComisionMaterias, hay %', filas; END IF;

  -- ninguna puede tener horarios: la fuente no los da
  SELECT count(*) INTO conhorario
    FROM public."ComisionMaterias" cm
    JOIN backup._bkp_electivas_industrial_materia b ON b.id = cm."idMateria"
   WHERE cm.horarios IS NOT NULL;
  IF conhorario > 0 THEN RAISE EXCEPTION '% fila(s) quedaron con horarios y no deberían', conhorario; END IF;

  SELECT count(*) INTO noelect
    FROM public.materia m
    JOIN backup._bkp_electivas_industrial_materia b ON b.id = m.id
   WHERE m.es_electiva = false;
  IF noelect > 0 THEN RAISE EXCEPTION '% materia(s) no quedaron marcadas como electivas', noelect; END IF;

  -- las 5 comisiones de 5to conservan sus 6 troncales intactas
  SELECT count(*) INTO filas
    FROM public."ComisionMaterias"
   WHERE "idComision" IN (120,121,122,123,124) AND "idMateria" IN (65,66,67,68,69,70);
  IF filas <> 30 THEN RAISE EXCEPTION 'Las 30 filas troncales de 5to año se alteraron (hay %)', filas; END IF;

  RAISE NOTICE 'OK: 13 electivas creadas, 15 filas en 5D1..5D5, todas sin horarios (la fuente no los trae).';
END $verif$;

COMMIT;
