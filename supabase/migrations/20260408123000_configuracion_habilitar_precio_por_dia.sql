alter table if exists public.configuracion
add column if not exists habilitar_precio_por_dia boolean not null default false;
