-- ============================================================
-- Horarios Ingeniería Industrial — 5to año
-- Fuente: "5to año  indusrial.xlsx" (hojas 5D1..5D5)
--   OJO con el nombre del archivo: DOS espacios y "indusrial" sin la t.
--
-- UPDATE puro: las comisiones y las 6 materias troncales ya existen en
-- `ComisionMaterias` con horarios NULL. No se crea ninguna materia ni
-- comisión, y no hace falta ninguna franja nueva.
--
-- Se cargan 18 filas / 18 bloques, en 5D1 (120), 5D2 (121) y 5D3 (122).
--
-- ---------------------------------------------------------------
-- 5D4 (123) y 5D5 (124) NO SE CARGAN — no son grillas
-- ---------------------------------------------------------------
-- Esas dos hojas no tienen encabezado de días, ni columna de horas, ni
-- grilla: son sólo un listado de materia + docente. 5D4 lista "Energías
-- Renovables (Elec.)" y 5D5 lista "Coaching de Formadores (Elec.)" e
-- "Industria 4.0(Elect)". Sus 12 filas quedan intactas con horarios NULL.
--
-- ---------------------------------------------------------------
-- Electivas, PPS y Proyecto Final: en la leyenda, NUNCA en la grilla
-- ---------------------------------------------------------------
-- Las leyendas de la columna K listan, además de las 6 troncales:
--   5D1: Gestión del Conocimiento, la Innovación y Economía Crítica
--        (Elec.), Gestión Emprendedora (Elec.), Logística (Elec.),
--        Análisis de Datos I (Elec.), Gestión Ambiental (Elec.),
--        Gestión de Proyectos (Elec.), Política Económica (Elec.),
--        Simulación (Elec.), Práctica Profesional Supervisada,
--        Proyecto Final
--   5D2: CNH Cátedra In Situ (Elec.), Sustentabilidad y Nuevas
--        Economías (Elec.)
--   5D3: Logística (Elec.), Política Económica (Elec.)
--
-- Se verificó por color de relleno que NINGUNA de ellas aparece en las
-- columnas de días de ninguna hoja: están declaradas como oferta, con
-- docente, pero sin horario. Por eso no se crean como materias — a
-- diferencia de 6to de Electrónica, donde las electivas sí tenían
-- bloques en la grilla y por eso se cargaron con el sufijo "(electiva)".
-- Crear estas sólo agregaría filas sin horario.
--
-- ---------------------------------------------------------------
-- Anual / cuatrimestral
-- ---------------------------------------------------------------
-- TODAS ANUALES (cuatrimestre = 0), pese al título "1er/Primer
-- Cuatrimestre" de las hojas, que ya demostró ser resto de plantilla.
-- Decide el test de `materia.horas_semanales` (hora cátedra = 45 min),
-- calibrado contra la propia base con el ratio minutos/(hs*45):
--
--   filas ya cargadas como cuatrimestrales -> ratio 1.95
--   filas ya cargadas como anuales         -> ratio 1.08
--
-- Las 18 filas dan ratio 1.07, y ademas EXACTO: 18 de 18 combinaciones
-- materia x comisión entregan los 3 módulos que declara el plan. Es el
-- único archivo de toda la campaña sin una sola discrepancia.
--
-- ---------------------------------------------------------------
-- Rarezas de la fuente que NO son errores de lectura
-- ---------------------------------------------------------------
-- 5D1 tiene una fila de duración CERO: "19:55 - 19:55" (fila 10), con
-- las celdas de días vacías y fusionadas. Se comporta como un recreo de
-- 0 minutos, así que Mantenimiento y Comercio Exterior siguen de corrido
-- a través de ella (Lun 18:15-20:40 y Mar 18:15-20:40). Verificado.
-- 5D1 tiene además dos módulos que no miden 45 min: 17:30-18:05 (35) y
-- 19:00-19:55 (55). Se cargan tal cual.
--
-- Abreviaturas normalizadas antes de unir bloques, TODAS confirmadas por
-- color de relleno contra la leyenda de la columna K:
--   CE    = Comercio Exterior         (FFD9EAD3)
--   CG    = Control de Gestiòn        (FFEAD1DC)
--   IC    = Ingeniería en Calidad     (FFFFE599)
--   RI    = Relaciones Industriales   (FFFFF2CC)
--   MMyDP = Manejo de Materiales y Distribuciòn de Plantas (FFD9D2E9)
--
-- OJO con los nombres de la base, que difieren del Excel:
--   Excel "Control de GestiÒn" (tilde grave)  -> base "Control de
--                                                Gestión"            (70)
--   Excel "Manejo de Materiales y DistribuciÒn de PlantaS"
--                        -> base "...Distribución de Planta"         (66)
-- Por eso el mapeo es por id explícito y nunca por nombre.
-- ============================================================

