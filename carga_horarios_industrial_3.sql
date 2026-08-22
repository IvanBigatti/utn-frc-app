-- ============================================================
-- Horarios Ingeniería Industrial — 3er año
-- Fuente: "3er año industrial.xlsx" (hojas 3D1, 3D2, 3D3)
--
-- UPDATE puro: las 3 comisiones (114,115,116) y sus materias ya existen
-- en `ComisionMaterias` con horarios NULL. No se crea ninguna materia ni
-- comisión, y no hace falta ninguna franja nueva.
--
-- HUECO EN LA FUENTE: la base tiene 30 filas (10 materias x 3
-- comisiones) pero el Excel sólo trae 9 materias. **Inglés II (id 62) no
-- aparece en ninguna parte del archivo**: se buscó "ingl" en todas las
-- celdas de las 3 hojas y hay 0 ocurrencias, ni en la leyenda ni en la
-- grilla. Sus 3 filas quedan intactas, con horarios NULL. No se inventa
-- un horario que la fuente no da.
--
-- Se cargan entonces 27 filas / 32 bloques.
--
-- ACTUALIZACIÓN POSTERIOR: Inglés II SÍ se cargó, en
-- `carga_horarios_industrial_3_ingles.sql`, con el horario que declara
-- el Excel de 4to año (Martes 13:15-14:45). Por eso la verificación de
-- ESTE script (que exige que Inglés II siga vacía) va a fallar si se lo
-- vuelve a correr después de aquel. Correr en orden, o correr antes
-- rollback_horarios_industrial_3_ingles.sql.
--
-- TODAS LAS MATERIAS QUEDAN COMO ANUALES (cuatrimestre = 0), pese a que
-- las 3 hojas se titulen "1er/Primer Cuatrimestre". Ese título ya
-- demostró ser resto de plantilla en Electrónica, donde hojas del mismo
-- archivo se contradecían entre sí.
--
-- Decide el test de `materia.horas_semanales` (hora cátedra = 45 min),
-- calibrado contra la propia base con el ratio minutos/(hs*45):
--
--   filas ya cargadas como cuatrimestrales -> ratio 1.95
--   filas ya cargadas como anuales         -> ratio 1.08
--
-- Las 27 filas de este archivo dan ratio promedio 1.05: cúmulo anual.
-- Además 26 de las 27 combinaciones materia x comisión dan exactamente
-- los módulos que declara el plan. La única excepción es 3D3
-- Termodinámica y Máquinas Térmicas: 3 módulos donde el plan declara 4
-- (viernes 13:15-14:45 y 14:55-15:40). Verificado celda por celda, es de
-- la fuente. Se carga lo que la fuente dice.
--
-- Abreviaturas normalizadas antes de unir bloques, TODAS confirmadas por
-- color de relleno contra la leyenda de la columna K:
--   ET    = Estudio del Trabajo                       (FFD9EAD3)
--   EME   = Electrotecnia y Máquinas Eléctricas       (FFF6B26B)
--   EdE   = Economía de la Empresa                    (FFC9DAF8)
--   CyP   = Costos y Presupuestos                     (FFA2C4C9)
--   MdlF  = Mecánica de los Fluídos                   (FFEAD1DC)
--   TMT   = Termodinámica y Máquinas Térmicas         (FFD9D2E9)
--   ANyCA = Análisis Numérico y Cálculo Avanzado      (FFF4CCCC)
--
-- OJO con 'ET': es Estudio del Trabajo, NO Electrotecnia. Electrotecnia
-- es 'EME'. Deducir por las siglas acá daba el resultado equivocado; lo
-- que lo resolvió fue el color.
--
-- OJO con el nombre en la base: la materia 51 se llama "Mecánica de los
-- FlUIdos" (sin tilde en la i), mientras el Excel escribe "Fluídos".
-- ============================================================

BEGIN;

-- ---------- Snapshot para rollback ----------
CREATE SCHEMA IF NOT EXISTS backup;
REVOKE ALL ON SCHEMA backup FROM anon, authenticated;

DROP TABLE IF EXISTS backup._bkp_industrial3_comisionmaterias;
CREATE TABLE backup._bkp_industrial3_comisionmaterias AS
SELECT * FROM public."ComisionMaterias" WHERE "idComision" IN (114,115,116);
REVOKE ALL ON backup._bkp_industrial3_comisionmaterias FROM anon, authenticated;

