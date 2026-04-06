-- Categorías con asociados (subcategorías) y costos_administrativos por FK.

CREATE TABLE IF NOT EXISTS public.costos_categoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT costos_categoria_tipo_unique UNIQUE (tipo)
);

CREATE TABLE IF NOT EXISTS public.costos_categoria_asociado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id uuid NOT NULL REFERENCES public.costos_categoria (id) ON DELETE CASCADE,
  nombre text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT costos_categoria_asociado_unique UNIQUE (categoria_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_costos_categoria_asociado_categoria
  ON public.costos_categoria_asociado (categoria_id);

INSERT INTO public.costos_categoria (tipo)
SELECT 'Sin clasificar'
WHERE NOT EXISTS (SELECT 1 FROM public.costos_categoria WHERE tipo = 'Sin clasificar');

DO $$
DECLARE
  default_cat_id uuid;
  has_legacy_categoria boolean;
BEGIN
  SELECT id INTO default_cat_id
  FROM public.costos_categoria
  WHERE tipo = 'Sin clasificar'
  LIMIT 1;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'costos_administrativos'
  ) THEN
    CREATE TABLE public.costos_administrativos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      fecha date NOT NULL,
      mes integer NOT NULL CHECK (mes >= 1 AND mes <= 12),
      anio integer NOT NULL CHECK (anio >= 2000 AND anio <= 3000),
      importe numeric(14, 2) NOT NULL CHECK (importe >= 0),
      nota text,
      categoria_id uuid NOT NULL REFERENCES public.costos_categoria (id) ON DELETE RESTRICT,
      asociado_id uuid REFERENCES public.costos_categoria_asociado (id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_costos_admin_anio_mes
      ON public.costos_administrativos (anio, mes);
    CREATE INDEX IF NOT EXISTS idx_costos_admin_fecha
      ON public.costos_administrativos (fecha DESC);
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'costos_administrativos'
      AND column_name = 'categoria_id'
  ) THEN
    RETURN;
  END IF;

  ALTER TABLE public.costos_administrativos
    ADD COLUMN categoria_id uuid REFERENCES public.costos_categoria (id) ON DELETE RESTRICT;
  ALTER TABLE public.costos_administrativos
    ADD COLUMN asociado_id uuid REFERENCES public.costos_categoria_asociado (id) ON DELETE SET NULL;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'costos_administrativos'
      AND column_name = 'categoria'
  )
  INTO has_legacy_categoria;

  IF has_legacy_categoria THEN
    INSERT INTO public.costos_categoria (tipo)
    SELECT DISTINCT trim(both from ca.categoria)
    FROM public.costos_administrativos ca
    WHERE ca.categoria IS NOT NULL
      AND trim(both from ca.categoria) <> ''
      AND NOT EXISTS (
        SELECT 1
        FROM public.costos_categoria cc
        WHERE cc.tipo = trim(both from ca.categoria)
      );

    UPDATE public.costos_administrativos ca
    SET categoria_id = cc.id
    FROM public.costos_categoria cc
    WHERE trim(both from ca.categoria) = cc.tipo
      AND ca.categoria_id IS NULL;

    ALTER TABLE public.costos_administrativos DROP COLUMN categoria;
  END IF;

  UPDATE public.costos_administrativos
  SET categoria_id = default_cat_id
  WHERE categoria_id IS NULL;

  ALTER TABLE public.costos_administrativos
    ALTER COLUMN categoria_id SET NOT NULL;
END $$;
