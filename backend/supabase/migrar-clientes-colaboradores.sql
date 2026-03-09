-- Migración: clientes → colaboradores, tipo_pdf a colaborador, ventas+productos
-- Ejecutar en orden si ya tienes datos.

-- 1. Crear tabla productos si no existe
CREATE TABLE IF NOT EXISTS productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  precio numeric(12,2) NOT NULL CHECK (precio >= 0),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access productos" ON productos FOR ALL USING (true) WITH CHECK (true);

-- 2. Renombrar clientes → colaboradores
ALTER TABLE IF EXISTS clientes RENAME TO colaboradores;

-- 3. Añadir tipo_pdf a colaboradores (antes clientes)
ALTER TABLE colaboradores ADD COLUMN IF NOT EXISTS tipo_pdf smallint NOT NULL DEFAULT 1 CHECK (tipo_pdf IN (1, 2));

-- 4. Copiar tipo_pdf desde pantallas a colaboradores (si pantallas tiene tipo_pdf)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pantallas' AND column_name = 'tipo_pdf'
  ) THEN
    UPDATE colaboradores c
    SET tipo_pdf = COALESCE(p.tipo_pdf, 1)
    FROM pantallas p
    WHERE c.pantalla_id = p.id;
  END IF;
END $$;

-- 5. Quitar tipo_pdf de pantallas
ALTER TABLE pantallas DROP COLUMN IF EXISTS tipo_pdf;

-- 6. Añadir producto_id a ventas
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS producto_id uuid REFERENCES productos(id) ON DELETE SET NULL;

-- 7. Renombrar cliente_id → colaborador_id en ventas
ALTER TABLE ventas RENAME COLUMN cliente_id TO colaborador_id;

-- 8. Actualizar FK de ventas.colaborador_id (antes cliente_id) a colaboradores
-- La FK ya apunta a clientes; al renombrar la tabla, la FK sigue siendo válida.
-- Si la FK se llama fk_cliente, puedes dejarla o renombrarla:
ALTER TABLE ventas DROP CONSTRAINT IF EXISTS ventas_cliente_id_fkey;
ALTER TABLE ventas ADD CONSTRAINT ventas_colaborador_id_fkey
  FOREIGN KEY (colaborador_id) REFERENCES colaboradores(id) ON DELETE RESTRICT;

-- 9. Actualizar codigos_edicion: entidad 'cliente' → 'colaborador'
UPDATE codigos_edicion SET entidad = 'colaborador' WHERE entidad = 'cliente';

ALTER TABLE codigos_edicion DROP CONSTRAINT IF EXISTS codigos_edicion_entidad_check;
ALTER TABLE codigos_edicion ADD CONSTRAINT codigos_edicion_entidad_check
  CHECK (entidad IN ('colaborador', 'orden'));
