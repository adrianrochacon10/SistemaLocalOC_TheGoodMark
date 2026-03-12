import { supabase } from "../config/supabase.js";

export async function listar() {
  const { data, error } = await supabase.from("tipo_pago").select("*").order("nombre");
  if (error) throw new Error(error.message);
  return data ?? [];
}
