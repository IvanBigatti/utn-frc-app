-- ============================================================
-- Horarios Ingeniería Industrial — 2do año
-- Fuente: "2do año industrial.xlsx" (hojas 2D1, 2D2, 2D3, 2D4)
--
-- UPDATE puro: las 4 comisiones (110,111,112,113) y sus 8 materias ya
-- existen en `ComisionMaterias` con horarios NULL. No se crea ninguna
-- materia ni comisión, y no hace falta ninguna franja nueva.
--
-- TODAS LAS MATERIAS QUEDAN COMO ANUALES (cuatrimestre = 0), pese a que
-- las 4 hojas se titulen "1er/Primer Cuatrimestre". Ese título ya
-- demostró ser resto de plantilla en Electrónica, donde hojas del mismo
-- archivo se contradecían entre sí.
--
-- Lo que decide es el test de `materia.horas_semanales` (hora cátedra =
-- 45 min), y esta vez el umbral está calibrado contra la propia base:
--
--   334 filas ya cargadas como cuatrimestrales -> ratio minutos/(hs*45) = 1.95
--   499 filas ya cargadas como anuales         -> ratio                 = 1.08
--
-- Las 32 filas de este archivo dan ratio promedio 1.08: el cúmulo anual,
-- no el cuatrimestral. Además, 28 de las 32 combinaciones materia x
-- comisión dan exactamente los módulos que declara el plan:
--
--   Análisis Matemático II       5 -> 5 en las 4 comisiones
--   Administración General       4 -> 4 en las 4
--   Ciencias de los Materiales   4 -> 4 en las 4
--   Informática II               3 -> 3 en las 4
--   Inglés I                     2 -> 2 en las 4
--   Física II                    5 -> 5 salvo 2D3, que da 4
--   Economía General             4 -> 4 salvo 2D3 y 2D4, que dan 3
--   Probabilidad y Estadística   3 -> 3 salvo 2D4, que da 4
--
-- Las 4 excepciones son de la fuente, no de la lectura: se verificaron
-- celda por celda. Tampoco hay ninguna celda pintada sin texto en el
-- archivo, ni etiquetas fuera de la leyenda, ni solapamientos.
-- Se carga lo que la fuente dice.
--
-- Abreviaturas normalizadas antes de unir bloques, todas confirmadas por
-- color de relleno contra la leyenda de la columna K:
--   CM  = Ciencia de los Materiales   (FFFFE599)
--   AG  = Administración General      (FFD9EAD3)
--   PyE = Probabilidad y Estadística  (FFF6B26B)
--   "Eco. General" = Economía General (FFD9D2E9)
--
-- Ojo con el nombre en la base: la materia 43 se llama "CienciaS de los
-- Materiales" (plural), mientras el Excel escribe "Ciencia".
-- ============================================================

BEGIN;

-- ---------- Snapshot para rollback ----------
CREATE SCHEMA IF NOT EXISTS backup;
REVOKE ALL ON SCHEMA backup FROM anon, authenticated;

DROP TABLE IF EXISTS backup._bkp_industrial2_comisionmaterias;
CREATE TABLE backup._bkp_industrial2_comisionmaterias AS
SELECT * FROM public."ComisionMaterias" WHERE "idComision" IN (110,111,112,113);
REVOKE ALL ON backup._bkp_industrial2_comisionmaterias FROM anon, authenticated;

-- ---------- Guardas ----------
DO $guard$
DECLARE v int;
BEGIN
  SELECT count(*) INTO v FROM public.comision
   WHERE id IN (110,111,112,113) AND nombre IN ('2D1','2D2','2D3','2D4');
  IF v <> 4 THEN RAISE EXCEPTION 'Las comisiones 2D1..2D4 no son 110,111,112,113 (encontradas: %)', v; END IF;

  SELECT count(*) INTO v FROM public.materia WHERE id IN (4,6,7,9,42,43,44,45);
  IF v <> 8 THEN RAISE EXCEPTION 'Faltan materias de 2do año de Industrial (encontradas: %)', v; END IF;

  SELECT count(*) INTO v FROM public."ComisionMaterias" WHERE "idComision" IN (110,111,112,113);
  IF v <> 32 THEN RAISE EXCEPTION 'Se esperaban 32 filas ComisionMaterias, hay %', v; END IF;
END $guard$;

