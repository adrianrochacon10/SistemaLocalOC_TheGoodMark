-- Unir ventas con ordenes_mes: cada venta puede pertenecer a una orden del mes.
-- Ejecutar en el SQL Editor de Supabase.

-- 1. Agregar columnas en ventas para enlazar con la orden del mes
ALTER TABLE IF EXISTS public.ventas
  ADD COLUMN IF NOT EXISTS orden_mes_id uuid REFERENCES public.ordenes_mes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS orden_mes_fecha date;

-- 2. Índice para filtrar ventas por orden del mes
CREATE INDEX IF NOT EXISTS idx_ventas_orden_mes_id ON public.ventas(orden_mes_id);

-- 3. (Opcional) Limpiar diseño antiguo basado en ventas_ids en ordenes_mes
ALTER TABLE IF EXISTS public.ordenes_mes
  DROP COLUMN IF EXISTS ventas_ids;
