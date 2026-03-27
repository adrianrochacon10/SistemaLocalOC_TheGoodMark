import { supabase } from "../config/supabase.js";

export async function listar() {
  const { data, error } = await supabase.from("pantallas").select("*").order("nombre");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function crear(payload, userId) {
  const precio = Number(payload.precio ?? 0);
  if (!Number.isFinite(precio) || precio < 0) {
    return { error: "precio debe ser un numero >= 0" };
  }
  const { data, error } = await supabase
    .from("pantallas")
    .insert({
      nombre: payload.nombre.trim(),
      precio: Math.round(precio * 100) / 100,
      creado_por: userId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function actualizar(id, payload) {
  const nextPayload = { ...payload };
  if (payload.precio !== undefined) {
    const precio = Number(payload.precio);
    if (!Number.isFinite(precio) || precio < 0) {
      throw new Error("precio debe ser un numero >= 0");
    }
    nextPayload.precio = Math.round(precio * 100) / 100;
  }

  const { data, error } = await supabase
    .from("pantallas")
    .update(nextPayload)
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
