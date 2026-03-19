import { supabase } from "../config/supabase.js";
import { sendEmail } from "../lib/email.js";

// Nota: asumimos que `ventas` ya no guarda `pantalla_id` ni `producto_id` y que ahora depende de `colaboradores`.
// Además, `ventas` ahora incluye: `client_name`, `precio_por_mes`, `costos`, `utilidad_neta`, `estado`.
const SELECT_VENTA =
  "*, colaborador:colaboradores(id, nombre, email, telefono, contacto, pantalla:pantallas(id, nombre), tipo_pago:tipo_pago(id, nombre), producto:productos(id, nombre, precio))";

function toNumberOrNull(value) {
  const n = value == null ? NaN : Number(value);
  return Number.isFinite(n) ? n : null;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

export async function listar() {
  const { data, error } = await supabase
    .from("ventas")
    .select(SELECT_VENTA)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function crear(body, vendedorId) {
  const colaboradorId = body.colaborador_id ?? body.cliente_id ?? body.clienteId ?? null;
  const estado = body.estado ?? body.estado_venta ?? null;

  if (!colaboradorId) return { error: "colaborador_id es obligatorio" };
  if (!estado) return { error: "estado es obligatorio" };
  if (!body.fecha_inicio || !body.fecha_fin) return { error: "fecha_inicio y fecha_fin son obligatorios" };
  if (body.duracion_meses == null) return { error: "duracion_meses es obligatorio" };

  // Precio por mes y costos (por mes)
  const precioPorMes =
    toNumberOrNull(body.precio_por_mes) ??
    toNumberOrNull(body.precioGeneral) ??
    toNumberOrNull(body.precio_unitario_manual);
  if (precioPorMes == null) return { error: "precio_por_mes (o precioGeneral/ precio_unitario_manual) es obligatorio" };

  const costos = toNumberOrNull(body.costos);
  if (costos == null) return { error: "costos (por mes) es obligatorio" };

  const modoVenta = body.modo_venta ?? null;
  const renovable = body.renovable ?? false;

  // `client_name` puede venir del body o derivarse desde colaboradores
  let clientName = String(body.client_name ?? "").trim();
  let tipoPagoId = body.tipo_pago_id ?? null;

  if (!clientName || !tipoPagoId) {
    const { data: colab, error: errColab } = await supabase
      .from("colaboradores")
      .select("id, nombre, tipo_pago_id")
      .eq("id", colaboradorId)
      .single();
    if (errColab || !colab) return { error: "Colaborador no encontrado" };

    if (!clientName) clientName = colab.nombre;
    if (!tipoPagoId) tipoPagoId = colab.tipo_pago_id;
  }

  if (!tipoPagoId) return { error: "tipo_pago_id no encontrado (en colaboradores o en el body)" };

  const utilidadNeta = round2(precioPorMes - costos);

  const insertPayload = {
    colaborador_id: colaboradorId,
    client_name: clientName,
    estado,
    fecha_inicio: body.fecha_inicio,
    fecha_fin: body.fecha_fin,
    duracion_meses: Number(body.duracion_meses),
    vendedor_id: vendedorId,
    modo_venta: modoVenta,
    tipo_pago_id: tipoPagoId,
    renovable,

    precio_por_mes: round2(precioPorMes),
    costos: round2(costos),
    utilidad_neta: utilidadNeta,
  };

  const { data, error } = await supabase
    .from("ventas")
    .insert(insertPayload)
    .select(SELECT_VENTA)
    .single();
  if (error) throw new Error(error.message);

  // Notificaciones (best-effort)
  try {
    const { data: perfilesAdmins } = await supabase
      .from("perfiles")
      .select("email")
      .eq("rol", "admin");

    const { data: perfilVendedor } = await supabase
      .from("perfiles")
      .select("email")
      .eq("id", vendedorId)
      .single();

    const destinatarios = new Set();
    for (const p of perfilesAdmins || []) if (p.email) destinatarios.add(p.email);
    if (perfilVendedor?.email) destinatarios.add(perfilVendedor.email);
    if (data?.colaborador?.email) destinatarios.add(data.colaborador.email);

    const nombreCliente = data?.client_name || data?.colaborador?.nombre || "Sin nombre";
    const asunto = `Nueva venta registrada - ${nombreCliente}`;
    const texto = [
      "Se ha registrado una nueva venta en The Good Mark.",
      "",
      `Colaborador: ${nombreCliente}`,
      `Precio por mes: $${(data?.precio_por_mes ?? 0).toFixed(2)}`,
      `Costos (por mes): $${(data?.costos ?? 0).toFixed(2)}`,
      `Utilidad neta (por mes): $${(data?.utilidad_neta ?? 0).toFixed(2)}`,
      `Estado: ${data?.estado}`,
      `Fechas: ${data?.fecha_inicio} al ${data?.fecha_fin}`,
      `Meses: ${data?.duracion_meses}`,
    ].join("\n");

    const html = `
      <p>Se ha registrado una nueva venta en <strong>The Good Mark</strong>.</p>
      <ul>
        <li><strong>Colaborador:</strong> ${nombreCliente}</li>
        <li><strong>Precio por mes:</strong> $${(data?.precio_por_mes ?? 0).toFixed(2)}</li>
        <li><strong>Costos (por mes):</strong> $${(data?.costos ?? 0).toFixed(2)}</li>
        <li><strong>Utilidad neta (por mes):</strong> $${(data?.utilidad_neta ?? 0).toFixed(2)}</li>
        <li><strong>Estado:</strong> ${data?.estado}</li>
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

  return { data };
}

export async function actualizar(id, body) {
  const payload = { updated_at: new Date().toISOString() };

  const estado = body.estado ?? body.estado_venta;
  if (estado !== undefined) payload.estado = estado;

  if (body.fecha_inicio !== undefined) payload.fecha_inicio = body.fecha_inicio;
  if (body.fecha_fin !== undefined) payload.fecha_fin = body.fecha_fin;
  if (body.duracion_meses !== undefined) payload.duracion_meses = Number(body.duracion_meses);

  if (body.modo_venta !== undefined) payload.modo_venta = body.modo_venta;
  if (body.renovable !== undefined) payload.renovable = body.renovable;
  if (body.tipo_pago_id !== undefined) payload.tipo_pago_id = body.tipo_pago_id;

  // Precio y costos => utilidad_neta (recalcular si aplica)
  const precioPorMes =
    body.precio_por_mes !== undefined
      ? toNumberOrNull(body.precio_por_mes)
      : undefined;
  const costos = body.costos !== undefined ? toNumberOrNull(body.costos) : undefined;

  if (precioPorMes !== undefined) {
    if (precioPorMes == null) throw new Error("precio_por_mes debe ser un número");
    payload.precio_por_mes = round2(precioPorMes);
  }
  if (costos !== undefined) {
    if (costos == null) throw new Error("costos debe ser un número");
    payload.costos = round2(costos);
  }

  if (payload.precio_por_mes !== undefined && payload.costos !== undefined) {
    payload.utilidad_neta = round2(payload.precio_por_mes - payload.costos);
  }

  const { data, error } = await supabase
    .from("ventas")
    .update(payload)
    .eq("id", id)
    .select(SELECT_VENTA)
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Venta no encontrada");
  return data;
}

export async function renovar(id, body) {
  const { data: venta, error: errVenta } = await supabase
    .from("ventas")
    .select("*")
    .eq("id", id)
    .single();

  if (errVenta || !venta) throw new Error("Venta no encontrada");

  const nuevaInicio = body.fecha_inicio ?? body.fecha_inicio_nueva;
  const nuevaFin = body.fecha_fin ?? body.fecha_fin_nueva;
  const duracion = body.duracion_meses ?? venta.duracion_meses;

  if (!nuevaInicio || !nuevaFin) return { error: "fecha_inicio y fecha_fin obligatorios" };

  const precioPorMes = toNumberOrNull(body.precio_por_mes) ?? toNumberOrNull(venta.precio_por_mes) ?? 0;
  const costos = toNumberOrNull(body.costos) ?? toNumberOrNull(venta.costos) ?? 0;
  const utilidadNeta = round2(precioPorMes - costos);

  const { data, error } = await supabase
    .from("ventas")
    .insert({
      colaborador_id: venta.colaborador_id,
      client_name: venta.client_name,
      precio_por_mes: round2(precioPorMes),
      costos: round2(costos),
      utilidad_neta,

      estado: "aceptado",

      fecha_inicio: nuevaInicio,
      fecha_fin: nuevaFin,
      duracion_meses: Number(duracion),
      vendedor_id: venta.vendedor_id,
      modo_venta: venta.modo_venta ?? null,
      tipo_pago_id: venta.tipo_pago_id,
      renovable: false,
    })
    .select(SELECT_VENTA)
    .single();

  if (error) throw new Error(error.message);
  return { data };
}

