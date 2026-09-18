-- Rollback de migracion_creditos_electivas.sql
begin;

alter table materia    drop column if exists creditos;
alter table ingenieria drop column if exists electivas_modo;
alter table ingenieria drop column if exists electivas_requeridas;

drop table if exists backup._bkp_creditos_electivas;

commit;