-- ---------- Guardas ----------
DO $guard$
DECLARE v int;
BEGIN
  SELECT count(*) INTO v FROM public.comision
   WHERE id IN (114,115,116) AND nombre IN ('3D1','3D2','3D3');
  IF v <> 3 THEN RAISE EXCEPTION 'Las comisiones 3D1..3D3 no son 114,115,116 (encontradas: %)', v; END IF;

  SELECT count(*) INTO v FROM public.materia WHERE id IN (46,47,48,49,50,51,52,53,54);
  IF v <> 9 THEN RAISE EXCEPTION 'Faltan materias de 3er año de Industrial (encontradas: %)', v; END IF;

  SELECT count(*) INTO v FROM public."ComisionMaterias" WHERE "idComision" IN (114,115,116);
  IF v <> 30 THEN RAISE EXCEPTION 'Se esperaban 30 filas ComisionMaterias, hay %', v; END IF;
END $guard$;

-- ---------- 3D1 (comisión 114) ----------
-- Análisis Numérico y Cálculo Avanzado
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Jueves", "hora_inicio": "19:55", "hora_fin": "21:25"}
]'::jsonb WHERE "idComision" = 114 AND "idMateria" = 54;
-- Comercialización
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Jueves", "hora_inicio": "17:20", "hora_fin": "19:45"}
]'::jsonb WHERE "idComision" = 114 AND "idMateria" = 48;
-- Costos y Presupuestos
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Viernes", "hora_inicio": "17:20", "hora_fin": "19:45"}
]'::jsonb WHERE "idComision" = 114 AND "idMateria" = 46;
-- Economía de la Empresa
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Lunes", "hora_inicio": "15:40", "hora_fin": "18:05"}
]'::jsonb WHERE "idComision" = 114 AND "idMateria" = 52;
-- Electrotecnia y Máquinas Eléctricas
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Martes", "hora_inicio": "20:40", "hora_fin": "23:05"},
    {"dia": "Viernes", "hora_inicio": "19:55", "hora_fin": "21:25"}
]'::jsonb WHERE "idComision" = 114 AND "idMateria" = 53;
-- Estudio del Trabajo
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Lunes", "hora_inicio": "18:15", "hora_fin": "21:25"}
]'::jsonb WHERE "idComision" = 114 AND "idMateria" = 47;
-- Estática y Resistencia de los Materiales
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Miercoles", "hora_inicio": "19:55", "hora_fin": "23:05"}
]'::jsonb WHERE "idComision" = 114 AND "idMateria" = 50;
-- Mecánica de los Fluidos
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Martes", "hora_inicio": "18:15", "hora_fin": "20:40"}
]'::jsonb WHERE "idComision" = 114 AND "idMateria" = 51;
-- Termodinámica y Máquinas Térmicas
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Lunes", "hora_inicio": "21:35", "hora_fin": "23:05"},
    {"dia": "Miercoles", "hora_inicio": "18:15", "hora_fin": "19:45"}
]'::jsonb WHERE "idComision" = 114 AND "idMateria" = 49;

-- ---------- 3D2 (comisión 115) ----------
-- Análisis Numérico y Cálculo Avanzado
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Jueves", "hora_inicio": "8:00", "hora_fin": "9:30"}
]'::jsonb WHERE "idComision" = 115 AND "idMateria" = 54;
-- Comercialización
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Martes", "hora_inicio": "10:25", "hora_fin": "12:50"}
]'::jsonb WHERE "idComision" = 115 AND "idMateria" = 48;
-- Costos y Presupuestos
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Miercoles", "hora_inicio": "8:00", "hora_fin": "10:25"}
]'::jsonb WHERE "idComision" = 115 AND "idMateria" = 46;
-- Economía de la Empresa
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Miercoles", "hora_inicio": "10:25", "hora_fin": "12:50"}
]'::jsonb WHERE "idComision" = 115 AND "idMateria" = 52;
-- Electrotecnia y Máquinas Eléctricas
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Martes", "hora_inicio": "8:00", "hora_fin": "10:25"},
    {"dia": "Viernes", "hora_inicio": "11:20", "hora_fin": "12:50"}
]'::jsonb WHERE "idComision" = 115 AND "idMateria" = 53;
-- Estudio del Trabajo
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Jueves", "hora_inicio": "9:40", "hora_fin": "12:50"}
]'::jsonb WHERE "idComision" = 115 AND "idMateria" = 47;
-- Estática y Resistencia de los Materiales
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Viernes", "hora_inicio": "8:00", "hora_fin": "11:10"}
]'::jsonb WHERE "idComision" = 115 AND "idMateria" = 50;
-- Mecánica de los Fluidos
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Lunes", "hora_inicio": "11:20", "hora_fin": "14:00"}
]'::jsonb WHERE "idComision" = 115 AND "idMateria" = 51;
-- Termodinámica y Máquinas Térmicas
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Lunes", "hora_inicio": "8:00", "hora_fin": "11:10"}
]'::jsonb WHERE "idComision" = 115 AND "idMateria" = 49;

