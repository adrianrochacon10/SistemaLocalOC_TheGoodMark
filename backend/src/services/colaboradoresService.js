import { supabase } from "../config/supabase.js";

const SELECT_COLABORADOR =
  "*, tipo_pago(id, nombre), pantalla:pantallas(id, nombre, precio), producto:productos(*)";

/** Pantalla interna para FK cuando el colaborador no tiene pantallas (si `pantalla_id` sigue NOT NULL en BD). */
const PANTALLA_SISTEMA_NOMBRE = "Sin pantalla (sistema)";

/** @returns {Promise<string>} */
async function obtenerIdPantallaSistema(userId) {
  const { data: existente, error: err1 } = await supabase
    .from("pantallas")
    .select("id")
    .eq("nombre", PANTALLA_SISTEMA_NOMBRE)
    .maybeSingle();
  if (err1) throw new Error(err1.message);
  if (existente?.id) return existente.id;

  const insertPayload = {
    nombre: PANTALLA_SISTEMA_NOMBRE,
    precio: 0,
  };
  if (userId) insertPayload.creado_por = userId;

  const { data: creada, error: err2 } = await supabase
    .from("pantallas")
    .insert(insertPayload)
    .select("id")
    .single();
  if (err2) {
    const { data: retry } = await supabase
      .from("pantallas")
      .select("id")
      .eq("nombre", PANTALLA_SISTEMA_NOMBRE)
      .maybeSingle();
    if (retry?.id) return retry.id;
    throw new Error(err2.message);
  }
  return creada.id;
}

function filtrarPantallaSistemaDeLista(pantallas) {
  const list = Array.isArray(pantallas) ? pantallas : [];
  return list.filter(
    (p) => String(p?.nombre ?? "").trim() !== PANTALLA_SISTEMA_NOMBRE,
  );
}

const leerPrecioProducto = (p) => {
  const n = Number(p?.precio ?? p?.precio_unitario ?? p?.precio_por_mes ?? 0);
  return Number.isFinite(n) ? n : 0;
};

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
  /** Si `pantalla_ids` viene [] pero hay `pantalla_id` (p. ej. placeholder), usar el id para cargar catálogo. */
  let pantallaIds = [];
  if (Array.isArray(colaborador?.pantalla_ids) && colaborador.pantalla_ids.length > 0) {
    pantallaIds = colaborador.pantalla_ids.map(String);
  } else if (colaborador?.pantalla_id) {
    pantallaIds = [String(colaborador.pantalla_id)];
  }
  const productoIds = Array.isArray(colaborador?.producto_ids)
    ? colaborador.producto_ids
    : colaborador?.producto_id
      ? [colaborador.producto_id]
      : [];

  const [pantallasRes, productosRes] = await Promise.all([
    pantallaIds.length
      ? supabase
          .from("pantallas")
          .select("id,nombre,precio")
          .in("id", pantallaIds)
      : Promise.resolve({
          data: colaborador?.pantalla ? [colaborador.pantalla] : [],
          error: null,
        }),
    productoIds.length
      ? supabase
          .from("productos")
          .select("*")
          .in("id", productoIds)
      : Promise.resolve({
          data: colaborador?.producto ? [colaborador.producto] : [],
          error: null,
        }),
  ]);

  if (pantallasRes.error) throw new Error(pantallasRes.error.message);
  if (productosRes.error) throw new Error(productosRes.error.message);

  const pantallasLista = filtrarPantallaSistemaDeLista(pantallasRes.data ?? []);

  return {
    ...colaborador,
    pantalla_ids: Array.isArray(colaborador?.pantalla_ids)
      ? colaborador.pantalla_ids
      : [],
    producto_ids: Array.isArray(colaborador?.producto_ids)
      ? colaborador.producto_ids
      : productoIds,
    pantallas: pantallasLista,
    productos: (productosRes.data ?? []).map((p) => ({
      ...p,
      precio: leerPrecioProducto(p),
    })),
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
  let pantallaId = pantallaIds[0] ?? null;
  const productoIds = toIdArray(body.producto_ids ?? body.producto_id);
  const productoId = productoIds[0] ?? null;
  if (!body.nombre?.trim()) return { error: "Nombre es obligatorio" };
  if (!tipoPagoId)
    return { error: "Tipo de pago es obligatorio (tipo_pago_id en el body)" };

  if (!pantallaId) {
    pantallaId = await obtenerIdPantallaSistema(userId);
  }

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
    let pid = pantallaIds[0] ?? null;
    if (!pid) {
      pid = await obtenerIdPantallaSistema(userId);
    }
    payload.pantalla_id = pid;
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
  const enriquecido = await enrichRelaciones(data);

  const pIds =
    payload.pantalla_ids !== undefined
      ? payload.pantalla_ids
      : Array.isArray(enriquecido.pantalla_ids)
        ? enriquecido.pantalla_ids
        : [];
  const prodIds =
    payload.producto_ids !== undefined
      ? payload.producto_ids
      : Array.isArray(enriquecido.producto_ids)
        ? enriquecido.producto_ids
        : [];
  await sincronizarAsignaciones(id, pIds, prodIds);

  return enriquecido;
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
  if (!count) throw new Error("Colaborador no encontrado");
  return { ok: true };
}
