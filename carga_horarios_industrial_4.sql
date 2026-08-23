-- ============================================================
-- Horarios Ingeniería Industrial — 4to año
-- Fuente: "4to año  industrial.xlsx" (hojas 4D1, 4D2, 4D3)
--
-- UPDATE puro: las comisiones y materias ya existen en
-- `ComisionMaterias` con horarios NULL. No se crea ninguna materia ni
-- comisión. Se agregó UNA franja nueva a la grilla del armador: "13:45".
--
-- Se cargan 18 filas / 25 bloques, en 4D1 (117) y 4D3 (119).
--
-- ---------------------------------------------------------------
-- 4D2 (118) NO SE CARGA — la fuente no trae horarios
-- ---------------------------------------------------------------
-- La hoja 4D2 tiene la grilla de materias pero NO tiene columna de
-- horas: el rango B4:C18, que en todas las demás hojas lleva
-- hora_inicio/hora_fin, está fusionado en una sola celda con el texto
--
--     "POSIBLE CAMBIO DE HORARIO / TURNO TARDE"
--
-- Es decir, la propia facultad avisa que ese horario no está cerrado y
-- que la comisión podría pasar a turno tarde. Sin columna de horas no
-- hay forma de saber en qué momento cae cada bloque, y no se inventan.
-- Las 9 filas de 4D2 quedan intactas con horarios NULL.
--
-- ---------------------------------------------------------------
-- "Inglés 2" aparece en la fuente pero NO tiene fila en 4to año
-- ---------------------------------------------------------------
-- Las 3 hojas incluyen "Inglés 2" en la leyenda y en la grilla, siempre
-- en el MISMO horario (Martes 13:15-14:45) sin importar el turno de la
-- comisión. Pero en la base, 4to año de Industrial tiene 9 materias y
-- ninguna es Inglés: la materia "Inglés II" de Industrial es la id 62 y
-- está asignada a 3D1, 3D2 y 3D3 (3er año).
--
-- No se crea la fila. Cargarla afirmaría que Inglés II es materia de 4to
-- año en el plan de Industrial, y eso lo contradice la propia base.
-- Queda anotado porque es muy probablemente el horario que falta de
-- Inglés II en 3er año (ver carga_horarios_industrial_3.sql, donde esa
-- materia quedó sin horarios porque no aparecía en su Excel).
--
-- ---------------------------------------------------------------
-- Anual / cuatrimestral
-- ---------------------------------------------------------------
-- TODAS LAS MATERIAS QUEDAN ANUALES (cuatrimestre = 0), pese al título
-- "1er/Primer Cuatrimestre" de las hojas, que ya demostró ser resto de
-- plantilla. Decide el test de `materia.horas_semanales` (hora cátedra =
-- 45 min), calibrado contra la propia base con el ratio minutos/(hs*45):
--
--   filas ya cargadas como cuatrimestrales -> ratio 1.95
--   filas ya cargadas como anuales         -> ratio 1.08
--
-- Las 18 filas de este archivo dan ratio promedio 1.07: cúmulo anual.
-- Además 16 de las 18 combinaciones dan exactamente los módulos del
-- plan. Las 2 excepciones, verificadas celda por celda, son de la
-- fuente:
--   4D3 Evaluación de Proyectos  6 módulos (viernes) donde el plan dice 5
--   4D3 Investigación Operativa  5 módulos donde el plan dice 4
--
-- ---------------------------------------------------------------
-- Abreviaturas y nombres
-- ---------------------------------------------------------------
-- Normalizadas antes de unir bloques, TODAS confirmadas por color de
-- relleno contra la leyenda de la columna K:
--   DP   = Diseño del Producto                       (FFFFF2CC)
--   EP   = Evaluación de Proyectos                   (FFC9DAF8)
--   II   = Instalaciones Industriales                (FFF4CCCC)
--   IO   = Investigación Operativa                   (FFFFE599)
--   MyM  = Mecánica y Mecanísmos                     (FFA2C4C9)
--   PI   = Procesos Industriales                     (FFD5A6BD)
--   PyCP = Planificación y Control de la Producción  (FFD9EAD3)
--   SeH  = Seguridad e Higiene                       (FFF6B26B)
--
-- El archivo escribe "Legislaciòn" con tilde GRAVE en la leyenda y en
-- 4D3, y "Legislación" con tilde aguda en 4D1: se unifican.
--
-- OJO con los nombres de la base, que difieren del Excel en tres casos:
--   Excel "Diseño DEL Producto"   -> base "Diseño DE Producto"     (61)
--   Excel "Mecánica y MecanÍsmos" -> base "Mecánica y Mecanismos"  (58)
--   Excel "Seguridad e Higiene"   -> base "Seguridad, Higiene e
--                                          Ingeniería Ambiental"   (55)
-- Por eso el mapeo es por id explícito y nunca por nombre.
-- ============================================================

