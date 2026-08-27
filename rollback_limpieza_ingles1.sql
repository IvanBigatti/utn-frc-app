-- Rollback de limpieza_ingles1.sql
-- No hace falta reponer ninguna comisión: solo se borraron filas de
-- ComisionMaterias, las comisiones 44, 45 y 77 siguen existiendo.
begin;

insert into "ComisionMaterias" select * from backup._bkp_limpieza_ingles1
  on conflict ("idMateria", "idComision") do nothing;

commit;
