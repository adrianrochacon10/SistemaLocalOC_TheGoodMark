alter table if exists public.configuracion
add column if not exists tarifas_dias jsonb not null default '[
  {"dias":1,"precio":0},
  {"dias":3,"precio":0},
  {"dias":7,"precio":0},
  {"dias":15,"precio":0}
]'::jsonb;
