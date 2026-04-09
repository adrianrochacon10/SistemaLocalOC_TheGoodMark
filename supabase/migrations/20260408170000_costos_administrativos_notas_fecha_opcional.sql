alter table if exists public.costos_administrativos
  add column if not exists nota text;

alter table if exists public.costos_administrativos
  alter column fecha drop not null;
