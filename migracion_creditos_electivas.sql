-- ============================================================================
-- Créditos de electivas
--
-- Modelo: cada carrera declara CÓMO acredita sus electivas. NULL significa
-- "todavía no lo sabemos", y la UI muestra un contador sin denominador en vez
-- de inventar un requisito. El día que se averigüe el de otra carrera es un
-- UPDATE de dos valores, no un deploy.
--
-- Verificado antes de escribir esto:
--   * Ninguna electiva se comparte entre carreras -> `materia.creditos` puede
--     vivir en `materia` (global) sin ambigüedad, igual que `es_electiva`.
--   * En Sistemas el crédito coincide 1 a 1 con `horas_semanales` en las 16
--     electivas (14 de 3h/3cr, Backend 4h/4cr, Desarrollo con Objetos 2h/2cr).
--     Se guarda igual en su propia columna: el crédito sale de la ordenanza,
--     las horas de la grilla horaria. Hoy coinciden; no tienen por qué.
-- ============================================================================

begin;

-- Snapshot para el rollback
create schema if not exists backup;
drop table if exists backup._bkp_creditos_electivas;
create table backup._bkp_creditos_electivas as
  select id, nombre, horas_semanales from materia where es_electiva;

alter table ingenieria
  add column if not exists electivas_modo text
    check (electivas_modo in ('creditos', 'cantidad', 'horas')),
  add column if not exists electivas_requeridas numeric
    check (electivas_requeridas > 0);

alter table materia
  add column if not exists creditos smallint
    check (creditos > 0);

comment on column ingenieria.electivas_modo is
  'Cómo acredita electivas esta carrera. NULL = todavía no se sabe: la UI no muestra denominador.';
comment on column ingenieria.electivas_requeridas is
  'Cuántos créditos/materias/horas de electiva exige el plan. NULL junto con electivas_modo.';
comment on column materia.creditos is
  'Valor en créditos de la electiva según la ordenanza. NULL en materias obligatorias y en electivas de carreras cuyo régimen se desconoce.';

-- Sistemas (id 1) — plan 2023: 20 créditos de electivas
update ingenieria
   set electivas_modo       = 'creditos',
       electivas_requeridas = 20
 where id = 1;

-- Backfill de los créditos de Sistemas desde las horas semanales
update materia m
   set creditos = m.horas_semanales
 where m.es_electiva
   and m.horas_semanales is not null
   and exists (
     select 1
       from "ComisionMaterias" cm
       join comision c on c.id = cm."idComision"
      where cm."idMateria" = m.id
        and c.ingenieria_id = 1
   );

commit;

-- Control: tienen que salir 16 electivas con crédito y 20 exigidos
select (select count(*) from materia where es_electiva and creditos is not null) as electivas_con_credito,
       (select sum(creditos) from materia where es_electiva and creditos is not null) as creditos_disponibles,
       (select electivas_requeridas from ingenieria where id = 1) as creditos_exigidos;
