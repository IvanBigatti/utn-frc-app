-- Rollback de limpieza_datos_progreso.sql
-- La comisión va PRIMERO: ComisionMaterias tiene FK contra ella.
begin;

insert into comision select * from backup._bkp_limpieza_comision
  on conflict (id) do nothing;

insert into "ComisionMaterias" select * from backup._bkp_limpieza_cm
  on conflict ("idMateria", "idComision") do nothing;

commit;