-- ---------- 3D3 (comisión 116) ----------
-- Análisis Numérico y Cálculo Avanzado
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Jueves", "hora_inicio": "14:00", "hora_fin": "15:40"}
]'::jsonb WHERE "idComision" = 116 AND "idMateria" = 54;
-- Comercialización
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Martes", "hora_inicio": "15:40", "hora_fin": "18:05"}
]'::jsonb WHERE "idComision" = 116 AND "idMateria" = 48;
-- Costos y Presupuestos
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Lunes", "hora_inicio": "15:40", "hora_fin": "18:05"}
]'::jsonb WHERE "idComision" = 116 AND "idMateria" = 46;
-- Economía de la Empresa
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Viernes", "hora_inicio": "15:40", "hora_fin": "18:05"}
]'::jsonb WHERE "idComision" = 116 AND "idMateria" = 52;
-- Electrotecnia y Máquinas Eléctricas
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Miercoles", "hora_inicio": "16:35", "hora_fin": "18:05"},
    {"dia": "Jueves", "hora_inicio": "15:40", "hora_fin": "18:05"}
]'::jsonb WHERE "idComision" = 116 AND "idMateria" = 53;
-- Estudio del Trabajo
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Lunes", "hora_inicio": "12:05", "hora_fin": "12:50"},
    {"dia": "Lunes", "hora_inicio": "13:15", "hora_fin": "15:40"}
]'::jsonb WHERE "idComision" = 116 AND "idMateria" = 47;
-- Estática y Resistencia de los Materiales
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Miercoles", "hora_inicio": "13:15", "hora_fin": "16:25"}
]'::jsonb WHERE "idComision" = 116 AND "idMateria" = 50;
-- Mecánica de los Fluidos
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Martes", "hora_inicio": "13:15", "hora_fin": "15:40"}
]'::jsonb WHERE "idComision" = 116 AND "idMateria" = 51;
-- Termodinámica y Máquinas Térmicas
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Viernes", "hora_inicio": "13:15", "hora_fin": "15:40"}
]'::jsonb WHERE "idComision" = 116 AND "idMateria" = 49;
-- ---------- Verificación ----------
DO $verif$
DECLARE filas int; bloques int; malas int; noanual int; ing int;
BEGIN
  SELECT count(*) INTO filas
    FROM public."ComisionMaterias"
   WHERE "idComision" IN (114,115,116)
     AND jsonb_array_length(COALESCE(horarios,'[]'::jsonb)) > 0;
  IF filas <> 27 THEN RAISE EXCEPTION 'Se esperaban 27 filas con horarios, hay %', filas; END IF;

  SELECT COALESCE(sum(jsonb_array_length(horarios)),0) INTO bloques
    FROM public."ComisionMaterias" WHERE "idComision" IN (114,115,116);
  IF bloques <> 32 THEN RAISE EXCEPTION 'Se esperaban 32 bloques, hay %', bloques; END IF;

  -- Inglés II (62) tiene que haber quedado intacta: la fuente no la trae
  SELECT count(*) INTO ing
    FROM public."ComisionMaterias"
   WHERE "idComision" IN (114,115,116) AND "idMateria" = 62
     AND horarios IS NULL AND cuatrimestre IS NULL;
  IF ing <> 3 THEN RAISE EXCEPTION 'Inglés II deberia seguir vacia en las 3 comisiones, quedaron %', ing; END IF;

  SELECT count(*) INTO noanual
    FROM public."ComisionMaterias"
   WHERE "idComision" IN (114,115,116) AND "idMateria" <> 62
     AND COALESCE(cuatrimestre,-1) <> 0;
  IF noanual > 0 THEN RAISE EXCEPTION '% fila(s) no quedaron anuales', noanual; END IF;

  -- forma del jsonb: exactamente 3 claves, día sin acento, hora H:MM, fin > inicio
  SELECT count(*) INTO malas
    FROM public."ComisionMaterias" cm
    CROSS JOIN LATERAL jsonb_array_elements(cm.horarios) h
   WHERE cm."idComision" IN (114,115,116)
     AND ( (SELECT count(*) FROM jsonb_object_keys(h)) <> 3
        OR h->>'dia' NOT IN ('Lunes','Martes','Miercoles','Jueves','Viernes','Sabado')
        OR h->>'hora_inicio' !~ '^[0-9]{1,2}:[0-9]{2}$'
        OR h->>'hora_fin'    !~ '^[0-9]{1,2}:[0-9]{2}$'
        OR (split_part(h->>'hora_fin',':',1)::int*60 + split_part(h->>'hora_fin',':',2)::int)
           <= (split_part(h->>'hora_inicio',':',1)::int*60 + split_part(h->>'hora_inicio',':',2)::int) );
  IF malas > 0 THEN RAISE EXCEPTION '% bloque(s) con forma invalida', malas; END IF;

  RAISE NOTICE 'OK: 27 filas / 32 bloques en 3D1..3D3, todas anuales. Inglés II sin horarios (no está en la fuente).';
END $verif$;

COMMIT;
