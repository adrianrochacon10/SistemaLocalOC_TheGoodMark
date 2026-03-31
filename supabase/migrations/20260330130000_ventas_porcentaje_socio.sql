-- Porcentaje del socio en la venta (independiente de comisión / comision_porcentaje).
ALTER TABLE public.ventas
  ADD COLUMN IF NOT EXISTS porcentaje_socio numeric(5, 2);

COMMENT ON COLUMN public.ventas.porcentaje_socio IS
  'Porcentaje del socio sobre el periodo (distinto de comisión de venta)';