BEGIN;

-- ---------- Snapshot para rollback ----------
CREATE SCHEMA IF NOT EXISTS backup;
REVOKE ALL ON SCHEMA backup FROM anon, authenticated;

DROP TABLE IF EXISTS backup._bkp_industrial5_comisionmaterias;
CREATE TABLE backup._bkp_industrial5_comisionmaterias AS
SELECT * FROM public."ComisionMaterias" WHERE "idComision" IN (120,121,122,123,124);
REVOKE ALL ON backup._bkp_industrial5_comisionmaterias FROM anon, authenticated;

-- ---------- Guardas ----------
DO $guard$
DECLARE v int;
BEGIN
  SELECT count(*) INTO v FROM public.comision
   WHERE id IN (120,121,122,123,124) AND nombre IN ('5D1','5D2','5D3','5D4','5D5');
  IF v <> 5 THEN RAISE EXCEPTION 'Las comisiones 5D1..5D5 no son 120..124 (encontradas: %)', v; END IF;

  SELECT count(*) INTO v FROM public.materia WHERE id IN (65,66,67,68,69,70);
  IF v <> 6 THEN RAISE EXCEPTION 'Faltan materias de 5to año de Industrial (encontradas: %)', v; END IF;

  SELECT count(*) INTO v FROM public."ComisionMaterias" WHERE "idComision" IN (120,121,122,123,124);
  IF v <> 30 THEN RAISE EXCEPTION 'Se esperaban 30 filas ComisionMaterias, hay %', v; END IF;
END $guard$;

-- ---------- 5D1 (comisión 120) ----------
-- Comercio Exterior
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Martes", "hora_inicio": "18:15", "hora_fin": "20:40"}
]'::jsonb WHERE "idComision" = 120 AND "idMateria" = 67;
-- Control de Gestión
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Jueves", "hora_inicio": "20:40", "hora_fin": "23:05"}
]'::jsonb WHERE "idComision" = 120 AND "idMateria" = 70;
-- Ingeniería en Calidad
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Martes", "hora_inicio": "20:40", "hora_fin": "23:05"}
]'::jsonb WHERE "idComision" = 120 AND "idMateria" = 69;
-- Manejo de Materiales y Distribución de Planta
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Miercoles", "hora_inicio": "17:30", "hora_fin": "19:55"}
]'::jsonb WHERE "idComision" = 120 AND "idMateria" = 66;
-- Mantenimiento
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Lunes", "hora_inicio": "18:15", "hora_fin": "20:40"}
]'::jsonb WHERE "idComision" = 120 AND "idMateria" = 65;
-- Relaciones Industriales
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Jueves", "hora_inicio": "18:15", "hora_fin": "20:40"}
]'::jsonb WHERE "idComision" = 120 AND "idMateria" = 68;

-- ---------- 5D2 (comisión 121) ----------
-- Comercio Exterior
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Viernes", "hora_inicio": "15:40", "hora_fin": "18:05"}
]'::jsonb WHERE "idComision" = 121 AND "idMateria" = 67;
-- Control de Gestión
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Jueves", "hora_inicio": "15:40", "hora_fin": "18:05"}
]'::jsonb WHERE "idComision" = 121 AND "idMateria" = 70;
-- Ingeniería en Calidad
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Lunes", "hora_inicio": "13:15", "hora_fin": "15:40"}
]'::jsonb WHERE "idComision" = 121 AND "idMateria" = 69;
-- Manejo de Materiales y Distribución de Planta
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Miercoles", "hora_inicio": "14:55", "hora_fin": "17:20"}
]'::jsonb WHERE "idComision" = 121 AND "idMateria" = 66;
-- Mantenimiento
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Martes", "hora_inicio": "15:40", "hora_fin": "18:05"}
]'::jsonb WHERE "idComision" = 121 AND "idMateria" = 65;
-- Relaciones Industriales
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Lunes", "hora_inicio": "15:40", "hora_fin": "18:05"}
]'::jsonb WHERE "idComision" = 121 AND "idMateria" = 68;

