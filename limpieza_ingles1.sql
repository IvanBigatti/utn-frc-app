-- ============================================================================
-- Inglés I: cascarones de 1er año sin horarios
--
-- Mismo defecto y mismo criterio que Análisis Matemático II en
-- `limpieza_datos_progreso.sql`: una fila de 1er año SIN un solo bloque
-- horario, cuando la misma materia está cargada más arriba CON horarios
-- reales en la misma carrera.
--
-- El criterio va escrito explícito y NO como una lista de ids, porque así
-- excluye por construcción los ceros legítimos: en Química (1V4) y Sistemas
-- (1K8, 1K11, 1K15, 1K16) Inglés I ES materia de 1er año y simplemente no
-- tiene el horario cargado. Borrar "todas las filas sin horarios" se las
-- habría llevado puestas.
--
-- Afecta exactamente 3 filas: Civil 1C1 (44), Civil 1C2 (45), Eléctrica 1Q1 (77).
-- ============================================================================

begin;

create schema if not exists backup;

drop table if exists backup._bkp_limpieza_ingles1;
create table backup._bkp_limpieza_ingles1 as
  select cm.*
    from "ComisionMaterias" cm
    join comision c on c.id = cm."idComision"
   where cm."idMateria" = 4
     and jsonb_array_length(coalesce(cm.horarios, '[]'::jsonb)) = 0
     and exists (
       select 1
         from "ComisionMaterias" cm2
         join comision c2 on c2.id = cm2."idComision"
        where cm2."idMateria" = 4
          and c2.ingenieria_id = c.ingenieria_id
          and c2."año" > c."año"
          and jsonb_array_length(coalesce(cm2.horarios, '[]'::jsonb)) > 0
     );

delete from "ComisionMaterias" cm
 using comision c
 where c.id = cm."idComision"
   and cm."idMateria" = 4
   and jsonb_array_length(coalesce(cm.horarios, '[]'::jsonb)) = 0
   and exists (
     select 1
       from "ComisionMaterias" cm2
       join comision c2 on c2.id = cm2."idComision"
      where cm2."idMateria" = 4
        and c2.ingenieria_id = c.ingenieria_id
        and c2."año" > c."año"
        and jsonb_array_length(coalesce(cm2.horarios, '[]'::jsonb)) > 0
   );

commit;

-- Control: 3 borradas, 0 cascarones restantes, 5 ceros legítimos intactos
select (select count(*) from backup._bkp_limpieza_ingles1) as borradas,
       (select count(*) from "ComisionMaterias" where "idMateria" = 4 and "idComision" in (44, 45, 77)) as cascarones_restantes,
       (select count(*) from "ComisionMaterias" where "idMateria" = 4 and "idComision" in (67, 8, 11, 15, 16)) as ceros_legitimos_intactos;
