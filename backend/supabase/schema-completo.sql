-- TGM - Esquema Supabase
DROP TABLE IF EXISTS codigos_edicion;
DROP TABLE IF EXISTS ordenes_mes;
DROP TABLE IF EXISTS ventas;
DROP TABLE IF EXISTS porcentajes;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS colaboradores;
DROP TABLE IF EXISTS pantallas;
DROP TABLE IF EXISTS tipo_pago;
DROP TABLE IF EXISTS perfiles;

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
  producto_id uuid REFERENCES productos(id) ON DELETE SET NULL,
  estado text NOT NULL CHECK (estado IN ('prospecto', 'aceptado', 'rechazado')),
  pantalla_id uuid NOT NULL REFERENCES pantallas(id) ON DELETE RESTRICT,
  fecha_inicio date NOT NULL,
  fecha_fin date NOT NULL,
  duracion_meses integer NOT NULL CHECK (duracion_meses > 0),
  vendedor_id uuid NOT NULL REFERENCES perfiles(id) ON DELETE RESTRICT,
  modo_venta text,
  tipo_pago_id uuid NOT NULL REFERENCES tipo_pago(id),
  renovable boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_ventas_colaborador ON ventas(colaborador_id);
CREATE INDEX idx_ventas_producto ON ventas(producto_id);
CREATE INDEX idx_ventas_pantalla ON ventas(pantalla_id);
CREATE INDEX idx_ventas_vendedor ON ventas(vendedor_id);
CREATE INDEX idx_ventas_fecha_inicio ON ventas(fecha_inicio);

CREATE TABLE ordenes_mes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes integer NOT NULL CHECK (mes >= 1 AND mes <= 12),
  anio integer NOT NULL,
  ventas_ids jsonb DEFAULT '[]',
  pdf_url text,
  generado_por uuid REFERENCES perfiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(mes, anio)
);
CREATE INDEX idx_ordenes_mes_anio_mes ON ordenes_mes(anio, mes);

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
ALTER TABLE ordenes_mes ENABLE ROW LEVEL SECURITY;
ALTER TABLE porcentajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE codigos_edicion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access perfiles" ON perfiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access tipo_pago" ON tipo_pago FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access pantallas" ON pantallas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access productos" ON productos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access colaboradores" ON colaboradores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access ventas" ON ventas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access ordenes_mes" ON ordenes_mes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access porcentajes" ON porcentajes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access codigos_edicion" ON codigos_edicion FOR ALL USING (true) WITH CHECK (true);
