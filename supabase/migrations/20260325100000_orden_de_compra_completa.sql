-- Columnas que el backend espera al insertar/actualizar órdenes.
-- Ejecuta esto en Supabase → SQL si orden_de_compra quedó incompleta.

ALTER TABLE public.orden_de_compra
  ADD COLUMN IF NOT EXISTS ventas_ids jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.orden_de_compra
  ADD COLUMN IF NOT EXISTS generado_por uuid REFERENCES public.perfiles (id) ON DELETE SET NULL;

ALTER TABLE public.orden_de_compra
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE public.orden_de_compra
  ADD COLUMN IF NOT EXISTS detalle_lineas jsonb;

ALTER TABLE public.orden_de_compra
  ADD COLUMN IF NOT EXISTS iva_porcentaje numeric(6, 2);

-- Varias órdenes por colaborador/mes/año: no uses UNIQUE aquí.
-- Si ya aplicaste una versión anterior con UNIQUE, ejecuta
-- 20260326120000_orden_de_compra_varias_por_mes.sql

ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS orden_de_compra_id uuid REFERENCES public.orden_de_compra (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ventas_orden_de_compra_id ON public.ventas (orden_de_compra_id);
