import { supabase } from "../config/supabase.js";

export async function listar() {
  const { data, error } = await supabase
    .from("porcentajes")
    .select("*, tipo_pago:tipo_pago(id, nombre)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function crear(valor, descripcion) {
  const valorNum = Number(valor);
  if (!Number.isFinite(valorNum) || valorNum < 0 || valorNum > 100) {
    return { error: "valor debe ser un numero entre 0 y 100" };
  }

  const { data: tp, error: errTp } = await supabase
    .from("tipo_pago")
    .select("id")
    .eq("nombre", "porcentaje")
    .single();
  if (errTp || !tp) throw new Error("Tipo de pago 'porcentaje' no encontrado");

  const { data, error } = await supabase
    .from("porcentajes")
    .insert({
      tipo_pago_id: tp.id,
      valor: valorNum,
      descripcion: descripcion ?? null,
    })
    .select("*, tipo_pago:tipo_pago(id, nombre)")
    .single();
  if (error) throw new Error(error.message);
  return { data };
}
