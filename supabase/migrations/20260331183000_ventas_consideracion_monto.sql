-- Consideración por venta (monto capturado en registro de venta)
alter table public.ventas
  add column if not exists consideracion_monto numeric(12,2) not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ventas_consideracion_monto_chk'
  ) then
    alter table public.ventas
      add constraint ventas_consideracion_monto_chk
      check (consideracion_monto >= 0);
  end if;
end $$;

