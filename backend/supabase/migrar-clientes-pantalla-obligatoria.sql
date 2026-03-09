ALTER TABLE clientes ADD COLUMN IF NOT EXISTS pantalla_id uuid REFERENCES pantallas(id) ON DELETE RESTRICT;

UPDATE clientes SET pantalla_id = (SELECT id FROM pantallas ORDER BY created_at LIMIT 1) WHERE pantalla_id IS NULL;

ALTER TABLE clientes ALTER COLUMN pantalla_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clientes_pantalla ON clientes(pantalla_id);