-- ---------- 2D1 (comisión 110) ----------
-- Administración General
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Lunes", "hora_inicio": "18:15", "hora_fin": "21:25"}
]'::jsonb WHERE "idComision" = 110 AND "idMateria" = 42;
-- Análisis Matemático II
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Miercoles", "hora_inicio": "18:15", "hora_fin": "19:45"},
    {"dia": "Jueves", "hora_inicio": "18:15", "hora_fin": "20:40"}
]'::jsonb WHERE "idComision" = 110 AND "idMateria" = 6;
-- Ciencias de los Materiales
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Martes", "hora_inicio": "17:20", "hora_fin": "20:40"}
]'::jsonb WHERE "idComision" = 110 AND "idMateria" = 43;
-- Economía General
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Viernes", "hora_inicio": "18:15", "hora_fin": "21:25"}
]'::jsonb WHERE "idComision" = 110 AND "idMateria" = 44;
-- Física II
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Lunes", "hora_inicio": "21:35", "hora_fin": "23:05"},
    {"dia": "Miercoles", "hora_inicio": "19:55", "hora_fin": "22:20"}
]'::jsonb WHERE "idComision" = 110 AND "idMateria" = 7;
-- Informática II
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Jueves", "hora_inicio": "20:40", "hora_fin": "23:05"}
]'::jsonb WHERE "idComision" = 110 AND "idMateria" = 45;
-- Inglés I
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Lunes", "hora_inicio": "16:35", "hora_fin": "18:05"}
]'::jsonb WHERE "idComision" = 110 AND "idMateria" = 4;
-- Probabilidad y Estadística
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Martes", "hora_inicio": "20:40", "hora_fin": "23:05"}
]'::jsonb WHERE "idComision" = 110 AND "idMateria" = 9;

-- ---------- 2D2 (comisión 111) ----------
-- Administración General
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Viernes", "hora_inicio": "9:40", "hora_fin": "12:50"}
]'::jsonb WHERE "idComision" = 111 AND "idMateria" = 42;
-- Análisis Matemático II
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Jueves", "hora_inicio": "8:00", "hora_fin": "10:25"},
    {"dia": "Viernes", "hora_inicio": "8:00", "hora_fin": "9:30"}
]'::jsonb WHERE "idComision" = 111 AND "idMateria" = 6;
-- Ciencias de los Materiales
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Martes", "hora_inicio": "10:25", "hora_fin": "14:00"}
]'::jsonb WHERE "idComision" = 111 AND "idMateria" = 43;
-- Economía General
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Miercoles", "hora_inicio": "8:00", "hora_fin": "11:10"}
]'::jsonb WHERE "idComision" = 111 AND "idMateria" = 44;
-- Física II
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Lunes", "hora_inicio": "8:00", "hora_fin": "12:05"}
]'::jsonb WHERE "idComision" = 111 AND "idMateria" = 7;
-- Informática II
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Martes", "hora_inicio": "8:00", "hora_fin": "10:25"}
]'::jsonb WHERE "idComision" = 111 AND "idMateria" = 45;
-- Inglés I
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Lunes", "hora_inicio": "12:05", "hora_fin": "14:00"}
]'::jsonb WHERE "idComision" = 111 AND "idMateria" = 4;
-- Probabilidad y Estadística
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Jueves", "hora_inicio": "10:25", "hora_fin": "12:50"}
]'::jsonb WHERE "idComision" = 111 AND "idMateria" = 9;

-- ---------- 2D3 (comisión 112) ----------
-- Administración General
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Lunes", "hora_inicio": "14:55", "hora_fin": "18:05"}
]'::jsonb WHERE "idComision" = 112 AND "idMateria" = 42;
-- Análisis Matemático II
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Lunes", "hora_inicio": "12:05", "hora_fin": "12:50"},
    {"dia": "Lunes", "hora_inicio": "13:15", "hora_fin": "14:00"},
    {"dia": "Jueves", "hora_inicio": "12:05", "hora_fin": "12:50"},
    {"dia": "Jueves", "hora_inicio": "13:15", "hora_fin": "14:45"}
]'::jsonb WHERE "idComision" = 112 AND "idMateria" = 6;
-- Ciencias de los Materiales
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Jueves", "hora_inicio": "14:55", "hora_fin": "18:05"}
]'::jsonb WHERE "idComision" = 112 AND "idMateria" = 43;
-- Economía General
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Viernes", "hora_inicio": "15:40", "hora_fin": "18:05"}
]'::jsonb WHERE "idComision" = 112 AND "idMateria" = 44;
-- Física II
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Martes", "hora_inicio": "12:05", "hora_fin": "12:50"},
    {"dia": "Martes", "hora_inicio": "13:15", "hora_fin": "15:40"}
]'::jsonb WHERE "idComision" = 112 AND "idMateria" = 7;
-- Informática II
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Martes", "hora_inicio": "15:40", "hora_fin": "18:05"}
]'::jsonb WHERE "idComision" = 112 AND "idMateria" = 45;
-- Inglés I
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Miercoles", "hora_inicio": "15:40", "hora_fin": "17:20"}
]'::jsonb WHERE "idComision" = 112 AND "idMateria" = 4;
-- Probabilidad y Estadística
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Miercoles", "hora_inicio": "13:15", "hora_fin": "15:40"}
]'::jsonb WHERE "idComision" = 112 AND "idMateria" = 9;

