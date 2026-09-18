-- ============================================================================
-- Limpieza de datos detectada saneando /progreso
--
-- Verificado ANTES de borrar:
--   * Electrónica (1R1, 1R5, 1R7) y Química (1V1, 1V2) dictan Análisis
--     Matemático II en 1er año CON horarios reales cargados. NO es un error:
--     ahí no se toca nada.
--   * En Eléctrica, en cambio, 1Q1 tiene la materia con 0 bloques mientras
--     2Q1 la tiene con 2. La comisión 1Q1 sí fue cargada (8 de 11 materias
--     con horarios), así que ese 0 es significativo.
--   * Cálculo Numérico (id 214) también está sin horarios en 1Q1, pero NO
--     existe en 2do: es una materia legítima de 1er año. NO se toca.
--   * Las comisiones Civil 1C1 (44 y 46) tienen el MISMO set de 9 materias,
--     la 46 no tiene un solo horario y ninguna de las dos tiene posts del
--     foro (`foro_post.comision_id`). Se creó 32s después: doble submit.
-- ============================================================================

begin;

create schema if not exists backup;

drop table if exists backup._bkp_limpieza_cm;
create table backup._bkp_limpieza_cm as
  select * from "ComisionMaterias"
   where ("idMateria" = 6 and "idComision" = 77)
      or "idComision" = 46;

drop table if exists backup._bkp_limpieza_comision;
create table backup._bkp_limpieza_comision as
  select * from comision where id = 46;

-- 1) Análisis Matemático II, cascarón sin horarios en 1Q1 de Eléctrica
delete from "ComisionMaterias" where "idMateria" = 6 and "idComision" = 77;

-- 2) Comisión Civil 1C1 duplicada (id 46)
delete from "ComisionMaterias" where "idComision" = 46;
delete from comision where id = 46;

commit;
