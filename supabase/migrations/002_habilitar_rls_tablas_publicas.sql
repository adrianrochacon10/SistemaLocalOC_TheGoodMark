
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer configuracion"
  ON public.configuracion FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar/actualizar configuracion"
  ON public.configuracion FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden gestionar colaboradores"
  ON public.colaboradores FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.pantallas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden gestionar pantallas"
  ON public.pantallas FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer ventas"
  ON public.ventas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar ventas"
  ON public.ventas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = usuario_registro_id OR usuario_registro_id IS NULL);

CREATE POLICY "Usuarios autenticados pueden actualizar ventas"
  ON public.ventas FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer logs"
  ON public.logs_auditoria FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden insertar logs (auditoría)"
  ON public.logs_auditoria FOR INSERT
  TO authenticated
  WITH CHECK (true);
