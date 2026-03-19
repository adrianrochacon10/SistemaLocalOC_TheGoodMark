-- TGM - Esquema Supabase (Faltan actualizaciones y cambios)
CREATE TABLE perfiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  email text NOT NULL UNIQUE,
  rol text NOT NULL CHECK (rol IN ('admin', 'vendedor')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE tipo_pago (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE CHECK (nombre IN ('porcentaje', 'precio fijo', 'consideracion', 'ninguno')),
  created_at timestamptz DEFAULT now()
);
INSERT INTO tipo_pago (nombre) VALUES ('porcentaje'), ('precio fijo'), ('consideracion'), ('ninguno');

CREATE TABLE pantallas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  direccion text,
  creado_por uuid REFERENCES perfiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  precio numeric(12,2) NOT NULL CHECK (precio >= 0),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE colaboradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  telefono text,
  email text,
  contacto text,
  tipo_pago_id uuid NOT NULL REFERENCES tipo_pago(id),
  pantalla_id uuid NOT NULL REFERENCES pantallas(id) ON DELETE RESTRICT,
  producto_id uuid REFERENCES productos(id) ON DELETE SET NULL,
  tipo_pdf smallint NOT NULL DEFAULT 1 CHECK (tipo_pdf IN (1, 2)),
  creado_por uuid REFERENCES perfiles(id),
  actualizado_por uuid REFERENCES perfiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_colaboradores_creado_por ON colaboradores(creado_por);
CREATE INDEX idx_colaboradores_tipo_pago ON colaboradores(tipo_pago_id);
CREATE INDEX idx_colaboradores_pantalla ON colaboradores(pantalla_id);
CREATE INDEX idx_colaboradores_tipo_pdf ON colaboradores(tipo_pdf);

CREATE TABLE ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES colaboradores(id) ON DELETE RESTRICT,
  client_name text,
  estado_venta text NOT NULL CHECK (estado_venta IN ('prospecto', 'aceptado', 'rechazado')),
  precio_total numeric(12,2) NOT NULL DEFAULT 0 CHECK (precio_total >= 0),
  precio_por_mes numeric(12,2),
  costos numeric(12,2) NOT NULL DEFAULT 0 CHECK (costos >= 0),
  utilidad_neta numeric(12,2),
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  duracion_meses integer NOT NULL CHECK (duracion_meses > 0),
  vendedor_id uuid NOT NULL REFERENCES perfiles(id) ON DELETE RESTRICT,
  tipo_pago_id uuid NOT NULL REFERENCES tipo_pago(id),
  renovable boolean DEFAULT false,
  comisiones numeric(12,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_ventas_colaborador ON ventas(colaborador_id);
CREATE INDEX idx_ventas_vendedor ON ventas(vendedor_id);
CREATE INDEX idx_ventas_fecha_inicio ON ventas(fecha_inicio);

CREATE TABLE orden_de_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES colaboradores(id) ON DELETE RESTRICT,
  mes smallint NOT NULL CHECK (mes >= 1 AND mes <= 12),
  anio integer NOT NULL,
  subtotal numeric(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  iva numeric(12,2) NOT NULL DEFAULT 0 CHECK (iva >= 0),
  total numeric(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  ventas_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  generado_por uuid REFERENCES perfiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (colaborador_id, mes, anio)
);
CREATE INDEX idx_orden_de_compra_colaborador ON orden_de_compra(colaborador_id);
CREATE INDEX idx_orden_de_compra_anio_mes ON orden_de_compra(anio, mes);

ALTER TABLE ventas
  ADD COLUMN orden_de_compra_id uuid REFERENCES orden_de_compra(id) ON DELETE SET NULL;
CREATE INDEX idx_ventas_orden_de_compra ON ventas(orden_de_compra_id);

CREATE TABLE porcentajes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_pago_id uuid NOT NULL REFERENCES tipo_pago(id),
  valor numeric(5,2) NOT NULL CHECK (valor >= 0 AND valor <= 100),
  descripcion text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE codigos_edicion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  vendedor_id uuid NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  entidad text NOT NULL CHECK (entidad IN ('colaborador', 'orden')),
  entidad_id uuid NOT NULL,
  admin_email text NOT NULL,
  usado boolean DEFAULT false,
  expira_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_codigos_edicion_codigo ON codigos_edicion(codigo);
CREATE INDEX idx_codigos_edicion_expira ON codigos_edicion(expira_at);

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipo_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantallas ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE orden_de_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE porcentajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE codigos_edicion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access perfiles" ON perfiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access tipo_pago" ON tipo_pago FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access pantallas" ON pantallas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access productos" ON productos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access colaboradores" ON colaboradores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access ventas" ON ventas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access orden_de_compra" ON orden_de_compra FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access porcentajes" ON porcentajes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access codigos_edicion" ON codigos_edicion FOR ALL USING (true) WITH CHECK (true);