BEGIN;

-- ---------- Snapshot para rollback ----------
CREATE SCHEMA IF NOT EXISTS backup;
REVOKE ALL ON SCHEMA backup FROM anon, authenticated;

DROP TABLE IF EXISTS backup._bkp_industrial4_comisionmaterias;
CREATE TABLE backup._bkp_industrial4_comisionmaterias AS
SELECT * FROM public."ComisionMaterias" WHERE "idComision" IN (117,118,119);
REVOKE ALL ON backup._bkp_industrial4_comisionmaterias FROM anon, authenticated;

-- ---------- Guardas ----------
DO $guard$
DECLARE v int;
BEGIN
  SELECT count(*) INTO v FROM public.comision
   WHERE id IN (117,118,119) AND nombre IN ('4D1','4D2','4D3');
  IF v <> 3 THEN RAISE EXCEPTION 'Las comisiones 4D1..4D3 no son 117,118,119 (encontradas: %)', v; END IF;

  SELECT count(*) INTO v FROM public.materia WHERE id IN (55,56,57,58,59,60,61,63,64);
  IF v <> 9 THEN RAISE EXCEPTION 'Faltan materias de 4to año de Industrial (encontradas: %)', v; END IF;

  SELECT count(*) INTO v FROM public."ComisionMaterias" WHERE "idComision" IN (117,118,119);
  IF v <> 27 THEN RAISE EXCEPTION 'Se esperaban 27 filas ComisionMaterias, hay %', v; END IF;
END $guard$;

-- ---------- 4D1 (comisión 117) ----------
-- Diseño de Producto
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Martes", "hora_inicio": "17:20", "hora_fin": "19:00"}
]'::jsonb WHERE "idComision" = 117 AND "idMateria" = 61;
-- Evaluación de Proyectos
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Lunes", "hora_inicio": "17:20", "hora_fin": "19:45"},
    {"dia": "Miercoles", "hora_inicio": "21:35", "hora_fin": "23:05"}
]'::jsonb WHERE "idComision" = 117 AND "idMateria" = 59;
-- Instalaciones Industriales
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Jueves", "hora_inicio": "17:20", "hora_fin": "19:45"}
]'::jsonb WHERE "idComision" = 117 AND "idMateria" = 63;
-- Investigación Operativa
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Lunes", "hora_inicio": "21:35", "hora_fin": "23:05"},
    {"dia": "Martes", "hora_inicio": "20:40", "hora_fin": "22:20"}
]'::jsonb WHERE "idComision" = 117 AND "idMateria" = 56;
-- Legislación
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Miercoles", "hora_inicio": "17:20", "hora_fin": "19:00"}
]'::jsonb WHERE "idComision" = 117 AND "idMateria" = 64;
-- Mecánica y Mecanismos
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Jueves", "hora_inicio": "19:55", "hora_fin": "22:20"}
]'::jsonb WHERE "idComision" = 117 AND "idMateria" = 58;
-- Planificación y Control de la Producción
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Lunes", "hora_inicio": "19:55", "hora_fin": "21:25"},
    {"dia": "Martes", "hora_inicio": "19:00", "hora_fin": "20:40"}
]'::jsonb WHERE "idComision" = 117 AND "idMateria" = 60;
-- Procesos Industriales
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Viernes", "hora_inicio": "17:20", "hora_fin": "21:25"}
]'::jsonb WHERE "idComision" = 117 AND "idMateria" = 57;
-- Seguridad, Higiene e Ingeniería Ambiental
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Miercoles", "hora_inicio": "19:00", "hora_fin": "21:25"}
]'::jsonb WHERE "idComision" = 117 AND "idMateria" = 55;

