import { supabase } from "../config/supabase.js";

const SELECT_VENTAS =
  "*, client:clients(id,nombre,telefono,correo), colaborador:colaboradores(id,nombre,email,telefono,contacto,tipo_pago:tipo_pago(id,nombre),pantalla:pantallas(id,nombre),producto:productos(id,nombre)), tipo_pago(id,nombre), orden:orden_de_compra(id,mes,anio,subtotal,iva,total)";

function leerPrecioProducto(producto) {
  const raw =
    producto?.precio ??
    producto?.precio_unitario ??
    producto?.precio_por_mes ??
    0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function notasIndicanVentaPorDias(notas) {
  return /\[UNIDAD\s*:\s*DIAS\]/i.test(String(notas ?? ""));
}

/**
 * % del socio: por meses = (precio_por_mes × %) × duración;
 * por días = % sobre precio_total del período.
 */
function montoSocioPorcentajeDesdePrecioMensual({
  precioPorMes,
  duracionMeses,
  precioTotal,
  porcentajeSocio,
  notas,
  duracionUnidad,
}) {
  const ps = Number(porcentajeSocio);
  if (!(Number.isFinite(ps) && ps > 0)) return 0;
  const pct = Math.min(100, Math.max(0, ps));
  const pm = Number(precioPorMes) || 0;
  const n = Math.max(1, Math.floor(Number(duracionMeses) || 1));
  const pt = Number(precioTotal) || 0;
  const du = String(duracionUnidad ?? "").toLowerCase();
  const esDias =
    notasIndicanVentaPorDias(notas) ||
    du === "dias" ||
    du === "días" ||
    du === "dia" ||
    du === "día";
  if (esDias) {
    return pt > 0 ? Math.round((pt * pct) / 100 * 100) / 100 : 0;
  }
  const socioMensual = Math.round((pm * pct) / 100 * 100) / 100;
  return Math.round(socioMensual * n * 100) / 100;
}

/** Si la migración `porcentaje_socio` aún no está aplicada en Supabase. */
function ventasErrorColumnaPorcentajeSocio(error) {
  return /porcentaje_socio|schema cache/i.test(String(error?.message ?? ""));
}

function ventasPayloadSinPorcentajeSocio(p) {
  if (p == null || typeof p !== "object") return p;
  const { porcentaje_socio, ...rest } = p;
  return rest;
}

function ventasErrorColumnaConsideracionMonto(error) {
  return /consideracion_monto|schema cache/i.test(String(error?.message ?? ""));
}

function ventasPayloadSinConsideracionMonto(p) {
  if (p == null || typeof p !== "object") return p;
  const { consideracion_monto, ...rest } = p;
  return rest;
}

function ventasErrorIdentificadorDuplicado(error) {
  const msg = String(error?.message ?? "").toLowerCase();
  const code = String(error?.code ?? "");
  return (
    code === "23505" ||
    msg.includes("ventas_identificador_venta_uq") ||
    msg.includes("identificador_venta")
  );
}

export async function listar() {
  const { data, error } = await supabase
    .from("ventas")
    .select(SELECT_VENTAS)
    .order("created_at", { ascending: false });
  if (error) {
    if (ventasErrorIdentificadorDuplicado(error)) {
      return {
        error:
          "El identificador de venta ya existe. Usa uno diferente (4 letras o numeros).",
      };
    }
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function crear(body, vendedorId) {
  const vendedorFinal =
    vendedorId ??
    body.vendedor_id ??
    body.usuario_registro_id ??
    null;
  const colaboradorId = body.colaborador_id;
  const estadoVenta = body.estado_venta ?? body.estado;
  let vendidoA =
    body.vendido_a ??
    body.a_quien ??
    body.a_quein ??
    body.a_quien_se_vendio ??
    null;

  const clientIdRaw = body.client_id ?? body.clientId ?? null;
  const clientId =
    clientIdRaw != null && String(clientIdRaw).trim() !== ""
      ? String(clientIdRaw).trim()
      : "";

  if (clientId) {
    const { data: cliRow, error: errCli } = await supabase
      .from("clients")
      .select("id,nombre")
      .eq("id", clientId)
      .single();
    if (errCli || !cliRow) return { error: "Cliente no encontrado" };
    vendidoA = cliRow.nombre;
  }

  if (!colaboradorId) return { error: "Colaborador es obligatorio" };
  if (!vendedorFinal) return { error: "Vendedor es obligatorio" };
  if (!estadoVenta) return { error: "Estado de venta es obligatorio" };
  if (!String(vendidoA ?? "").trim()) {
    return {
      error:
        "Cliente de la venta obligatorio: envía client_id de un cliente registrado en /api/clients o vendido_a",
    };
  }
  if (!body.fecha_inicio || !body.fecha_fin)
    return { error: "Fecha inicio y fin son obligatorias" };
  if (body.duracion_meses == null)
    return { error: "Duracion meses es obligatoria" };

  const duracionMeses = Number(body.duracion_meses);
  if (!Number.isFinite(duracionMeses) || duracionMeses <= 0)
    return { error: "duracion_meses debe ser > 0" };

  const costos = body.costos ?? body.costos_venta ?? body.costo_venta;
  const costoVenta = body.costo_venta ?? body.costoVenta ?? costos;
  const consideracionMonto = Number(
    body.consideracion_monto ?? body.pago_considerar ?? 0,
  );
  const identificadorVenta = body.identificador_venta ?? body.identificador ?? null;
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
  if (costoVenta == null || !Number.isFinite(Number(costoVenta)) || Number(costoVenta) < 0)
    return { error: "costo_venta es obligatorio (>= 0)" };
  if (!Number.isFinite(consideracionMonto) || consideracionMonto < 0)
    return { error: "consideracion_monto debe ser >= 0" };

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
  const porcentajeSocio = Number(body.porcentaje_socio ?? 0);
  const descuento = Number(body.descuento ?? 0);
  const renovable = body.renovable ?? false;

  const { data: colaborador, error: errColab } = await supabase
    .from("colaboradores")
    .select("id,nombre,tipo_pago_id,producto_id,tipo_pago:tipo_pago(nombre)")
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

  // Gastos adicionales se guardan aparte: no alteran el total de la venta.
  const baseTotal = Math.round(precioPorMes * duracionMeses * 100) / 100;
  const brutoConExtras = Number(body.importe_total ?? baseTotal) || baseTotal;
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
  const tipoPagoNombre = String(colaborador?.tipo_pago?.nombre ?? "").toLowerCase();
  const esTipoPorcentaje = tipoPagoNombre.includes("porcentaje");
  const esTipoCostoFijo =
    tipoPagoNombre.includes("consideracion") || tipoPagoNombre.includes("precio fijo");
  const montoPorcentajeSobrePrecio = esTipoPorcentaje
    ? montoSocioPorcentajeDesdePrecioMensual({
        precioPorMes,
        duracionMeses,
        precioTotal,
        porcentajeSocio,
        notas: body.notas,
        duracionUnidad: body.duracion_unidad,
      })
    : 0;
  const consideracionAplicada = esTipoCostoFijo ? consideracionMonto : 0;
  const costoVentaFinal = Math.max(
    0,
    Math.round((Number(costoVenta) - consideracionAplicada) * 100) / 100,
  );
  const utilidadNeta = esTipoPorcentaje
    ? Math.max(
        0,
        Math.round((precioTotal - montoPorcentajeSobrePrecio) * 100) / 100,
      )
    : Math.max(
        0,
        Math.round((precioTotal - costoVentaFinal) * 100) / 100,
      );

  const insertPayload = {
    colaborador_id: colaboradorId,
    client_name: colaborador.nombre,
    client_id: clientId || null,
    vendido_a: vendidoA,
    estado_venta: estadoVenta,
    fecha_inicio: body.fecha_inicio,
    fecha_fin: body.fecha_fin,
    duracion_meses: duracionMeses,
    vendedor_id: vendedorFinal,
    tipo_pago_id: colaborador.tipo_pago_id,
    producto_ids: Array.isArray(body.producto_ids)
      ? body.producto_ids
      : body.producto_id
        ? [body.producto_id]
        : [],
    renovable,
    precio_por_mes: Math.round(precioPorMes * 100) / 100,
    costos: Math.round(costoVentaFinal * 100) / 100,
    costo_venta: Math.round(costoVentaFinal * 100) / 100,
    utilidad_neta: Math.round(utilidadNeta * 100) / 100,
    consideracion_monto: Math.round(consideracionAplicada * 100) / 100,
    gastos_adicionales: Math.round(gastosAdicionales * 100) / 100,
    precio_pantallas_mensual: Math.round(precioPantallasMensual * 100) / 100,
    pantallas_detalle: pantallasDetalle,
    precio_total: precioTotal,
    comisiones: comisionTotalCalculada,
    comision_porcentaje:
      Number.isFinite(comisionPorcentaje) && comisionPorcentaje >= 0
        ? Math.round(comisionPorcentaje * 100) / 100
        : 0,
    porcentaje_socio:
      esTipoPorcentaje && Number.isFinite(porcentajeSocio) && porcentajeSocio > 0
        ? Math.round(porcentajeSocio * 100) / 100
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
    identificador_venta: identificadorVenta,
  };

  let { data, error } = await supabase
    .from("ventas")
    .insert(insertPayload)
    .select(SELECT_VENTAS)
    .single();
  if (error && ventasErrorColumnaPorcentajeSocio(error)) {
    console.warn(
      "[ventas] Falta columna ventas.porcentaje_socio. Ejecuta: supabase/migrations/20260330130000_ventas_porcentaje_socio.sql en el SQL Editor de Supabase.",
    );
    const r2 = await supabase
      .from("ventas")
      .insert(ventasPayloadSinPorcentajeSocio(insertPayload))
      .select(SELECT_VENTAS)
      .single();
    data = r2.data;
    error = r2.error;
  }
  if (error && ventasErrorColumnaConsideracionMonto(error)) {
    console.warn(
      "[ventas] Falta columna ventas.consideracion_monto. Ejecuta: supabase/migrations/20260331183000_ventas_consideracion_monto.sql.",
    );
    const r3 = await supabase
      .from("ventas")
      .insert(ventasPayloadSinConsideracionMonto(insertPayload))
      .select(SELECT_VENTAS)
      .single();
    data = r3.data;
    error = r3.error;
  }
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

  const tipoPagoLookupId = body.tipo_pago_id ?? venta.tipo_pago_id ?? null;
  let tipoPagoNombreActual = "";
  if (tipoPagoLookupId) {
    const { data: tipoPagoRow } = await supabase
      .from("tipo_pago")
      .select("nombre")
      .eq("id", tipoPagoLookupId)
      .maybeSingle();
    tipoPagoNombreActual = String(tipoPagoRow?.nombre ?? "").toLowerCase();
  }
  const esTipoPorcentaje = tipoPagoNombreActual.includes("porcentaje");
  const esTipoCostoFijo =
    tipoPagoNombreActual.includes("consideracion") ||
    tipoPagoNombreActual.includes("precio fijo");

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
  let consideracionMonto =
    body.consideracion_monto ?? body.pago_considerar ?? venta.consideracion_monto ?? 0;
  consideracionMonto =
    consideracionMonto != null && consideracionMonto !== ""
      ? Number(consideracionMonto)
      : 0;
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
  if (body.client_id !== undefined || body.clientId !== undefined) {
    const cid = String(body.client_id ?? body.clientId ?? "").trim();
    if (!cid) {
      payload.client_id = null;
    } else {
      const { data: cliRow, error: errCli } = await supabase
        .from("clients")
        .select("id,nombre")
        .eq("id", cid)
        .single();
      if (errCli || !cliRow) throw new Error("Cliente no encontrado");
      payload.client_id = cliRow.id;
      payload.vendido_a = cliRow.nombre;
    }
  }
  if (body.notas !== undefined) payload.notas = body.notas;
  if (body.fuente_origen !== undefined) payload.fuente_origen = body.fuente_origen;
  if (body.vendedor_id !== undefined) payload.vendedor_id = body.vendedor_id;
  else if (body.vendedorId !== undefined) payload.vendedor_id = body.vendedorId;
  if (body.identificador_venta !== undefined || body.identificador !== undefined) {
    payload.identificador_venta = body.identificador_venta ?? body.identificador ?? null;
  }
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
    body.consideracion_monto !== undefined ||
    body.pago_considerar !== undefined ||
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
      throw new Error("costo_venta (ventas) debe ser >= 0");
    if (!Number.isFinite(consideracionMonto) || consideracionMonto < 0)
      throw new Error("consideracion_monto debe ser >= 0");
    if (!Number.isFinite(gastosAdicionales) || gastosAdicionales < 0)
      throw new Error("gastos_adicionales debe ser >= 0");

    payload.precio_por_mes = Math.round(precioPorMes * 100) / 100;
    const consideracionAplicada = esTipoCostoFijo ? consideracionMonto : 0;
    const costoFinal = Math.max(
      0,
      Math.round((costos - consideracionAplicada) * 100) / 100,
    );
    payload.costos = Math.round(costoFinal * 100) / 100;
    payload.costo_venta = Math.round(costoFinal * 100) / 100;
    payload.consideracion_monto = Math.round(consideracionAplicada * 100) / 100;
    payload.gastos_adicionales = Math.round(gastosAdicionales * 100) / 100;
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
  if (body.porcentaje_socio !== undefined) {
    const ps = Number(body.porcentaje_socio);
    if (!Number.isFinite(ps) || ps < 0)
      throw new Error("porcentaje_socio debe ser un numero >= 0");
    payload.porcentaje_socio = esTipoPorcentaje ? Math.round(ps * 100) / 100 : 0;
  }

  {
    const precioPorMesBase = Number(payload.precio_por_mes ?? venta.precio_por_mes ?? 0) || 0;
    const duracionBase = Number(payload.duracion_meses ?? venta.duracion_meses ?? 1) || 1;
    const baseTotal = Math.round(precioPorMesBase * duracionBase * 100) / 100;
    payload.precio_total = Math.round(baseTotal * 100) / 100;
  }

  {
    const tid = payload.tipo_pago_id ?? venta.tipo_pago_id;
    let nombreTipo = tipoPagoNombreActual;
    if (tid && (body.colaborador_id !== undefined || body.tipo_pago_id !== undefined)) {
      const { data: row } = await supabase
        .from("tipo_pago")
        .select("nombre")
        .eq("id", tid)
        .maybeSingle();
      nombreTipo = String(row?.nombre ?? "").toLowerCase();
    }
    const esPct = nombreTipo.includes("porcentaje");
    const precioFin = Number(payload.precio_total ?? venta.precio_total ?? 0) || 0;
    const costoFin =
      Number(payload.costo_venta ?? payload.costos ?? venta.costo_venta ?? venta.costos ?? 0) ||
      0;
    const psFin = Number(payload.porcentaje_socio ?? venta.porcentaje_socio ?? 0) || 0;
    const notasFin = String(payload.notas ?? venta.notas ?? "");
    const durUnidadFin =
      payload.duracion_unidad ?? venta.duracion_unidad ?? body.duracion_unidad ?? "";
    if (esPct) {
      const m = montoSocioPorcentajeDesdePrecioMensual({
        precioPorMes: Number(payload.precio_por_mes ?? venta.precio_por_mes ?? 0) || 0,
        duracionMeses: Number(payload.duracion_meses ?? venta.duracion_meses ?? 1) || 1,
        precioTotal: precioFin,
        porcentajeSocio: psFin,
        notas: notasFin,
        duracionUnidad: durUnidadFin,
      });
      payload.utilidad_neta = Math.max(0, Math.round((precioFin - m) * 100) / 100);
    } else {
      payload.utilidad_neta = Math.max(0, Math.round((precioFin - costoFin) * 100) / 100);
    }
  }

  let { data, error } = await supabase
    .from("ventas")
    .update(payload)
    .eq("id", id)
    .select(SELECT_VENTAS)
    .single();
  if (error && ventasErrorColumnaPorcentajeSocio(error)) {
    console.warn(
      "[ventas] Falta columna ventas.porcentaje_socio. Ejecuta: supabase/migrations/20260330130000_ventas_porcentaje_socio.sql en el SQL Editor de Supabase.",
    );
    const r2 = await supabase
      .from("ventas")
      .update(ventasPayloadSinPorcentajeSocio(payload))
      .eq("id", id)
      .select(SELECT_VENTAS)
      .single();
    data = r2.data;
    error = r2.error;
  }
  if (error && ventasErrorColumnaConsideracionMonto(error)) {
    console.warn(
      "[ventas] Falta columna ventas.consideracion_monto. Ejecuta: supabase/migrations/20260331183000_ventas_consideracion_monto.sql.",
    );
    const r3 = await supabase
      .from("ventas")
      .update(ventasPayloadSinConsideracionMonto(payload))
      .eq("id", id)
      .select(SELECT_VENTAS)
      .single();
    data = r3.data;
    error = r3.error;
  }
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

  utilidadNeta = Math.round(Number(costos) * 100) / 100;

  const insertPayload = {
    colaborador_id: venta.colaborador_id,
    client_name: colaborador.nombre,
    client_id: venta.client_id ?? null,
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
