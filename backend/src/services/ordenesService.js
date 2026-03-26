import { supabase } from "../config/supabase.js";

const IVA_RATE = 0.16;

const round2 = (n) => Math.round(Number(n) * 100) / 100;

/** Evita fallo de FK si el JWT no tiene fila en `perfiles`. */
async function generadoPorSeguro(userId) {
  if (!userId) return undefined;
  const { data, error } = await supabase
    .from("perfiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data?.id) return undefined;
  return data.id;
}

const SELECT_ORDENES = "*, colaborador:colaboradores(id,nombre)";
const SELECT_VENTAS =
  "*, colaborador:colaboradores(id,nombre,pantalla:pantallas(id,nombre),producto:productos(*))";

/** Primer y último día del mes calendario (mes 1–12). */
function boundsMesCalendario(anio, mes) {
  const inicio = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const ultimo = new Date(anio, mes, 0);
  const finStr = ultimo.toISOString().slice(0, 10);
  return { inicio, finStr };
}

/**
 * Ventas que se solapan con [inicio, finStr] (no solo contenidas en el mes).
 * Muchas rentas cruzan meses; la query anterior las excluía y no generaba órdenes.
 */
function queryVentasSolapanMes(q, inicio, finStr) {
  return q.lte("fecha_inicio", finStr).gte("fecha_fin", inicio);
}

/** Prorratea precio_total por días que caen dentro del mes vs duración total de la venta. */
function importeVentaEnMes(venta, inicioMes, finMes) {
  const pt = Number(venta.precio_total) || 0;
  const s = String(venta.fecha_inicio).slice(0, 10);
  const e = String(venta.fecha_fin).slice(0, 10);
  if (!s || !e) return pt;
  const vi = new Date(`${s}T12:00:00`);
  const vf = new Date(`${e}T12:00:00`);
  const ms = new Date(`${inicioMes}T12:00:00`);
  const me = new Date(`${finMes}T12:00:00`);
  const start = vi > ms ? vi : ms;
  const end = vf < me ? vf : me;
  if (start > end) return 0;
  const day = 86400000;
  const diasTotal = Math.max(1, Math.round((vf - vi) / day) + 1);
  const diasOverlap = Math.max(0, Math.round((end - start) / day) + 1);
  return round2((pt * diasOverlap) / diasTotal);
}

export async function listar(mes, anio) {
  let q = supabase.from("orden_de_compra").select(SELECT_ORDENES);
  if (mes && mes >= 1 && mes <= 12) q = q.eq("mes", mes);
  if (anio) q = q.eq("anio", anio);
  const { data: ordenes, error } = await q.order("anio", { ascending: false }).order("mes", { ascending: false });
  if (error) throw new Error(error.message);
  if (!ordenes?.length) return [];

  const ordenesConVentas = await Promise.all(
    ordenes.map(async (orden) => {
      let ids = orden.ventas_ids;
      if (typeof ids === "string") try { ids = JSON.parse(ids); } catch { ids = []; }
      ids = Array.isArray(ids) ? ids.filter(Boolean) : [];
      if (ids.length === 0) return { ...orden, ventas: [] };
      const { data: ventas } = await supabase
        .from("ventas")
        .select(SELECT_VENTAS)
        .in("id", ids)
        .order("fecha_inicio");
      return { ...orden, ventas: ventas ?? [] };
    })
  );
  return ordenesConVentas;
}

export async function listarVentasPorMes(mes, anio) {
  const m = Number(mes);
  const a = Number(anio);
  if (!m || m < 1 || m > 12 || !a) return [];
  const { inicio, finStr } = boundsMesCalendario(a, m);

  let q = supabase.from("ventas").select(SELECT_VENTAS).order("fecha_inicio");
  q = queryVentasSolapanMes(q, inicio, finStr);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function generarOrden(mes, anio, userId) {
  const m = Number(mes);
  const a = Number(anio);
  if (!m || m < 1 || m > 12 || !a) return { error: "mes (1-12) y anio son obligatorios" };
  const genPor = await generadoPorSeguro(userId);
  const { inicio, finStr } = boundsMesCalendario(a, m);

  let vq = supabase
    .from("ventas")
    .select("id,colaborador_id,precio_total,fecha_inicio,fecha_fin");
  vq = queryVentasSolapanMes(vq, inicio, finStr);
  const { data: ventas, error: errVentas } = await vq;

  if (errVentas) throw new Error(errVentas.message);
  const ventasList = ventas ?? [];
  if (ventasList.length === 0) return { ordenes: [] };

  // Agrupar ventas por colaborador (Orden de compra por colaborador y mes/año)
  const grupos = new Map();
  for (const v of ventasList) {
    const key = v.colaborador_id;
    if (!key) continue;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key).push(v);
  }

  const ordenesActualizadas = [];
  for (const [colaboradorId, groupVentas] of grupos.entries()) {
    const ventasIds = groupVentas.map((v) => v.id);
    const subtotalRaw = groupVentas.reduce(
      (sum, v) => sum + importeVentaEnMes(v, inicio, finStr),
      0,
    );
    const subtotal = round2(subtotalRaw);
    const iva = round2(subtotal * IVA_RATE);
    const total = round2(subtotal + iva);

    // Si ya hay cualquier orden manual/automática para este colaborador y mes,
    // no generar otra ni actualizar (evita pisar órdenes creadas a mano).
    const { data: yaHayOrdenes } = await supabase
      .from("orden_de_compra")
      .select("id")
      .eq("colaborador_id", colaboradorId)
      .eq("mes", m)
      .eq("anio", a)
      .limit(1);

    if (yaHayOrdenes?.length) {
      continue;
    }

    const baseInsert = {
      colaborador_id: colaboradorId,
      mes: m,
      anio: a,
      ventas_ids: ventasIds,
      subtotal,
      iva,
      total,
    };
    let orden;
    let errInsert;
    ({ data: orden, error: errInsert } = await supabase
      .from("orden_de_compra")
      .insert({ ...baseInsert, ...(genPor ? { generado_por: genPor } : {}) })
      .select(SELECT_ORDENES)
      .single());

    if (errInsert && genPor && String(errInsert.message || "").toLowerCase().includes("generado")) {
      ({ data: orden, error: errInsert } = await supabase
        .from("orden_de_compra")
        .insert(baseInsert)
        .select(SELECT_ORDENES)
        .single());
    }
    if (errInsert) throw new Error(errInsert.message);

    const { error: upVenErr } = await supabase
      .from("ventas")
      .update({ orden_de_compra_id: orden.id })
      .in("id", ventasIds);
    if (upVenErr) throw new Error(upVenErr.message);

    ordenesActualizadas.push(orden);
  }

  return { ordenes: ordenesActualizadas };
}

/**
 * Igual que generarOrden pero solo para un colaborador (ventas del mes que lo tocan).
 */
export async function generarOrdenColaborador(mes, anio, colaborador_id, userId) {
  const m = Number(mes);
  const a = Number(anio);
  const cid = colaborador_id;
  if (!m || m < 1 || m > 12 || !a) return { error: "mes (1-12) y anio son obligatorios" };
  if (!cid) return { error: "colaborador_id es obligatorio" };

  const genPor = await generadoPorSeguro(userId);
  const { inicio, finStr } = boundsMesCalendario(a, m);

  let vq = supabase
    .from("ventas")
    .select("id,colaborador_id,precio_total,fecha_inicio,fecha_fin")
    .eq("colaborador_id", cid);
  vq = queryVentasSolapanMes(vq, inicio, finStr);
  const { data: ventasRows, error: errVentas } = await vq;

  if (errVentas) throw new Error(errVentas.message);
  const groupVentas = ventasRows ?? [];
  if (groupVentas.length === 0) return { ordenes: [], sinVentas: true };

  const { data: yaHayOrdenes } = await supabase
    .from("orden_de_compra")
    .select("id")
    .eq("colaborador_id", cid)
    .eq("mes", m)
    .eq("anio", a)
    .limit(1);

  if (yaHayOrdenes?.length) return { ordenes: [], skipped: true };

  const ventasIds = groupVentas.map((v) => v.id);
  const subtotalRaw = groupVentas.reduce(
    (sum, v) => sum + importeVentaEnMes(v, inicio, finStr),
    0,
  );
  const subtotal = round2(subtotalRaw);
  const iva = round2(subtotal * IVA_RATE);
  const total = round2(subtotal + iva);

  const baseInsert = {
    colaborador_id: cid,
    mes: m,
    anio: a,
    ventas_ids: ventasIds,
    subtotal,
    iva,
    total,
  };
  let orden;
  let errInsert;
  ({ data: orden, error: errInsert } = await supabase
    .from("orden_de_compra")
    .insert({ ...baseInsert, ...(genPor ? { generado_por: genPor } : {}) })
    .select(SELECT_ORDENES)
    .single());

  if (errInsert && genPor && String(errInsert.message || "").toLowerCase().includes("generado")) {
    ({ data: orden, error: errInsert } = await supabase
      .from("orden_de_compra")
      .insert(baseInsert)
      .select(SELECT_ORDENES)
      .single());
  }
  if (errInsert) throw new Error(errInsert.message);

  const { error: upVenErr } = await supabase
    .from("ventas")
    .update({ orden_de_compra_id: orden.id })
    .in("id", ventasIds);
  if (upVenErr) throw new Error(upVenErr.message);

  return { ordenes: [orden] };
}

/**
 * Crea una **nueva** orden de compra (no reemplaza otras del mismo colaborador/mes).
 * Ventas seleccionadas quedan ligadas a esta orden.
 */
export async function crearManual({
  colaborador_id,
  mes,
  anio,
  ventas_ids,
  subtotal,
  iva,
  total,
  iva_porcentaje,
  detalle_lineas,
  userId,
}) {
  const cid = colaborador_id;
  const m = Number(mes);
  const a = Number(anio);
  if (!cid) return { error: "colaborador_id es obligatorio" };
  if (!m || m < 1 || m > 12 || !a) return { error: "mes (1-12) y anio son obligatorios" };

  const genPor = await generadoPorSeguro(userId);

  const ventasIds = Array.isArray(ventas_ids)
    ? ventas_ids.map((x) => String(x).trim()).filter(Boolean)
    : [];
  if (ventasIds.length === 0) return { error: "Selecciona al menos una venta o pantalla" };

  const sub = round2(subtotal);
  const iv = round2(iva);
  const tot = round2(total);
  const ivaPct =
    iva_porcentaje != null && !Number.isNaN(Number(iva_porcentaje))
      ? round2(Number(iva_porcentaje))
      : null;

  const { data: ventasRows, error: errV } = await supabase
    .from("ventas")
    .select("id,colaborador_id")
    .in("id", ventasIds);
  if (errV) throw new Error(errV.message);
  const list = ventasRows ?? [];
  if (list.length !== ventasIds.length) return { error: "Una o más ventas no existen" };
  for (const v of list) {
    if (String(v.colaborador_id) !== String(cid)) {
      return { error: "Todas las ventas deben pertenecer al colaborador seleccionado" };
    }
  }

  const payload = {
    colaborador_id: cid,
    mes: m,
    anio: a,
    ventas_ids: ventasIds,
    subtotal: sub,
    iva: iv,
    total: tot,
    ...(genPor ? { generado_por: genPor } : {}),
  };
  if (Array.isArray(detalle_lineas) && detalle_lineas.length > 0) {
    payload.detalle_lineas = detalle_lineas;
  }
  if (ivaPct != null) payload.iva_porcentaje = ivaPct;

  let ordenId;

  const { data: ordenIns, error: insErr } = await supabase
    .from("orden_de_compra")
    .insert(payload)
    .select("id")
    .single();
  if (insErr) {
    const msg = insErr.message || "";
    if (
      msg.includes("detalle_lineas") ||
      msg.includes("iva_porcentaje") ||
      msg.includes("column")
    ) {
      const { detalle_lineas: _d, iva_porcentaje: _i, ...minimal } = payload;
      const retry = await supabase
        .from("orden_de_compra")
        .insert(minimal)
        .select("id")
        .single();
      if (retry.error) throw new Error(retry.error.message);
      ordenId = retry.data.id;
    } else if (genPor && msg.toLowerCase().includes("generado")) {
      const { generado_por: _g, ...sinGen } = payload;
      const retry = await supabase
        .from("orden_de_compra")
        .insert(sinGen)
        .select("id")
        .single();
      if (retry.error) throw new Error(retry.error.message);
      ordenId = retry.data.id;
    } else if (
      msg.includes("unique") ||
      msg.includes("duplicate key") ||
      msg.includes("orden_de_compra_colaborador_mes_anio")
    ) {
      throw new Error(
        "La base de datos aún tiene una regla de «una sola orden por colaborador y mes». " +
          "En Supabase → SQL ejecuta el archivo de migración que quita esa restricción " +
          "(orden_de_compra_varias_por_mes.sql) y vuelve a intentar.",
      );
    } else {
      throw new Error(insErr.message);
    }
  } else {
    ordenId = ordenIns.id;
  }

  const { error: linkErr } = await supabase
    .from("ventas")
    .update({ orden_de_compra_id: ordenId })
    .in("id", ventasIds);
  if (linkErr) throw new Error(linkErr.message);

  const { data: ordenFull, error: errOrd } = await supabase
    .from("orden_de_compra")
    .select(SELECT_ORDENES)
    .eq("id", ordenId)
    .single();
  if (errOrd) throw new Error(errOrd.message);

  let ids = ordenFull.ventas_ids;
  if (typeof ids === "string") try { ids = JSON.parse(ids); } catch { ids = []; }
  ids = Array.isArray(ids) ? ids.filter(Boolean) : [];
  let ventas = [];
  if (ids.length > 0) {
    const { data: vdata } = await supabase
      .from("ventas")
      .select(SELECT_VENTAS)
      .in("id", ids)
      .order("fecha_inicio");
    ventas = vdata ?? [];
  }

  return { orden: { ...ordenFull, ventas } };
}

export async function eliminar(id) {
  if (!id) return { error: "id es obligatorio" };

  const { data: orden, error: errOrd } = await supabase
    .from("orden_de_compra")
    .select("id,ventas_ids")
    .eq("id", id)
    .single();
  if (errOrd || !orden) throw new Error("Orden no encontrada");

  let ids = orden.ventas_ids;
  if (typeof ids === "string") {
    try {
      ids = JSON.parse(ids);
    } catch {
      ids = [];
    }
  }
  ids = Array.isArray(ids) ? ids.filter(Boolean) : [];
  if (ids.length > 0) {
    const { error: unlinkErr } = await supabase
      .from("ventas")
      .update({ orden_de_compra_id: null })
      .in("id", ids);
    if (unlinkErr) throw new Error(unlinkErr.message);
  }

  const { error: delErr } = await supabase
    .from("orden_de_compra")
    .delete()
    .eq("id", id);
  if (delErr) throw new Error(delErr.message);

  return { ok: true };
}
