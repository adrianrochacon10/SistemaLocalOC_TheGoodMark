import { supabase } from "../config/supabase.js";

export async function listar() {
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .order("nombre");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function crear(nombre, precio) {
  if (!nombre?.trim()) return { error: "Nombre es obligatorio" };

  const { data, error } = await supabase
    .from("productos")
    .insert({ nombre: nombre.trim() })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return { data };
}
