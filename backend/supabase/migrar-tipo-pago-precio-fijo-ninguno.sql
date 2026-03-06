ALTER TABLE tipo_pago DROP CONSTRAINT IF EXISTS tipo_pago_nombre_check;

UPDATE tipo_pago SET nombre = 'precio fijo' WHERE nombre = 'precio';
INSERT INTO tipo_pago (nombre) VALUES ('ninguno') ON CONFLICT (nombre) DO NOTHING;

ALTER TABLE tipo_pago ADD CONSTRAINT tipo_pago_nombre_check
  CHECK (nombre IN ('porcentaje', 'precio fijo', 'consideracion', 'ninguno'));
