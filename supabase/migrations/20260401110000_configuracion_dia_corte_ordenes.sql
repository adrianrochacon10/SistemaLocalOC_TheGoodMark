alter table if exists configuracion
add column if not exists dia_corte_ordenes integer not null default 20;

alter table if exists configuracion
drop constraint if exists configuracion_dia_corte_ordenes_check;

alter table if exists configuracion
add constraint configuracion_dia_corte_ordenes_check
check (dia_corte_ordenes between 1 and 31);