-- ---------- 2D4 (comisión 113) ----------
-- Administración General
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Martes", "hora_inicio": "10:25", "hora_fin": "14:00"}
]'::jsonb WHERE "idComision" = 113 AND "idMateria" = 42;
-- Análisis Matemático II
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Jueves", "hora_inicio": "8:00", "hora_fin": "10:25"},
    {"dia": "Viernes", "hora_inicio": "8:00", "hora_fin": "9:30"}
]'::jsonb WHERE "idComision" = 113 AND "idMateria" = 6;
-- Ciencias de los Materiales
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Miercoles", "hora_inicio": "10:25", "hora_fin": "14:00"}
]'::jsonb WHERE "idComision" = 113 AND "idMateria" = 43;
-- Economía General
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Martes", "hora_inicio": "8:00", "hora_fin": "10:25"}
]'::jsonb WHERE "idComision" = 113 AND "idMateria" = 44;
-- Física II
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Lunes", "hora_inicio": "8:00", "hora_fin": "12:05"}
]'::jsonb WHERE "idComision" = 113 AND "idMateria" = 7;
-- Informática II
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Miercoles", "hora_inicio": "8:00", "hora_fin": "10:25"}
]'::jsonb WHERE "idComision" = 113 AND "idMateria" = 45;
-- Inglés I
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Lunes", "hora_inicio": "12:05", "hora_fin": "14:00"}
]'::jsonb WHERE "idComision" = 113 AND "idMateria" = 4;
-- Probabilidad y Estadística
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Viernes", "hora_inicio": "9:40", "hora_fin": "12:50"}
]'::jsonb WHERE "idComision" = 113 AND "idMateria" = 9;
-- ---------- Verificación ----------
DO $verif$
DECLARE filas int; bloques int; malas int; noanual int;
BEGIN
  SELECT count(*) INTO filas
    FROM public."ComisionMaterias"
   WHERE "idComision" IN (110,111,112,113)
     AND jsonb_array_length(COALESCE(horarios,'[]'::jsonb)) > 0;
  IF filas <> 32 THEN RAISE EXCEPTION 'Se esperaban 32 filas con horarios, hay %', filas; END IF;

  SELECT COALESCE(sum(jsonb_array_length(horarios)),0) INTO bloques
    FROM public."ComisionMaterias" WHERE "idComision" IN (110,111,112,113);
  IF bloques <> 40 THEN RAISE EXCEPTION 'Se esperaban 40 bloques, hay %', bloques; END IF;

  SELECT count(*) INTO noanual
    FROM public."ComisionMaterias"
   WHERE "idComision" IN (110,111,112,113) AND COALESCE(cuatrimestre,-1) <> 0;
  IF noanual > 0 THEN RAISE EXCEPTION '% fila(s) no quedaron anuales', noanual; END IF;

  -- forma del jsonb: exactamente 3 claves, día sin acento, hora H:MM
  SELECT count(*) INTO malas
    FROM public."ComisionMaterias" cm
    CROSS JOIN LATERAL jsonb_array_elements(cm.horarios) h
   WHERE cm."idComision" IN (110,111,112,113)
     AND ( (SELECT count(*) FROM jsonb_object_keys(h)) <> 3
        OR h->>'dia' NOT IN ('Lunes','Martes','Miercoles','Jueves','Viernes','Sabado')
        OR h->>'hora_inicio' !~ '^[0-9]{1,2}:[0-9]{2}$'
        OR h->>'hora_fin'    !~ '^[0-9]{1,2}:[0-9]{2}$'
        OR (split_part(h->>'hora_fin',':',1)::int*60 + split_part(h->>'hora_fin',':',2)::int)
           <= (split_part(h->>'hora_inicio',':',1)::int*60 + split_part(h->>'hora_inicio',':',2)::int) );
  IF malas > 0 THEN RAISE EXCEPTION '% bloque(s) con forma invalida', malas; END IF;

  RAISE NOTICE 'OK: 32 filas / 40 bloques cargados en 2D1..2D4, todas anuales.';
END $verif$;

COMMIT;
