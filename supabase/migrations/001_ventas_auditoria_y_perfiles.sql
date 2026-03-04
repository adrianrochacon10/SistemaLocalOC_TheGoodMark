
ALTER TABLE ventas
ADD COLUMN IF NOT EXISTS usuario_registro_id uuid REFERENCES auth.users(id);

COMMENT ON COLUMN ventas.usuario_registro_id IS 'auth.uid() del usuario que registró la venta (auditoría)';

CREATE TABLE IF NOT EXISTS public.perfiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL DEFAULT '',
  email text,
  rol text NOT NULL DEFAULT 'usuario' CHECK (rol IN ('admin', 'usuario')),
  creado_en timestamptz DEFAULT now(),
  actualizado_en timestamptz DEFAULT now()
);

ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven su propio perfil"
  ON public.perfiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuarios actualizan su propio perfil"
  ON public.perfiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Inserción desde trigger o servicio"
  ON public.perfiles FOR INSERT
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre, email, rol)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nombre', split_part(COALESCE(new.email, ''), '@', 1)),
    new.email,
    COALESCE(nullif(trim(new.raw_user_meta_data->>'rol'), ''), 'usuario')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

SELECT
  id,
  COALESCE(raw_user_meta_data->>'nombre', split_part(COALESCE(email, ''), '@', 1)),
  email,
  COALESCE(nullif(trim(raw_user_meta_data->>'rol'), ''), 'usuario')
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  nombre = COALESCE(EXCLUDED.nombre, perfiles.nombre),
  email = COALESCE(EXCLUDED.email, perfiles.email),
  rol = COALESCE(nullif(trim(EXCLUDED.rol), ''), perfiles.rol),
  actualizado_en = now();
