-- Ejecuta este script en Supabase: SQL Editor → New query → Pegar y Run
-- Añade la tabla productos y la columna producto_id en ventas (opcional)

-- 1. Crear tabla productos si no existe
CREATE TABLE IF NOT EXISTS productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  precio numeric(12,2) NOT NULL CHECK (precio >= 0),
  created_at timestamptz DEFAULT now()
);

-- 2. Activar RLS y política (para que el backend pueda leer/escribir)
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access productos" ON productos;
CREATE POLICY "Service role full access productos" ON productos
  FOR ALL USING (true) WITH CHECK (true);

-- 3. Añadir columna producto_id a ventas (opcional, puede ser NULL)
ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS producto_id uuid REFERENCES productos(id) ON DELETE SET NULL;

-- 4. Índice para búsquedas por producto
CREATE INDEX IF NOT EXISTS idx_ventas_producto ON ventas(producto_id);
