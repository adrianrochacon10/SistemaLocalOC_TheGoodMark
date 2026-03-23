import { supabase } from "../config/supabase.js";

const SELECT_COLABORADOR =
  "*, tipo_pago(id, nombre), pantalla:pantallas(id, nombre), producto:productos(id, nombre, precio)";

const toIdArray = (value) => {
  if (Array.isArray(value))
    return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  if (value != null && String(value).trim()) return [String(value).trim()];
  return [];
};

async function enrichRelaciones(colaborador) {
  const pantallaIds = Array.isArray(colaborador?.pantalla_ids)
    ? colaborador.pantalla_ids
    : colaborador?.pantalla_id
      ? [colaborador.pantalla_id]
      : [];
  const productoIds = Array.isArray(colaborador?.producto_ids)
    ? colaborador.producto_ids
    : colaborador?.producto_id
      ? [colaborador.producto_id]
      : [];

  const [pantallasRes, productosRes] = await Promise.all([
    pantallaIds.length
      ? supabase.from("pantallas").select("id,nombre").in("id", pantallaIds)
      : Promise.resolve({
          data: colaborador?.pantalla ? [colaborador.pantalla] : [],
          error: null,
        }),
    productoIds.length
      ? supabase
          .from("productos")
          .select("id,nombre,precio")
          .in("id", productoIds)
      : Promise.resolve({
          data: colaborador?.producto ? [colaborador.producto] : [],
          error: null,
        }),
  ]);

  if (pantallasRes.error) throw new Error(pantallasRes.error.message);
  if (productosRes.error) throw new Error(productosRes.error.message);

  return {
    ...colaborador,
    pantalla_ids: pantallaIds,
    producto_ids: productoIds,
    pantallas: pantallasRes.data ?? [],
    productos: productosRes.data ?? [],
  };
}

async function sincronizarAsignaciones(
  colaboradorId,
  pantallaIds = [],
  productoIds = [],
) {
  // Borrar asignaciones anteriores de este colaborador
  await supabase.from("asignaciones").delete().eq("cliente_id", colaboradorId);
  await supabase
    .from("asignaciones_productos")
    .delete()
    .eq("cliente_id", colaboradorId);

  // Insertar nuevas asignaciones de pantallas
  if (pantallaIds.length > 0) {
    const rows = pantallaIds.map((pid) => ({
      cliente_id: colaboradorId,
      pantalla_id: pid,
      activa: true,
    }));
    await supabase.from("asignaciones").insert(rows);
  }

  // Insertar nuevas asignaciones de productos
  if (productoIds.length > 0) {
    const rows = productoIds.map((pid) => ({
      cliente_id: colaboradorId,
      producto_id: pid,
      activa: true,
    }));
    await supabase.from("asignaciones_productos").insert(rows);
  }
}

export async function listar() {
  const { data, error } = await supabase
    .from("colaboradores")
    .select(SELECT_COLABORADOR)
    .order("nombre");
  if (error) throw new Error(error.message);
  return Promise.all((data ?? []).map(enrichRelaciones));
}

export async function crear(body, userId) {
  const tipoPagoId =
    body.tipo_pago_id != null && String(body.tipo_pago_id).trim()
      ? String(body.tipo_pago_id).trim()
      : null;
  const pantallaIds = toIdArray(body.pantalla_ids);
  if (
    !pantallaIds.length &&
    body.pantalla_id != null &&
    String(body.pantalla_id).trim()
  ) {
    pantallaIds.push(String(body.pantalla_id).trim());
  }
  const pantallaId = pantallaIds[0] ?? null;
  const productoIds = toIdArray(body.producto_ids ?? body.producto_id);
  const productoId = productoIds[0] ?? null;
  if (!body.nombre?.trim()) return { error: "Nombre es obligatorio" };
  if (!tipoPagoId)
    return { error: "Tipo de pago es obligatorio (tipo_pago_id en el body)" };
  if (!pantallaId)
    return {
      error: "Debes enviar al menos una pantalla (pantalla_ids o pantalla_id).",
    };

  const { data, error } = await supabase
    .from("colaboradores")
    .insert({
      nombre: body.nombre.trim(),
      telefono: body.telefono ?? null,
      email: body.email ?? null,
      contacto: body.contacto ?? null,
      tipo_pago_id: tipoPagoId,
      pantalla_id: pantallaId,
      pantalla_ids: pantallaIds,
      producto_id: productoId,
      producto_ids: productoIds,
      creado_por: userId,
      actualizado_por: userId,
    })
    .select(SELECT_COLABORADOR)
    .single();
  if (error) throw new Error(error.message);

  const enriquecido = await enrichRelaciones(data);

  await sincronizarAsignaciones(data.id, pantallaIds, productoIds);

  return { data: enriquecido };
}

