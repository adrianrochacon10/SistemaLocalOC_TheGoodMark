import { supabase } from "../config/supabase.js";

const SELECT_COLABORADOR =
  "*, tipo_pago(id, nombre), pantalla:pantallas(id, nombre), producto:productos(id, nombre, precio)";

export async function listar() {
  const { data, error } = await supabase
    .from("colaboradores")
    .select(SELECT_COLABORADOR)
    .order("nombre");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function crear(body, userId) {
  const tipoPagoId = body.tipo_pago_id != null && String(body.tipo_pago_id).trim() ? String(body.tipo_pago_id).trim() : null;
  const pantallaId = body.pantalla_id != null && String(body.pantalla_id).trim() ? String(body.pantalla_id).trim() : null;
  const productoId =
    body.producto_id != null && String(body.producto_id).trim() ? String(body.producto_id).trim() : null;
  if (!body.nombre?.trim()) return { error: "Nombre es obligatorio" };
  if (!tipoPagoId) return { error: "Tipo de pago es obligatorio (tipo_pago_id en el body)" };
  if (!pantallaId) return { error: "Pantalla es obligatoria (pantalla_id en el body). Envía el body en JSON con Content-Type: application/json." };

  const { data, error } = await supabase
    .from("colaboradores")
    .insert({
      nombre: body.nombre.trim(),
      telefono: body.telefono ?? null,
      email: body.email ?? null,
      contacto: body.contacto ?? null,
      tipo_pago_id: tipoPagoId,
      pantalla_id: pantallaId,
      producto_id: productoId,
      creado_por: userId,
      actualizado_por: userId,
    })
    .select(SELECT_COLABORADOR)
    .single();
  if (error) throw new Error(error.message);
  return { data };
}

export async function actualizar(id, body, userId) {
  const payload = { updated_at: new Date().toISOString(), actualizado_por: userId };
  if (body.nombre !== undefined) payload.nombre = body.nombre;
  if (body.telefono !== undefined) payload.telefono = body.telefono;
  if (body.email !== undefined) payload.email = body.email;
  if (body.contacto !== undefined) payload.contacto = body.contacto;
  if (body.tipo_pago_id !== undefined) payload.tipo_pago_id = body.tipo_pago_id;
  if (body.pantalla_id !== undefined) payload.pantalla_id = body.pantalla_id;
  if (body.producto_id !== undefined) payload.producto_id = body.producto_id || null;

  const { data, error } = await supabase
    .from("colaboradores")
    .update(payload)
    .eq("id", id)
    .select(SELECT_COLABORADOR)
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Colaborador no encontrado");
  return data;
}

export async function obtenerPorId(id) {
  const { data, error } = await supabase
    .from("colaboradores")
    .select(SELECT_COLABORADOR)
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Colaborador no encontrado");
  return data;
}
