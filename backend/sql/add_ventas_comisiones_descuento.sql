-- Ejecutar en Supabase → SQL Editor si la tabla ventas aún no tiene estas columnas.
alter table public.ventas
  add column if not exists comisiones numeric not null default 0;

alter table public.ventas
  add column if not exists descuento numeric not null default 0;
