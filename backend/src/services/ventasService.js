import { supabase } from "../config/supabase.js";

const SELECT_VENTAS =
  "*, colaborador:colaboradores(id,nombre,email,telefono,contacto,tipo_pago:tipo_pago(id,nombre),pantalla:pantallas(id,nombre),producto:productos(id,nombre)), tipo_pago(id,nombre), orden:orden_de_compra(id,mes,anio,subtotal,iva,total)";

function leerPrecioProducto(producto) {
  const raw =
    producto?.precio ??
    producto?.precio_unitario ??
    producto?.precio_por_mes ??
    0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export async function listar() {
  const { data, error } = await supabase
    .from("ventas")
    .select(SELECT_VENTAS)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function crear(body, vendedorId) {
  const colaboradorId = body.colaborador_id;
  const estadoVenta = body.estado_venta ?? body.estado;
  const vendidoA =
    body.vendido_a ??
    body.a_quien ??
    body.a_quein ??
    body.a_quien_se_vendio ??
    null;

  if (!colaboradorId) return { error: "Colaborador es obligatorio" };
  if (!estadoVenta) return { error: "Estado de venta es obligatorio" };
  if (!body.fecha_inicio || !body.fecha_fin)
    return { error: "Fecha inicio y fin son obligatorias" };
  if (body.duracion_meses == null)
    return { error: "Duracion meses es obligatoria" };

  const duracionMeses = Number(body.duracion_meses);
  if (!Number.isFinite(duracionMeses) || duracionMeses <= 0)
    return { error: "duracion_meses debe ser > 0" };

  const costos = body.costos ?? body.costos_venta ?? body.costo_venta;
  const gastosAdicionales = Number(body.gastos_adicionales ?? 0);
  const precioPantallasMensual = Number(body.precio_pantallas_mensual ?? 0);
  const pantallasDetalle = Array.isArray(body.pantallas_detalle)
    ? body.pantallas_detalle
    : [];
  if (!Number.isFinite(gastosAdicionales) || gastosAdicionales < 0) {
    return { error: "gastos_adicionales debe ser un numero >= 0" };
  }
  if (!Number.isFinite(precioPantallasMensual) || precioPantallasMensual < 0) {
    return { error: "precio_pantallas_mensual debe ser un numero >= 0" };
  }
  if (costos == null || !Number.isFinite(Number(costos)) || Number(costos) < 0)
    return { error: "costos (ventas) es obligatorio (>= 0)" };

  let precioPorMes =
    body.precio_por_mes ??
    body.precio_unitario_manual ??
    body.precio_unitario ??
    null;

  precioPorMes =
    precioPorMes != null && precioPorMes !== "" ? Number(precioPorMes) : null;
  if (
    precioPorMes != null &&
    (!Number.isFinite(precioPorMes) || precioPorMes < 0)
  )
    return { error: "precio_por_mes (ventas) debe ser un numero >= 0" };

  const comisiones = Number(
    body.comisiones ?? body.comision ?? body.comision_total ?? 0,
  );
  const comisionPorcentaje = Number(body.comision_porcentaje ?? 0);
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
      .select("*")
      .eq("id", colaborador.producto_id)
      .single();
    if (errProd || !producto)
      return { error: "Producto del colaborador no encontrado" };
    precioPorMes = leerPrecioProducto(producto);
  }

  const baseTotal = Math.round(precioPorMes * duracionMeses * 100) / 100;
  const brutoConExtras = baseTotal;
  const comisionesCalculadasPorPorcentaje =
    Number.isFinite(comisionPorcentaje) && comisionPorcentaje > 0
      ? Math.round((brutoConExtras * comisionPorcentaje) / 100 * 100) / 100
      : null;
  const comisionTotalCalculada =
    comisionesCalculadasPorPorcentaje != null
      ? comisionesCalculadasPorPorcentaje
      : Number.isFinite(comisiones) && comisiones >= 0
        ? Math.round(comisiones * 100) / 100
        : 0;
  const precioTotal = Math.round(brutoConExtras * 100) / 100;
  const comisionPorPeriodo = comisionTotalCalculada / Math.max(1, duracionMeses);
  const utilidadNeta =
    Math.round(
      (precioPorMes - comisionPorPeriodo) * 100,
    ) / 100;

  const insertPayload = {
    colaborador_id: colaboradorId,
    client_name: colaborador.nombre,
    vendido_a: vendidoA,
    estado_venta: estadoVenta,
    fecha_inicio: body.fecha_inicio,
    fecha_fin: body.fecha_fin,
    duracion_meses: duracionMeses,
    vendedor_id: vendedorId,
    tipo_pago_id: colaborador.tipo_pago_id,
    producto_ids: Array.isArray(body.producto_ids)
      ? body.producto_ids
      : body.producto_id
        ? [body.producto_id]
        : [],
    renovable,
    precio_por_mes: Math.round(precioPorMes * 100) / 100,
    costos: Math.round(Number(costos) * 100) / 100,
    utilidad_neta: utilidadNeta,
    gastos_adicionales: Math.round(gastosAdicionales * 100) / 100,
    precio_pantallas_mensual: Math.round(precioPantallasMensual * 100) / 100,
    pantallas_detalle: pantallasDetalle,
    precio_total: precioTotal,
    comisiones: comisionTotalCalculada,
    comision_porcentaje:
      Number.isFinite(comisionPorcentaje) && comisionPorcentaje >= 0
        ? Math.round(comisionPorcentaje * 100) / 100
        : 0,
    descuento:
      Number.isFinite(descuento) && descuento >= 0
        ? Math.round(descuento * 100) / 100
        : 0,
    pantallas_ids: Array.isArray(body.pantallas_ids)
      ? body.pantallas_ids
      : body.pantalla_id
        ? [body.pantalla_id]
        : [],
    notas: body.notas ?? null,
    fuente_origen: body.fuente_origen ?? null,
  };

  const { data, error } = await supabase
    .from("ventas")
    .insert(insertPayload)
    .select(SELECT_VENTAS)
    .single();
  if (error) throw new Error(error.message);

  return { data };
}

export async function actualizar(id, body) {
  const { data: venta, error: errVenta } = await supabase
    .from("ventas")
    .select("*")
    .eq("id", id)
    .single();
  if (errVenta || !venta) throw new Error("Venta no encontrada");

  const payload = { updated_at: new Date().toISOString() };

  const colaboradorId = body.colaborador_id;
  let duracionMeses =
    body.duracion_meses != null
      ? Number(body.duracion_meses)
      : venta.duracion_meses;
  if (!Number.isFinite(duracionMeses) || duracionMeses <= 0)
    throw new Error("duracion_meses debe ser > 0");

  let precioPorMes =
    body.precio_por_mes ?? body.precio_unitario_manual ?? venta.precio_por_mes;
  precioPorMes =
    precioPorMes != null && precioPorMes !== "" ? Number(precioPorMes) : null;

  let costos =
    body.costos ?? body.costos_venta ?? body.costo_venta ?? venta.costos;
  costos = costos != null && costos !== "" ? Number(costos) : null;
  let gastosAdicionales =
    body.gastos_adicionales ?? venta.gastos_adicionales ?? 0;
  gastosAdicionales =
    gastosAdicionales != null && gastosAdicionales !== ""
      ? Number(gastosAdicionales)
      : 0;

  if (body.estado_venta !== undefined) payload.estado_venta = body.estado_venta;
  else if (body.estado !== undefined) payload.estado_venta = body.estado;
  if (
    body.vendido_a !== undefined ||
    body.a_quien !== undefined ||
    body.a_quein !== undefined ||
    body.a_quien_se_vendio !== undefined
  ) {
    payload.vendido_a =
      body.vendido_a ??
      body.a_quien ??
      body.a_quein ??
      body.a_quien_se_vendio ??
      null;
  }
  if (body.notas !== undefined) payload.notas = body.notas;
  if (body.fuente_origen !== undefined) payload.fuente_origen = body.fuente_origen;
  if (body.precio_pantallas_mensual !== undefined) {
    const n = Number(body.precio_pantallas_mensual);
    if (!Number.isFinite(n) || n < 0)
      throw new Error("precio_pantallas_mensual debe ser >= 0");
    payload.precio_pantallas_mensual = Math.round(n * 100) / 100;
  }
  if (body.pantallas_detalle !== undefined) {
    if (!Array.isArray(body.pantallas_detalle))
      throw new Error("pantallas_detalle debe ser un arreglo");
    payload.pantallas_detalle = body.pantallas_detalle;
  }
  if (body.pantallas_ids !== undefined) {
    payload.pantallas_ids = Array.isArray(body.pantallas_ids)
      ? body.pantallas_ids
      : [];
  }
  if (body.producto_ids !== undefined) {
    payload.producto_ids = Array.isArray(body.producto_ids)
      ? body.producto_ids
      : body.producto_id
        ? [body.producto_id]
        : [];
  }
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

    if (precioPorMes == null) {
      const { data: producto, error: errProd } = await supabase
        .from("productos")
        .select("*")
        .eq("id", colaborador.producto_id)
        .single();
      if (errProd || !producto)
        throw new Error("Producto del colaborador no encontrado");
      precioPorMes = leerPrecioProducto(producto);
    }
  }

  const tieneCambiosPrecio =
    body.precio_por_mes !== undefined ||
    body.precio_unitario_manual !== undefined ||
    body.costos !== undefined ||
    body.costos_venta !== undefined ||
    body.costo_venta !== undefined ||
    body.gastos_adicionales !== undefined ||
    body.duracion_meses !== undefined ||
    !!colaboradorId;

  if (tieneCambiosPrecio) {
    if (
      precioPorMes == null ||
      !Number.isFinite(precioPorMes) ||
      precioPorMes < 0
    )
      throw new Error("precio_por_mes (ventas) debe ser >= 0");
    if (costos == null || !Number.isFinite(costos) || costos < 0)
      throw new Error("costos (ventas) debe ser >= 0");
    if (!Number.isFinite(gastosAdicionales) || gastosAdicionales < 0)
      throw new Error("gastos_adicionales debe ser >= 0");

    payload.precio_por_mes = Math.round(precioPorMes * 100) / 100;
    payload.costos = Math.round(costos * 100) / 100;
    payload.gastos_adicionales = Math.round(gastosAdicionales * 100) / 100;
    const comisionesBase = Number(payload.comisiones ?? venta.comisiones ?? 0) || 0;
    const comisionPorPeriodo = comisionesBase / Math.max(1, duracionMeses);
    payload.utilidad_neta =
      Math.round(
        (precioPorMes - comisionPorPeriodo) * 100,
      ) / 100;
    const baseTotal = Math.round(precioPorMes * duracionMeses * 100) / 100;
    payload.precio_total = Math.round(baseTotal * 100) / 100;
  }

  if (
    body.comisiones !== undefined ||
    body.comision !== undefined ||
    body.comision_total !== undefined ||
    body.comision_porcentaje !== undefined
  ) {
    const c = Number(body.comisiones ?? body.comision ?? body.comision_total);
    const cp = Number(body.comision_porcentaje ?? venta.comision_porcentaje ?? 0);
    if (!Number.isFinite(cp) || cp < 0)
      throw new Error("comision_porcentaje debe ser un numero >= 0");
    payload.comision_porcentaje = Math.round(cp * 100) / 100;
    const precioTotalBase =
      Number(payload.precio_total ?? venta.precio_total ?? 0) || 0;
    if (payload.comision_porcentaje > 0 && precioTotalBase > 0) {
      payload.comisiones =
        Math.round((precioTotalBase * payload.comision_porcentaje) / 100 * 100) / 100;
    } else if (
      body.comisiones !== undefined ||
      body.comision !== undefined ||
      body.comision_total !== undefined
    ) {
      if (!Number.isFinite(c) || c < 0)
        throw new Error("comisiones debe ser un numero >= 0");
      payload.comisiones = Math.round(c * 100) / 100;
    }
  }
  if (body.descuento !== undefined) {
    const d = Number(body.descuento);
    if (!Number.isFinite(d) || d < 0)
      throw new Error("descuento debe ser un numero >= 0");
    payload.descuento = Math.round(d * 100) / 100;
  }

  {
    const precioPorMesBase = Number(payload.precio_por_mes ?? venta.precio_por_mes ?? 0) || 0;
    const comisionesBase = Number(payload.comisiones ?? venta.comisiones ?? 0) || 0;
    const duracionBase = Number(payload.duracion_meses ?? venta.duracion_meses ?? 1) || 1;
    const baseTotal = Math.round(precioPorMesBase * duracionBase * 100) / 100;
    payload.precio_total = Math.round(baseTotal * 100) / 100;
  }

  if (payload.utilidad_neta === undefined) {
    const precioPorMesBase = Number(payload.precio_por_mes ?? venta.precio_por_mes ?? 0) || 0;
    const comisionesBase = Number(payload.comisiones ?? venta.comisiones ?? 0) || 0;
    const duracionBase = Number(payload.duracion_meses ?? venta.duracion_meses ?? 1) || 1;
    const comisionPorPeriodo = comisionesBase / Math.max(1, duracionBase);
    payload.utilidad_neta =
      Math.round(
        (precioPorMesBase - comisionPorPeriodo) * 100,
      ) / 100;
  }

  const { data, error } = await supabase
    .from("ventas")
    .update(payload)
    .eq("id", id)
    .select(SELECT_VENTAS)
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

  const nuevaInicio = body.fecha_inicio || body.fecha_inicio_nueva;
  const nuevaFin = body.fecha_fin || body.fecha_fin_nueva;
  const duracion = body.duracion_meses ?? venta.duracion_meses;
  if (!nuevaInicio || !nuevaFin)
    return { error: "fecha_inicio y fecha_fin obligatorios" };

  const { data: colaborador, error: errColab } = await supabase
    .from("colaboradores")
    .select("id,nombre,tipo_pago_id,producto_id")
    .eq("id", venta.colaborador_id)
    .single();
  if (errColab || !colaborador) return { error: "Colaborador no encontrado" };

  let precioPorMes = venta.precio_por_mes;
  if (precioPorMes == null) {
    const { data: producto, error: errProd } = await supabase
      .from("productos")
      .select("*")
      .eq("id", colaborador.producto_id)
      .single();
    if (errProd || !producto)
      return { error: "Producto del colaborador no encontrado" };
    precioPorMes = leerPrecioProducto(producto);
  }

  const costos = venta.costos ?? 0;
  const gastosAdicionales = Number(venta.gastos_adicionales ?? 0);
  let utilidadNeta = 0;
  const baseTotal = Math.round(Number(precioPorMes) * Number(duracion) * 100) / 100;

  const comisionesRen =
    body.comisiones != null ||
    body.comision != null ||
    body.comision_total != null
      ? Number(body.comisiones ?? body.comision ?? body.comision_total)
      : Number(venta.comisiones ?? 0);
  const descuentoRen =
    body.descuento != null
      ? Number(body.descuento)
      : Number(venta.descuento ?? 0);
  const precioTotal = Math.round(baseTotal * 100) / 100;

  const comisionPorPeriodoRen =
    (Number(comisionesRen) || 0) / Math.max(1, Number(duracion) || 1);
  utilidadNeta =
    Math.round(
      (Number(precioPorMes) - comisionPorPeriodoRen) * 100,
    ) / 100;

  const insertPayload = {
    colaborador_id: venta.colaborador_id,
    client_name: colaborador.nombre,
    vendido_a: venta.vendido_a ?? null, // ✅ hereda el receptor original
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
    gastos_adicionales: Math.round(gastosAdicionales * 100) / 100,
    precio_pantallas_mensual: Math.round(Number(venta.precio_pantallas_mensual ?? 0) * 100) / 100,
    pantallas_detalle: Array.isArray(venta.pantallas_detalle) ? venta.pantallas_detalle : [],
    precio_total: precioTotal,
    comisiones:
      Number.isFinite(comisionesRen) && comisionesRen >= 0
        ? Math.round(comisionesRen * 100) / 100
        : 0,
    descuento:
      Number.isFinite(descuentoRen) && descuentoRen >= 0
        ? Math.round(descuentoRen * 100) / 100
        : 0,
  };

  const { data, error } = await supabase
    .from("ventas")
    .insert(insertPayload)
    .select(SELECT_VENTAS)
    .single();
  if (error) throw new Error(error.message);
  return { data };
}

export async function eliminar(id) {
  const { data: venta, error: errVenta } = await supabase
    .from("ventas")
    .select("id,orden_de_compra_id")
    .eq("id", id)
    .single();
  if (errVenta || !venta) throw new Error("Venta no encontrada");

  const { error } = await supabase.from("ventas").delete().eq("id", id);
  if (error) throw new Error(error.message);

  return { ok: true };
}
