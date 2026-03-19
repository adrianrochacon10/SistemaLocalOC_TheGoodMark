import { supabase } from "../config/supabase.js";
import { sendEmail } from "../lib/email.js";

/** Pantalla y producto en colaboradores; ventas solo guardan colaborador_id */
const SELECT_VENTA =
  "*, colaborador:colaboradores(id, nombre, email, telefono, pantalla_id, producto_id, pantalla:pantallas(id, nombre), producto:productos(id, nombre, precio)), tipo_pago(id, nombre), orden_de_compra:orden_de_compra(id, mes, anio, subtotal, iva, total)";

/** Acepta colaborador_id; cliente_id solo como alias temporal */
function idColaborador(body) {
  const id = body.colaborador_id ?? body.cliente_id;
  return id != null && String(id).trim() ? String(id).trim() : null;
}

/** Body puede enviar estado_venta o estado (alias) */
function estadoVentaFromBody(body) {
  const raw = body.estado_venta ?? body.estado;
  return raw != null ? String(raw).toLowerCase().trim() : "";
}

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

export async function listar(query = {}) {
  let q = supabase.from("ventas").select(SELECT_VENTA).order("created_at", { ascending: false });
  const { mes, anio, orden_de_compra_id, orden_mes_id } = query;
  const ocId = orden_de_compra_id ?? orden_mes_id;
  if (ocId) q = q.eq("orden_de_compra_id", ocId);
  if (mes != null && anio != null) {
    const m = Number(mes);
    const a = Number(anio);
    if (m >= 1 && m <= 12 && a) {
      const inicio = `${a}-${String(m).padStart(2, "0")}-01`;
      const finStr = new Date(a, m, 0).toISOString().slice(0, 10);
      q = q.gte("fecha_inicio", inicio).lte("fecha_fin", finStr);
    }
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function crear(body, vendedorId) {
  const colabId = idColaborador(body);
  if (!colabId) return { error: "colaborador_id es obligatorio" };

  const estadoRaw = estadoVentaFromBody(body);
  if (!estadoRaw) return { error: "estado_venta es obligatorio (o alias estado)" };
  if (!body.fecha_inicio || !body.fecha_fin) return { error: "Fecha inicio y fin son obligatorias" };
  if (body.duracion_meses == null) return { error: "Duracion meses es obligatoria" };

  const { data: colab, error: errColab } = await supabase
    .from("colaboradores")
    .select("nombre, tipo_pago_id, pantalla_id, producto_id")
    .eq("id", colabId)
    .single();
  if (errColab || !colab) return { error: "Colaborador no encontrado" };
  if (!colab.pantalla_id) return { error: "El colaborador debe tener pantalla asignada" };
  if (!colab.producto_id) return { error: "El colaborador debe tener producto asignado" };

  let tipoPagoId = body.tipo_pago_id;
  if (!tipoPagoId) tipoPagoId = colab.tipo_pago_id;

  const estadosPermitidos = ["prospecto", "aceptado", "rechazado"];
  if (!estadosPermitidos.includes(estadoRaw)) {
    return { error: "estado_venta debe ser prospecto, aceptado o rechazado" };
  }

  const duracionMeses = Number(body.duracion_meses);
  if (!Number.isFinite(duracionMeses) || duracionMeses <= 0) {
    return { error: "Duracion meses debe ser un numero mayor a 0" };
  }

  let precioBase = 0;
  let fuentePrecio = null;

  const { data: producto, error: errProd } = await supabase
    .from("productos")
    .select("precio")
    .eq("id", colab.producto_id)
    .single();
  if (errProd || !producto) return { error: "Producto del colaborador no encontrado" };
  precioBase = Number(producto.precio);
  fuentePrecio = "producto";

  const { data: tipoPago } = await supabase
    .from("tipo_pago")
    .select("id, nombre")
    .eq("id", tipoPagoId)
    .single();

  let precioTotal = precioBase;
  let tipoPagoAplicado = tipoPago?.nombre ?? "precio fijo";

  if (tipoPago?.nombre === "porcentaje") {
    const { data: pct } = await supabase
      .from("porcentajes")
      .select("valor")
      .eq("tipo_pago_id", tipoPagoId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pct?.valor != null) {
      precioTotal = (precioBase * Number(pct.valor)) / 100;
      tipoPagoAplicado = `porcentaje (${pct.valor}%)`;
    }
  } else if (tipoPago?.nombre === "consideracion" || tipoPago?.nombre === "ninguno") {
    precioTotal = 0;
    tipoPagoAplicado = tipoPago.nombre;
  }

  precioTotal = roundMoney(precioTotal);

  let precioPorMes =
    body.precio_por_mes != null && body.precio_por_mes !== ""
      ? roundMoney(Number(body.precio_por_mes))
      : roundMoney(precioTotal / duracionMeses);

  const costos =
    body.costos != null && body.costos !== "" ? Math.max(0, roundMoney(Number(body.costos))) : 0;

  let utilidadNeta;
  if (body.utilidad_neta != null && body.utilidad_neta !== "") {
    utilidadNeta = roundMoney(Number(body.utilidad_neta));
  } else {
    utilidadNeta = roundMoney(precioTotal - costos);
  }

  const clientName =
    body.client_name != null && String(body.client_name).trim()
      ? String(body.client_name).trim()
      : colab.nombre ?? null;

  const insertPayload = {
    colaborador_id: colabId,
    client_name: clientName,
    precio_total: precioTotal,
    precio_por_mes: precioPorMes,
    costos,
    utilidad_neta: utilidadNeta,
    estado_venta: estadoRaw,
    fecha_inicio: body.fecha_inicio,
    fecha_fin: body.fecha_fin,
    duracion_meses: duracionMeses,
    vendedor_id: vendedorId,
    tipo_pago_id: tipoPagoId,
    renovable: body.renovable ?? false,
    comisiones:
      body.comisiones != null && body.comisiones !== ""
        ? Math.max(0, Number(body.comisiones) || 0)
        : null,
  };

  const { data, error } = await supabase
    .from("ventas")
    .insert(insertPayload)
    .select(SELECT_VENTA)
    .single();
  if (error) throw new Error(error.message);

  const respuesta = {
    ...data,
    precio_base: roundMoney(precioBase),
    precio_total: precioTotal,
    tipo_pago_aplicado: tipoPagoAplicado,
    fuente_precio: fuentePrecio,
  };

  try {
    const { data: perfilesAdmins } = await supabase.from("perfiles").select("email").eq("rol", "admin");
    const { data: perfilVendedor } = await supabase.from("perfiles").select("email").eq("id", vendedorId).single();
    const destinatarios = new Set();
    for (const p of perfilesAdmins || []) {
      if (p.email) destinatarios.add(p.email);
    }
    if (perfilVendedor?.email) destinatarios.add(perfilVendedor.email);
    if (data?.colaborador?.email) destinatarios.add(data.colaborador.email);

    const ev = data?.estado_venta ?? data?.estado;
    const asunto = `Nueva venta registrada - ${data?.client_name || data?.colaborador?.nombre || "Sin nombre"}`;
    const texto = [
      "Se ha registrado una nueva venta en The Good Mark.",
      "",
      `Cliente (nombre): ${data?.client_name || "N/D"}`,
      `Colaborador: ${data?.colaborador?.nombre || "N/D"}`,
      `Pantalla: ${data?.colaborador?.pantalla?.nombre || "N/D"}`,
      `Producto: ${data?.colaborador?.producto?.nombre || "N/D"}`,
      `Precio total: $${(data?.precio_total ?? 0).toFixed(2)}`,
      `Precio / mes: $${(data?.precio_por_mes ?? 0).toFixed(2)}`,
      `Costos: $${(data?.costos ?? 0).toFixed(2)}`,
      `Utilidad neta: $${(data?.utilidad_neta ?? 0).toFixed(2)}`,
      `Estado: ${ev}`,
      `Fechas: ${data?.fecha_inicio} al ${data?.fecha_fin}`,
      `Meses: ${data?.duracion_meses}`,
    ].join("\n");
    const html = `
      <p>Se ha registrado una nueva venta en <strong>The Good Mark</strong>.</p>
      <ul>
        <li><strong>Cliente (nombre):</strong> ${data?.client_name || "N/D"}</li>
        <li><strong>Colaborador:</strong> ${data?.colaborador?.nombre || "N/D"}</li>
        <li><strong>Pantalla:</strong> ${data?.colaborador?.pantalla?.nombre || "N/D"}</li>
        <li><strong>Producto:</strong> ${data?.colaborador?.producto?.nombre || "N/D"}</li>
        <li><strong>Precio total:</strong> $${(data?.precio_total ?? 0).toFixed(2)}</li>
        <li><strong>Precio / mes:</strong> $${(data?.precio_por_mes ?? 0).toFixed(2)}</li>
        <li><strong>Costos:</strong> $${(data?.costos ?? 0).toFixed(2)}</li>
        <li><strong>Utilidad neta:</strong> $${(data?.utilidad_neta ?? 0).toFixed(2)}</li>
        <li><strong>Estado:</strong> ${ev}</li>
        <li><strong>Fechas:</strong> ${data?.fecha_inicio} al ${data?.fecha_fin}</li>
        <li><strong>Meses:</strong> ${data?.duracion_meses}</li>
      </ul>
    `;
    for (const email of destinatarios) {
      await sendEmail(email, asunto, texto, html);
    }
  } catch (e) {
    console.error("[VENTAS] Error enviando notificaciones de venta:", e?.message || e);
  }

  return { data: respuesta };
}

export async function actualizar(id, body) {
  const payload = { updated_at: new Date().toISOString() };
  if (body.estado_venta !== undefined || body.estado !== undefined) {
    const ev = estadoVentaFromBody(body);
    if (!ev) throw new Error("estado_venta vacío");
    const estadosPermitidos = ["prospecto", "aceptado", "rechazado"];
    if (!estadosPermitidos.includes(ev)) {
      throw new Error("estado_venta debe ser prospecto, aceptado o rechazado");
    }
    payload.estado_venta = ev;
  }
  if (body.fecha_inicio !== undefined) payload.fecha_inicio = body.fecha_inicio;
  if (body.fecha_fin !== undefined) payload.fecha_fin = body.fecha_fin;
  if (body.duracion_meses !== undefined) payload.duracion_meses = body.duracion_meses;
  if (body.tipo_pago_id !== undefined) payload.tipo_pago_id = body.tipo_pago_id;
  if (body.renovable !== undefined) payload.renovable = body.renovable;
  if (body.precio_total !== undefined) payload.precio_total = Math.max(0, Number(body.precio_total) || 0);
  if (body.precio_por_mes !== undefined)
    payload.precio_por_mes =
      body.precio_por_mes != null && body.precio_por_mes !== ""
        ? roundMoney(Number(body.precio_por_mes))
        : null;
  if (body.costos !== undefined)
    payload.costos = body.costos != null && body.costos !== "" ? Math.max(0, roundMoney(Number(body.costos))) : 0;
  if (body.utilidad_neta !== undefined)
    payload.utilidad_neta =
      body.utilidad_neta != null && body.utilidad_neta !== "" ? roundMoney(Number(body.utilidad_neta)) : null;
  if (body.client_name !== undefined) payload.client_name = body.client_name?.trim() || null;
  if (body.comisiones !== undefined)
    payload.comisiones =
      body.comisiones != null && body.comisiones !== ""
        ? Math.max(0, Number(body.comisiones) || 0)
        : null;

  const { data, error } = await supabase.from("ventas").update(payload).eq("id", id).select(SELECT_VENTA).single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Venta no encontrada");
  return data;
}

export async function renovar(id, body) {
  const { data: venta, error: errVenta } = await supabase.from("ventas").select("*").eq("id", id).single();
  if (errVenta || !venta) throw new Error("Venta no encontrada");
  const nuevaInicio = body.fecha_inicio || body.fecha_inicio_nueva;
  const nuevaFin = body.fecha_fin || body.fecha_fin_nueva;
  const duracion = body.duracion_meses ?? venta.duracion_meses;
  if (!nuevaInicio || !nuevaFin) return { error: "fecha_inicio y fecha_fin obligatorios" };

  const colabFk = venta.colaborador_id ?? venta.cliente_id;
  if (!colabFk) throw new Error("Venta sin colaborador asociado");

  const { data, error } = await supabase
    .from("ventas")
    .insert({
      colaborador_id: colabFk,
      client_name: venta.client_name ?? null,
      precio_total: venta.precio_total ?? 0,
      precio_por_mes: venta.precio_por_mes ?? null,
      costos: venta.costos ?? 0,
      utilidad_neta: venta.utilidad_neta ?? null,
      estado_venta: "aceptado",
      fecha_inicio: nuevaInicio,
      fecha_fin: nuevaFin,
      duracion_meses: duracion,
      vendedor_id: venta.vendedor_id,
      tipo_pago_id: venta.tipo_pago_id,
      renovable: false,
      comisiones: venta.comisiones ?? null,
    })
    .select(SELECT_VENTA)
    .single();
  if (error) throw new Error(error.message);
  return { data };
}
