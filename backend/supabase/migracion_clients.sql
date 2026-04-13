-- Tabla de clientes (compradores / receptor de la venta). Ejecutar en Supabase SQL Editor.
-- Backend: tabla `clients`, API: /api/clients. En la app se muestra como "clientes".

CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  telefono text,
  correo text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clients_nombre ON clients (lower(nombre));

ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ventas_client_id ON ventas (client_id);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access clients" ON clients;
CREATE POLICY "Service role full access clients" ON clients FOR ALL USING (true) WITH CHECK (true);
