-- Algunas rutas PostgREST / embeds legacy esperan `tipo_comision` en `colaboradores`.
-- Si la columna no existe, aparece: column colaboradores_1.tipo_comision does not exist
ALTER TABLE public.colaboradores
  ADD COLUMN IF NOT EXISTS tipo_comision text;

COMMENT ON COLUMN public.colaboradores.tipo_comision IS
  'Opcional: porcentaje | consideracion | precio_fijo | ninguno. Si es null, usar tipo_pago.';