-- ---------- 4D3 (comisión 119) ----------
-- Diseño de Producto
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Lunes", "hora_inicio": "8:00", "hora_fin": "9:30"}
]'::jsonb WHERE "idComision" = 119 AND "idMateria" = 61;
-- Evaluación de Proyectos
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Viernes", "hora_inicio": "8:00", "hora_fin": "12:50"}
]'::jsonb WHERE "idComision" = 119 AND "idMateria" = 59;
-- Instalaciones Industriales
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Miercoles", "hora_inicio": "8:00", "hora_fin": "10:25"}
]'::jsonb WHERE "idComision" = 119 AND "idMateria" = 63;
-- Investigación Operativa
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Lunes", "hora_inicio": "11:20", "hora_fin": "12:50"},
    {"dia": "Miercoles", "hora_inicio": "12:05", "hora_fin": "12:50"},
    {"dia": "Miercoles", "hora_inicio": "13:15", "hora_fin": "14:00"}
]'::jsonb WHERE "idComision" = 119 AND "idMateria" = 56;
-- Legislación
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Jueves", "hora_inicio": "12:05", "hora_fin": "12:50"},
    {"dia": "Jueves", "hora_inicio": "13:15", "hora_fin": "13:45"}
]'::jsonb WHERE "idComision" = 119 AND "idMateria" = 64;
-- Mecánica y Mecanismos
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Martes", "hora_inicio": "10:25", "hora_fin": "12:50"}
]'::jsonb WHERE "idComision" = 119 AND "idMateria" = 58;
-- Planificación y Control de la Producción
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Lunes", "hora_inicio": "9:40", "hora_fin": "11:10"},
    {"dia": "Miercoles", "hora_inicio": "10:25", "hora_fin": "12:05"}
]'::jsonb WHERE "idComision" = 119 AND "idMateria" = 60;
-- Procesos Industriales
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Jueves", "hora_inicio": "8:00", "hora_fin": "12:05"}
]'::jsonb WHERE "idComision" = 119 AND "idMateria" = 57;
-- Seguridad, Higiene e Ingeniería Ambiental
UPDATE public."ComisionMaterias" SET cuatrimestre = 0, horarios = '[
    {"dia": "Martes", "hora_inicio": "8:00", "hora_fin": "10:25"}
]'::jsonb WHERE "idComision" = 119 AND "idMateria" = 55;
-- ---------- Verificación ----------
DO $verif$
DECLARE filas int; bloques int; malas int; noanual int; d2 int;
BEGIN
  SELECT count(*) INTO filas
    FROM public."ComisionMaterias"
   WHERE "idComision" IN (117,119)
     AND jsonb_array_length(COALESCE(horarios,'[]'::jsonb)) > 0;
  IF filas <> 18 THEN RAISE EXCEPTION 'Se esperaban 18 filas con horarios, hay %', filas; END IF;

  SELECT COALESCE(sum(jsonb_array_length(horarios)),0) INTO bloques
    FROM public."ComisionMaterias" WHERE "idComision" IN (117,118,119);
  IF bloques <> 25 THEN RAISE EXCEPTION 'Se esperaban 25 bloques, hay %', bloques; END IF;

  -- 4D2 tiene que haber quedado intacta: su hoja no trae horarios
  SELECT count(*) INTO d2
    FROM public."ComisionMaterias"
   WHERE "idComision" = 118 AND horarios IS NULL AND cuatrimestre IS NULL;
  IF d2 <> 9 THEN RAISE EXCEPTION '4D2 deberia seguir vacia en sus 9 filas, quedaron %', d2; END IF;

  SELECT count(*) INTO noanual
    FROM public."ComisionMaterias"
   WHERE "idComision" IN (117,119) AND COALESCE(cuatrimestre,-1) <> 0;
  IF noanual > 0 THEN RAISE EXCEPTION '% fila(s) no quedaron anuales', noanual; END IF;

  -- forma del jsonb: exactamente 3 claves, día sin acento, hora H:MM, fin > inicio
  SELECT count(*) INTO malas
    FROM public."ComisionMaterias" cm
    CROSS JOIN LATERAL jsonb_array_elements(cm.horarios) h
   WHERE cm."idComision" IN (117,118,119)
     AND ( (SELECT count(*) FROM jsonb_object_keys(h)) <> 3
        OR h->>'dia' NOT IN ('Lunes','Martes','Miercoles','Jueves','Viernes','Sabado')
        OR h->>'hora_inicio' !~ '^[0-9]{1,2}:[0-9]{2}$'
        OR h->>'hora_fin'    !~ '^[0-9]{1,2}:[0-9]{2}$'
        OR (split_part(h->>'hora_fin',':',1)::int*60 + split_part(h->>'hora_fin',':',2)::int)
           <= (split_part(h->>'hora_inicio',':',1)::int*60 + split_part(h->>'hora_inicio',':',2)::int) );
  IF malas > 0 THEN RAISE EXCEPTION '% bloque(s) con forma invalida', malas; END IF;

  RAISE NOTICE 'OK: 18 filas / 25 bloques en 4D1 y 4D3, todas anuales. 4D2 sin horarios (la fuente no los trae).';
END $verif$;

COMMIT;