-- ---------- 5D3 (comisión 122) ----------
-- Comercio Exterior
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Viernes", "hora_inicio": "10:25", "hora_fin": "12:50"}
]'::jsonb WHERE "idComision" = 122 AND "idMateria" = 67;
-- Control de Gestión
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Miercoles", "hora_inicio": "8:00", "hora_fin": "10:25"}
]'::jsonb WHERE "idComision" = 122 AND "idMateria" = 70;
-- Ingeniería en Calidad
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Viernes", "hora_inicio": "8:00", "hora_fin": "10:25"}
]'::jsonb WHERE "idComision" = 122 AND "idMateria" = 69;
-- Manejo de Materiales y Distribución de Planta
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Miercoles", "hora_inicio": "10:25", "hora_fin": "12:50"}
]'::jsonb WHERE "idComision" = 122 AND "idMateria" = 66;
-- Mantenimiento
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Jueves", "hora_inicio": "8:00", "hora_fin": "10:25"}
]'::jsonb WHERE "idComision" = 122 AND "idMateria" = 65;
-- Relaciones Industriales
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Lunes", "hora_inicio": "8:00", "hora_fin": "10:25"}
]'::jsonb WHERE "idComision" = 122 AND "idMateria" = 68;
-- ---------- Verificación ----------
DO $verif$
DECLARE filas int; bloques int; malas int; noanual int; vacias int;
BEGIN
  SELECT count(*) INTO filas
    FROM public."ComisionMaterias"
   WHERE "idComision" IN (120,121,122)
     AND jsonb_array_length(COALESCE(horarios,'[]'::jsonb)) > 0;
  IF filas <> 18 THEN RAISE EXCEPTION 'Se esperaban 18 filas con horarios, hay %', filas; END IF;

  SELECT COALESCE(sum(jsonb_array_length(horarios)),0) INTO bloques
    FROM public."ComisionMaterias" WHERE "idComision" IN (120,121,122,123,124);
  IF bloques <> 18 THEN RAISE EXCEPTION 'Se esperaban 18 bloques, hay %', bloques; END IF;

  -- 5D4 y 5D5 tienen que haber quedado intactas: sus hojas no son grillas
  SELECT count(*) INTO vacias
    FROM public."ComisionMaterias"
   WHERE "idComision" IN (123,124) AND horarios IS NULL AND cuatrimestre IS NULL;
  IF vacias <> 12 THEN RAISE EXCEPTION '5D4/5D5 deberian seguir vacias en sus 12 filas, quedaron %', vacias; END IF;

  SELECT count(*) INTO noanual
    FROM public."ComisionMaterias"
   WHERE "idComision" IN (120,121,122) AND COALESCE(cuatrimestre,-1) <> 0;
  IF noanual > 0 THEN RAISE EXCEPTION '% fila(s) no quedaron anuales', noanual; END IF;

  -- forma del jsonb: exactamente 3 claves, día sin acento, hora H:MM, fin > inicio
  SELECT count(*) INTO malas
    FROM public."ComisionMaterias" cm
    CROSS JOIN LATERAL jsonb_array_elements(cm.horarios) h
   WHERE cm."idComision" IN (120,121,122,123,124)
     AND ( (SELECT count(*) FROM jsonb_object_keys(h)) <> 3
        OR h->>'dia' NOT IN ('Lunes','Martes','Miercoles','Jueves','Viernes','Sabado')
        OR h->>'hora_inicio' !~ '^[0-9]{1,2}:[0-9]{2}$'
        OR h->>'hora_fin'    !~ '^[0-9]{1,2}:[0-9]{2}$'
        OR (split_part(h->>'hora_fin',':',1)::int*60 + split_part(h->>'hora_fin',':',2)::int)
           <= (split_part(h->>'hora_inicio',':',1)::int*60 + split_part(h->>'hora_inicio',':',2)::int) );
  IF malas > 0 THEN RAISE EXCEPTION '% bloque(s) con forma invalida', malas; END IF;

  RAISE NOTICE 'OK: 18 filas / 18 bloques en 5D1..5D3, todas anuales. 5D4 y 5D5 sin horarios (sus hojas no son grillas).';
END $verif$;

COMMIT;
