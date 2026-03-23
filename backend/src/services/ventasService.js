import { supabase } from "../config/supabase.js";
import { sendEmail } from "../lib/email.js";

const SELECT_VENTAS =
  "*, colaborador:colaboradores(id,nombre,email,telefono,contacto,tipo_pago:tipo_pago(id,nombre),pantalla:pantallas(id,nombre),producto:productos(id,nombre,precio)), tipo_pago(id,nombre), orden:orden_de_compra(id,mes,anio,subtotal,iva,total)";

export async function listar() {
  const { data, error } = await supabase.from("ventas").select(SELECT_VENTAS).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function crear(body, vendedorId) {
  const colaboradorId = body.colaborador_id;
  const pantallaId = body.pantalla_id;
  const estadoVenta = body.estado_venta ?? body.estado;

  if (!colaboradorId) return { error: "Colaborador es obligatorio" };
  if (!pantallaId) return { error: "Pantalla es obligatoria" };
  if (!estadoVenta) return { error: "Estado de venta es obligatorio" };
  if (!body.fecha_inicio || !body.fecha_fin) return { error: "Fecha inicio y fin son obligatorias" };
  if (body.duracion_meses == null) return { error: "Duracion meses es obligatoria" };

  const duracionMeses = Number(body.duracion_meses);
  if (!Number.isFinite(duracionMeses) || duracionMeses <= 0) return { error: "duracion_meses debe ser > 0" };

  const costos = body.costos ?? body.costos_venta ?? body.costo_venta;
  if (costos == null || !Number.isFinite(Number(costos)) || Number(costos) < 0) return { error: "costos (ventas) es obligatorio (>= 0)" };

  let precioPorMes =
    body.precio_por_mes ??
    body.precio_unitario_manual ??
    body.precio_unitario ??
    null;

  precioPorMes = precioPorMes != null && precioPorMes !== "" ? Number(precioPorMes) : null;
  if (precioPorMes != null && (!Number.isFinite(precioPorMes) || precioPorMes < 0)) return { error: "precio_por_mes (ventas) debe ser un numero >= 0" };

  const comisiones = Number(body.comisiones ?? body.comision ?? body.comision_total ?? 0);
  const descuento = Number(body.descuento ?? 0);

  const renovable = body.renovable ?? false;

  const { data: colaborador, error: errColab } = await supabase
    .from("colaboradores")
    .select("id,nombre,tipo_pago_id,producto_id")
    .eq("id", colaboradorId)
    .single();
  if (errColab || !colaborador) return { error: "Colaborador no encontrado" };

  if (precioPorMes == null) {
    const { data: producto, error: errProd } = await supabase
      .from("productos")
      .select("precio")
      .eq("id", colaborador.producto_id)
      .single();
    if (errProd || !producto) return { error: "Producto del colaborador no encontrado" };
    precioPorMes = Number(producto.precio);
  }

  const precioTotal = Math.round(precioPorMes * duracionMeses * 100) / 100;
  const utilidadNeta = Math.round((precioPorMes - Number(costos)) * 100) / 100;

  const insertPayload = {
    colaborador_id: colaboradorId,
    pantalla_id: pantallaId,
    client_name: colaborador.nombre, // snapshot del nombre al crear
    estado_venta: estadoVenta,
    fecha_inicio: body.fecha_inicio,
    fecha_fin: body.fecha_fin,
    duracion_meses: duracionMeses,
    vendedor_id: vendedorId,
    tipo_pago_id: colaborador.tipo_pago_id,
    renovable,
    precio_por_mes: Math.round(precioPorMes * 100) / 100,
    costos: Math.round(Number(costos) * 100) / 100,
    utilidad_neta: utilidadNeta,
    precio_total: precioTotal,
    comisiones: Number.isFinite(comisiones) && comisiones >= 0 ? Math.round(comisiones * 100) / 100 : 0,
    descuento: Number.isFinite(descuento) && descuento >= 0 ? Math.round(descuento * 100) / 100 : 0,
  };

  const { data, error } = await supabase.from("ventas").insert(insertPayload).select(SELECT_VENTAS).single();
  if (error) throw new Error(error.message);

  try {
    const n = (x) => (x == null || Number.isNaN(Number(x)) ? 0 : Number(x));
    const { data: perfilesAdmins } = await supabase.from("perfiles").select("email").eq("rol", "admin");
    const { data: perfilVendedor } = await supabase.from("perfiles").select("email").eq("id", vendedorId).single();

    const destinatarios = new Set();
    for (const p of perfilesAdmins || []) if (p.email) destinatarios.add(p.email);
    if (perfilVendedor?.email) destinatarios.add(perfilVendedor.email);
    if (colaborador?.email) destinatarios.add(colaborador.email);

    const asunto = `Nueva venta registrada - ${data?.client_name || data?.colaborador?.nombre || "Sin nombre"}`;
    const texto = [
      "Se ha registrado una nueva venta en The Good Mark.",
      "",
      `Cliente (snapshot): ${data?.client_name || "N/D"}`,
      `Pantalla: ${data?.colaborador?.pantalla?.nombre || "N/D"}`,
      `Producto: ${data?.colaborador?.producto?.nombre || "N/D"}`,
      `Precio por mes: $${n(data?.precio_por_mes).toFixed(2)}`,
      `Costos: $${n(data?.costos).toFixed(2)}`,
      `Utilidad neta: $${n(data?.utilidad_neta).toFixed(2)}`,
      `Precio total: $${n(data?.precio_total).toFixed(2)}`,
      `Comisiones: $${n(data?.comisiones).toFixed(2)}`,
      `Descuento: $${n(data?.descuento).toFixed(2)}`,
      `Estado: ${data?.estado_venta}`,
      `Fechas: ${data?.fecha_inicio} al ${data?.fecha_fin}`,
      `Meses: ${data?.duracion_meses}`,
    ].join("\n");

    const html = `
      <p>Se ha registrado una nueva venta en <strong>The Good Mark</strong>.</p>
      <ul>
        <li><strong>Cliente (snapshot):</strong> ${data?.client_name || "N/D"}</li>
        <li><strong>Pantalla:</strong> ${data?.colaborador?.pantalla?.nombre || "N/D"}</li>
        <li><strong>Producto:</strong> ${data?.colaborador?.producto?.nombre || "N/D"}</li>
        <li><strong>Precio por mes:</strong> $${n(data?.precio_por_mes).toFixed(2)}</li>
        <li><strong>Costos:</strong> $${n(data?.costos).toFixed(2)}</li>
        <li><strong>Utilidad neta:</strong> $${n(data?.utilidad_neta).toFixed(2)}</li>
        <li><strong>Precio total:</strong> $${n(data?.precio_total).toFixed(2)}</li>
        <li><strong>Comisiones:</strong> $${n(data?.comisiones).toFixed(2)}</li>
        <li><strong>Descuento:</strong> $${n(data?.descuento).toFixed(2)}</li>
        <li><strong>Estado:</strong> ${data?.estado_venta}</li>
        <li><strong>Fechas:</strong> ${data?.fecha_inicio} al ${data?.fecha_fin}</li>
        <li><strong>Meses:</strong> ${data?.duracion_meses}</li>
      </ul>
    `;

    for (const email of destinatarios) await sendEmail(email, asunto, texto, html);
  } catch (e) {
    console.error("[VENTAS] Error enviando notificaciones de venta:", e?.message || e);
  }

  return { data };
}

export async function actualizar(id, body) {
  const { data: venta, error: errVenta } = await supabase.from("ventas").select("*").eq("id", id).single();
  if (errVenta || !venta) throw new Error("Venta no encontrada");

  const payload = { updated_at: new Date().toISOString() };

  const colaboradorId = body.colaborador_id;
  let duracionMeses = body.duracion_meses != null ? Number(body.duracion_meses) : venta.duracion_meses;
  if (!Number.isFinite(duracionMeses) || duracionMeses <= 0) throw new Error("duracion_meses debe ser > 0");

  let precioPorMes =
    body.precio_por_mes ?? body.precio_unitario_manual ?? venta.precio_por_mes;

  precioPorMes = precioPorMes != null && precioPorMes !== "" ? Number(precioPorMes) : null;

  let costos = body.costos ?? body.costos_venta ?? body.costo_venta ?? venta.costos;
  costos = costos != null && costos !== "" ? Number(costos) : null;

  // Estado (compatibilidad con el nombre viejo)
  if (body.estado_venta !== undefined) payload.estado_venta = body.estado_venta;
  else if (body.estado !== undefined) payload.estado_venta = body.estado;

  if (body.fecha_inicio !== undefined) payload.fecha_inicio = body.fecha_inicio;
  if (body.fecha_fin !== undefined) payload.fecha_fin = body.fecha_fin;
  if (body.duracion_meses !== undefined) payload.duracion_meses = duracionMeses;
  if (body.renovable !== undefined) payload.renovable = body.renovable;

  if (colaboradorId) {
    const { data: colaborador, error: errColab } = await supabase
      .from("colaboradores")
      .select("id,nombre,tipo_pago_id,producto_id")
      .eq("id", colaboradorId)
      .single();
    if (errColab || !colaborador) throw new Error("Colaborador no encontrado");

    payload.colaborador_id = colaboradorId;
    payload.client_name = colaborador.nombre;
    payload.tipo_pago_id = colaborador.tipo_pago_id;

    // Si no viene precio_por_mes explícito, lo extraemos del producto del colaborador.
    if (precioPorMes == null) {
      const { data: producto, error: errProd } = await supabase.from("productos").select("precio").eq("id", colaborador.producto_id).single();
      if (errProd || !producto) throw new Error("Producto del colaborador no encontrado");
      precioPorMes = Number(producto.precio);
    }
  }

  const tieneCambiosPrecio =
    body.precio_por_mes !== undefined ||
    body.precio_unitario_manual !== undefined ||
    body.costos !== undefined ||
    body.costos_venta !== undefined ||
    body.costo_venta !== undefined ||
    body.duracion_meses !== undefined ||
    !!colaboradorId;

  if (tieneCambiosPrecio) {
    if (precioPorMes == null || !Number.isFinite(precioPorMes) || precioPorMes < 0) throw new Error("precio_por_mes (ventas) debe ser >= 0");
    if (costos == null || !Number.isFinite(costos) || costos < 0) throw new Error("costos (ventas) debe ser >= 0");

    payload.precio_por_mes = Math.round(precioPorMes * 100) / 100;
    payload.costos = Math.round(costos * 100) / 100;
    payload.utilidad_neta = Math.round((precioPorMes - costos) * 100) / 100;
    payload.precio_total = Math.round(precioPorMes * duracionMeses * 100) / 100;
  }

  if (body.comisiones !== undefined || body.comision !== undefined || body.comision_total !== undefined) {
    const c = Number(body.comisiones ?? body.comision ?? body.comision_total);
    if (!Number.isFinite(c) || c < 0) throw new Error("comisiones debe ser un numero >= 0");
    payload.comisiones = Math.round(c * 100) / 100;
  }
  if (body.descuento !== undefined) {
    const d = Number(body.descuento);
    if (!Number.isFinite(d) || d < 0) throw new Error("descuento debe ser un numero >= 0");
    payload.descuento = Math.round(d * 100) / 100;
  }

  const { data, error } = await supabase.from("ventas").update(payload).eq("id", id).select(SELECT_VENTAS).single();
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

  const { data: colaborador, error: errColab } = await supabase
    .from("colaboradores")
    .select("id,nombre,tipo_pago_id,producto_id")
    .eq("id", venta.colaborador_id)
    .single();
  if (errColab || !colaborador) return { error: "Colaborador no encontrado" };

  let precioPorMes = venta.precio_por_mes;
  if (precioPorMes == null) {
    const { data: producto, error: errProd } = await supabase.from("productos").select("precio").eq("id", colaborador.producto_id).single();
    if (errProd || !producto) return { error: "Producto del colaborador no encontrado" };
    precioPorMes = Number(producto.precio);
  }

  const costos = venta.costos ?? 0;
  const utilidadNeta = Math.round((Number(precioPorMes) - Number(costos)) * 100) / 100;
  const precioTotal = Math.round(Number(precioPorMes) * Number(duracion) * 100) / 100;

  const comisionesRen =
    body.comisiones != null || body.comision != null || body.comision_total != null
      ? Number(body.comisiones ?? body.comision ?? body.comision_total)
      : Number(venta.comisiones ?? 0);
  const descuentoRen =
    body.descuento != null ? Number(body.descuento) : Number(venta.descuento ?? 0);

  const insertPayload = {
    colaborador_id: venta.colaborador_id,
    client_name: colaborador.nombre,
    estado_venta: "aceptado",
    fecha_inicio: nuevaInicio,
    fecha_fin: nuevaFin,
    duracion_meses: Number(duracion),
    vendedor_id: venta.vendedor_id,
    tipo_pago_id: colaborador.tipo_pago_id ?? venta.tipo_pago_id,
    renovable: false,
    precio_por_mes: Math.round(Number(precioPorMes) * 100) / 100,
    costos: Math.round(Number(costos) * 100) / 100,
    utilidad_neta: utilidadNeta,
    precio_total: precioTotal,
    comisiones: Number.isFinite(comisionesRen) && comisionesRen >= 0 ? Math.round(comisionesRen * 100) / 100 : 0,
    descuento: Number.isFinite(descuentoRen) && descuentoRen >= 0 ? Math.round(descuentoRen * 100) / 100 : 0,
  };

  const { data, error } = await supabase.from("ventas").insert(insertPayload).select(SELECT_VENTAS).single();
  if (error) throw new Error(error.message);
  return { data };
}