export async function actualizar(id, body, userId) {
  const payload = {
    updated_at: new Date().toISOString(),
    actualizado_por: userId,
  };
  if (body.nombre !== undefined) payload.nombre = body.nombre;
  if (body.telefono !== undefined) payload.telefono = body.telefono;
  if (body.email !== undefined) payload.email = body.email;
  if (body.contacto !== undefined) payload.contacto = body.contacto;
  if (body.tipo_pago_id !== undefined) payload.tipo_pago_id = body.tipo_pago_id;
  if (body.pantalla_ids !== undefined || body.pantalla_id !== undefined) {
    const pantallaIds = toIdArray(body.pantalla_ids);
    if (
      !pantallaIds.length &&
      body.pantalla_id != null &&
      String(body.pantalla_id).trim()
    ) {
      pantallaIds.push(String(body.pantalla_id).trim());
    }
    payload.pantalla_ids = pantallaIds;
    payload.pantalla_id = pantallaIds[0] ?? null;
  }
  if (body.producto_ids !== undefined || body.producto_id !== undefined) {
    const productoIds = toIdArray(body.producto_ids ?? body.producto_id);
    payload.producto_ids = productoIds;
    payload.producto_id = productoIds[0] ?? null;
  }

  const { data, error } = await supabase
    .from("colaboradores")
    .update(payload)
    .eq("id", id)
    .select(SELECT_COLABORADOR)
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Colaborador no encontrado");
  return enrichRelaciones(data);
}

export async function obtenerPorId(id) {
  const { data, error } = await supabase
    .from("colaboradores")
    .select(SELECT_COLABORADOR)
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Colaborador no encontrado");
  return enrichRelaciones(data);
}

export async function eliminar(id) {
  // 1) Desvincular y eliminar órdenes relacionadas al colaborador
  const { data: ordenes, error: errOrdenes } = await supabase
    .from("orden_de_compra")
    .select("id")
    .eq("colaborador_id", id);
  if (errOrdenes) throw new Error(errOrdenes.message);

  const ordenIds = (ordenes ?? []).map((o) => o.id);
  if (ordenIds.length > 0) {
    const { error: errVentasOrden } = await supabase
      .from("ventas")
      .update({ orden_de_compra_id: null })
      .in("orden_de_compra_id", ordenIds);
    if (errVentasOrden) throw new Error(errVentasOrden.message);

    const { error: errDeleteOrdenes } = await supabase
      .from("orden_de_compra")
      .delete()
      .in("id", ordenIds);
    if (errDeleteOrdenes) throw new Error(errDeleteOrdenes.message);
  }

  // 2) Eliminar ventas ligadas al colaborador para liberar FKs
  const { error: errDeleteVentas } = await supabase
    .from("ventas")
    .delete()
    .eq("colaborador_id", id);
  if (errDeleteVentas) throw new Error(errDeleteVentas.message);

  // 3) Limpiar códigos de edición asociados al colaborador
  const { error: errDeleteCodigos } = await supabase
    .from("codigos_edicion")
    .delete()
    .eq("entidad", "colaborador")
    .eq("entidad_id", id);
  if (errDeleteCodigos) throw new Error(errDeleteCodigos.message);

  // 4) Eliminar colaborador
  const { error, count } = await supabase
    .from("colaboradores")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Colaborador no encontrado");
  const enriquecido = await enrichRelaciones(data);

  // ← Agregar estas líneas
  const pIds = Array.isArray(payload.pantalla_ids) ? payload.pantalla_ids : [];
  const prodIds = Array.isArray(payload.producto_ids)
    ? payload.producto_ids
    : [];
  if (pIds.length > 0 || prodIds.length > 0) {
    await sincronizarAsignaciones(id, pIds, prodIds);
  }

  return enriquecido;
}
