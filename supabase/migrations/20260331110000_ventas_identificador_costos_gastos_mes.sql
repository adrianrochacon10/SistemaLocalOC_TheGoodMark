-- Nuevos campos para ventas: identificador + costo de venta
alter table public.ventas
  add column if not exists identificador_venta text,
  add column if not exists costo_venta numeric(12,2) not null default 0;

-- Unicidad opcional del identificador (si se captura)
create unique index if not exists ventas_identificador_venta_uq
  on public.ventas (upper(identificador_venta))
  where identificador_venta is not null and btrim(identificador_venta) <> '';

-- Formato simple: 4 letras/numeros
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ventas_identificador_venta_chk'
  ) then
    alter table public.ventas
      add constraint ventas_identificador_venta_chk
      check (
        identificador_venta is null
        or upper(identificador_venta) ~ '^[A-Z0-9]{4}$'
      );
  end if;
end $$;

-- Catálogo de fuentes solicitado (sin bloquear valores históricos)
comment on column public.ventas.fuente_origen is
  'Opciones UI: BNI, Referencia, Otro';

-- Gastos adicionales por mes de una venta (1..duracion_meses)
create table if not exists public.venta_gastos_mensuales (
  id uuid primary key default gen_random_uuid(),
  venta_id uuid not null references public.ventas(id) on delete cascade,
  numero_mes integer not null check (numero_mes >= 1),
  monto numeric(12,2) not null check (monto >= 0),
  descripcion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists venta_gastos_mensuales_venta_mes_uq
  on public.venta_gastos_mensuales (venta_id, numero_mes);

create index if not exists venta_gastos_mensuales_venta_idx
  on public.venta_gastos_mensuales (venta_id);

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tr_venta_gastos_mensuales_updated_at on public.venta_gastos_mensuales;
create trigger tr_venta_gastos_mensuales_updated_at
before update on public.venta_gastos_mensuales
for each row execute procedure public.set_updated_at();

