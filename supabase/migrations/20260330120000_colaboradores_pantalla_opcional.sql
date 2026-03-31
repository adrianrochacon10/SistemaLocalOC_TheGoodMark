-- Permite crear colaboradores solo con productos (sin pantallas asignadas).
ALTER TABLE colaboradores
  ALTER COLUMN pantalla_id DROP NOT NULL;
