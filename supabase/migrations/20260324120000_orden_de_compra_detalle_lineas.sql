-- Detalle de líneas para PDF (pantallas seleccionadas e importes)
ALTER TABLE orden_de_compra
  ADD COLUMN IF NOT EXISTS detalle_lineas jsonb;

ALTER TABLE orden_de_compra
  ADD COLUMN IF NOT EXISTS iva_porcentaje numeric(6, 2);
