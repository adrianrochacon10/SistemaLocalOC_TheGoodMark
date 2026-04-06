-- Permitir varios registros con la misma fecha y categoría en costos administrativos.
-- Antes: un UNIQUE(fecha, categoria) (o índice único equivalente) rechazaba el segundo insert.

DO $$
DECLARE
  r RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'costos_administrativos'
  ) THEN
    RAISE NOTICE 'Tabla costos_administrativos no existe; no hay nada que ajustar.';
    RETURN;
  END IF;

  -- Restricciones UNIQUE de tabla que involucren fecha y categoria
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'costos_administrativos'
      AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) ILIKE '%fecha%'
      AND pg_get_constraintdef(c.oid) ILIKE '%categoria%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.costos_administrativos DROP CONSTRAINT IF EXISTS %I',
      r.conname
    );
  END LOOP;

  -- Índices UNIQUE sueltos (CREATE UNIQUE INDEX …) no siempre aparecen como constraint anterior
  FOR r IN
    SELECT i.indexname
    FROM pg_indexes i
    WHERE i.schemaname = 'public'
      AND i.tablename = 'costos_administrativos'
      AND i.indexdef ILIKE '%UNIQUE%'
      AND i.indexdef ILIKE '%fecha%'
      AND i.indexdef ILIKE '%categoria%'
      AND i.indexname NOT LIKE '%_pkey'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS public.%I', r.indexname);
  END LOOP;
END $$;
