-- Permite varias órdenes de compra para el mismo colaborador y mes/año
-- (p. ej. crear manual varias veces sin reemplazar la anterior).

ALTER TABLE public.orden_de_compra
  DROP CONSTRAINT IF EXISTS orden_de_compra_colaborador_mes_anio_unique;
