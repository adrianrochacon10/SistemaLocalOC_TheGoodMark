-- Tabla que usa el backend (API /api/ordenes). Ejecutar en Supabase si aún no existe.
CREATE TABLE IF NOT EXISTS public.orden_de_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  mes integer NOT NULL CHECK (mes >= 1 AND mes <= 12),
  anio integer NOT NULL,
  ventas_ids jsonb DEFAULT '[]'::jsonb,
  subtotal numeric(14, 2) DEFAULT 0,
  iva numeric(14, 2) DEFAULT 0,
  total numeric(14, 2) DEFAULT 0,
  generado_por uuid REFERENCES public.perfiles(id),
  created_at timestamptz DEFAULT now(),
  detalle_lineas jsonb,
  iva_porcentaje numeric(6, 2),
  CONSTRAINT orden_de_compra_colaborador_mes_anio_unique UNIQUE (colaborador_id, mes, anio)
);

CREATE INDEX IF NOT EXISTS idx_orden_de_compra_anio_mes ON public.orden_de_compra (anio, mes);
CREATE INDEX IF NOT EXISTS idx_orden_de_compra_colaborador ON public.orden_de_compra (colaborador_id);

ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS orden_de_compra_id uuid REFERENCES public.orden_de_compra (id) ON DELETE SET NULL;

ALTER TABLE public.pantallas
  ADD COLUMN IF NOT EXISTS precio numeric(14, 2);
