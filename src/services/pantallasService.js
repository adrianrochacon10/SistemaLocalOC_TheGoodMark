import { supabase } from "../config/supabase.js";

export async function listar() {
  const { data, error } = await supabase.from("pantallas").select("*").order("nombre");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function crear(payload, userId) {
  const { data, error } = await supabase
    .from("pantallas")
    .insert({
      nombre: payload.nombre.trim(),
      creado_por: userId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function actualizar(id, payload) {
  const { data, error } = await supabase
    .from("pantallas")
    .update({
      ...(payload.nombre !== undefined ? { nombre: payload.nombre } : {}),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Pantalla no encontrada");
  return data;
}

export async function obtenerPorId(id) {
  const { data, error } = await supabase.from("pantallas").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Pantalla no encontrada");
  return data;
}
