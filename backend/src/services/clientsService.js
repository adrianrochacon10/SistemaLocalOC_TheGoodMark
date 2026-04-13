import { supabase } from "../config/supabase.js";

const SELECT = "id,nombre,telefono,correo,created_at,updated_at";

export async function listar() {
  const { data, error } = await supabase
    .from("clients")
    .select(SELECT)
    .order("nombre", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function crear(body) {
  const { nombre, telefono, correo } = normalizarCampos(body);
  if (!nombre) return { error: "nombre es obligatorio" };

  const row = {
    nombre,
    telefono,
    correo,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("clients").insert(row).select(SELECT).single();
  if (error) return { error: error.message };
  return { data };
}

/** @param {Record<string, unknown>} body */
function normalizarCampos(body) {
  const nombre = String(body?.nombre ?? "").trim();
  const telefonoRaw = body?.telefono;
  const correoRaw = body?.correo;
  const telefono =
    telefonoRaw == null || String(telefonoRaw).trim() === ""
      ? null
      : String(telefonoRaw).trim();
  const correo =
    correoRaw == null || String(correoRaw).trim() === ""
      ? null
      : String(correoRaw).trim();
  return { nombre, telefono, correo };
}

export async function actualizar(id, body) {
  const idStr = String(id ?? "").trim();
  if (!idStr) return { error: "id inválido" };

  const { nombre, telefono, correo } = normalizarCampos(body);
  if (!nombre) return { error: "nombre es obligatorio" };

  const row = {
    nombre,
    telefono,
    correo,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("clients")
    .update(row)
    .eq("id", idStr)
    .select(SELECT)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Cliente no encontrado" };
  return { data };
}

export async function eliminar(id) {
  const idStr = String(id ?? "").trim();
  if (!idStr) return { error: "id inválido" };

  const { data, error } = await supabase
    .from("clients")
    .delete()
    .eq("id", idStr)
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Cliente no encontrado" };
  return { ok: true };
}
