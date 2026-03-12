import { supabase } from "../config/supabase.js";
import { sendEmail } from "../lib/email.js";

const SELECT_VENTA =
  "*, cliente:clientes(id, nombre, email, telefono), pantalla:pantallas(id, nombre, direccion), producto:productos(id, nombre, precio), tipo_pago(id, nombre)";

export async function listar() {
  const { data, error } = await supabase
    .from("ventas")
    .select(SELECT_VENTA)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function crear(body, vendedorId) {
  if (!body.cliente_id) return { error: "Cliente es obligatorio" };
  if (!body.estado) return { error: "Estado de venta es obligatorio" };
  if (!body.pantalla_id) return { error: "Pantalla es obligatoria" };
  if (!body.fecha_inicio || !body.fecha_fin) return { error: "Fecha inicio y fin son obligatorias" };
  if (body.duracion_meses == null) return { error: "Duracion meses es obligatoria" };

  let tipoPagoId = body.tipo_pago_id;
  if (!tipoPagoId) {
    const { data: cliente, error: errCli } = await supabase
      .from("clientes")
      .select("tipo_pago_id")
      .eq("id", body.cliente_id)
      .single();
    if (errCli || !cliente) return { error: "Cliente no encontrado" };
    tipoPagoId = cliente.tipo_pago_id;
  }

  const cantidad = Math.max(1, Number(body.cantidad) || 1);
  let precioBase = 0;
  let fuentePrecio = null;

  if (body.precio_unitario_manual != null && body.precio_unitario_manual !== "" && Number(body.precio_unitario_manual) >= 0) {
    precioBase = cantidad * Number(body.precio_unitario_manual);
    fuentePrecio = "precio_venta";
  } else if (body.producto_id) {
    const { data: producto, error: errProd } = await supabase
      .from("productos")
      .select("precio")
      .eq("id", body.producto_id)
      .single();
    if (errProd || !producto) return { error: "Producto no encontrado" };
    precioBase = cantidad * Number(producto.precio);
    fuentePrecio = "producto";
  }

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

  const insertPayload = {
    cliente_id: body.cliente_id,
    producto_id: body.producto_id ?? null,
    cantidad,
    precio_unitario_manual:
      body.precio_unitario_manual != null && body.precio_unitario_manual !== ""
        ? Number(body.precio_unitario_manual)
        : null,
    precio_total: Math.round(precioTotal * 100) / 100,
    estado: body.estado,
    pantalla_id: body.pantalla_id,
    fecha_inicio: body.fecha_inicio,
    fecha_fin: body.fecha_fin,
    duracion_meses: Number(body.duracion_meses),
    vendedor_id: vendedorId,
    modo_venta: body.modo_venta ?? null,
    tipo_pago_id: tipoPagoId,
    renovable: body.renovable ?? false,
  };

  const { data, error } = await supabase
    .from("ventas")
    .insert(insertPayload)
    .select(SELECT_VENTA)
    .single();
  if (error) throw new Error(error.message);

  const respuesta = {
    ...data,
    precio_base: Math.round(precioBase * 100) / 100,
    precio_total: Math.round(precioTotal * 100) / 100,
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
    if (data?.cliente?.email) destinatarios.add(data.cliente.email);

    const asunto = `Nueva venta registrada - ${data?.cliente?.nombre || "Sin nombre"}`;
    const texto = [
      "Se ha registrado una nueva venta en The Good Mark.",
      "",
      `Cliente: ${data?.cliente?.nombre || "N/D"}`,
      `Pantalla: ${data?.pantalla?.nombre || "N/D"}`,
      `Producto: ${data?.producto?.nombre || "N/D"}`,
      `Cantidad: ${data?.cantidad ?? 1}`,
      `Precio total: $${(data?.precio_total ?? 0).toFixed(2)}`,
      `Estado: ${data?.estado}`,
      `Fechas: ${data?.fecha_inicio} al ${data?.fecha_fin}`,
      `Meses: ${data?.duracion_meses}`,
    ].join("\n");
    const html = `
      <p>Se ha registrado una nueva venta en <strong>The Good Mark</strong>.</p>
      <ul>
        <li><strong>Cliente:</strong> ${data?.cliente?.nombre || "N/D"}</li>
        <li><strong>Pantalla:</strong> ${data?.pantalla?.nombre || "N/D"}</li>
        <li><strong>Producto:</strong> ${data?.producto?.nombre || "N/D"}</li>
        <li><strong>Cantidad:</strong> ${data?.cantidad ?? 1}</li>
        <li><strong>Precio total:</strong> $${(data?.precio_total ?? 0).toFixed(2)}</li>
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

  return { data: respuesta };
}

export async function actualizar(id, body) {
  const payload = { updated_at: new Date().toISOString() };
  if (body.estado !== undefined) payload.estado = body.estado;
  if (body.fecha_inicio !== undefined) payload.fecha_inicio = body.fecha_inicio;
  if (body.fecha_fin !== undefined) payload.fecha_fin = body.fecha_fin;
  if (body.duracion_meses !== undefined) payload.duracion_meses = body.duracion_meses;
  if (body.modo_venta !== undefined) payload.modo_venta = body.modo_venta;
  if (body.tipo_pago_id !== undefined) payload.tipo_pago_id = body.tipo_pago_id;
  if (body.renovable !== undefined) payload.renovable = body.renovable;
  if (body.producto_id !== undefined) payload.producto_id = body.producto_id || null;
  if (body.cantidad !== undefined) payload.cantidad = Math.max(1, Number(body.cantidad) || 1);
  if (body.precio_unitario_manual !== undefined)
    payload.precio_unitario_manual = body.precio_unitario_manual != null ? Number(body.precio_unitario_manual) : null;
  if (body.precio_total !== undefined) payload.precio_total = Math.max(0, Number(body.precio_total) || 0);

  const { data, error } = await supabase.from("ventas").update(payload).eq("id", id).select().single();
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

  const { data, error } = await supabase
    .from("ventas")
    .insert({
      cliente_id: venta.cliente_id,
      producto_id: venta.producto_id ?? null,
      cantidad: venta.cantidad ?? 1,
      precio_unitario_manual: venta.precio_unitario_manual ?? null,
      precio_total: venta.precio_total ?? 0,
      estado: "aceptado",
      pantalla_id: venta.pantalla_id,
      fecha_inicio: nuevaInicio,
      fecha_fin: nuevaFin,
      duracion_meses: duracion,
      vendedor_id: venta.vendedor_id,
      modo_venta: venta.modo_venta,
      tipo_pago_id: venta.tipo_pago_id,
      renovable: false,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { data };
}
