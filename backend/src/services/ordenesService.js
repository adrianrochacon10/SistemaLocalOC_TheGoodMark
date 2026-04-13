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

/**
 * Sin `tipo_comision` (no existe en todas las BD). FK explícita evita un 2.º join `colaboradores_*`
 * que en algunos esquemas PostgREST resolvía mal.
 */
/** Sin `productos(*)`: el * anidado puede disparar más joins (p. ej. otro `colaboradores_*`) y romper en BD sin tipo_comision. */
const SELECT_ORDENES =
  "*, colaborador:colaboradores!colaborador_id(id,nombre,tipo_pago:tipo_pago(nombre))";
const SELECT_VENTAS =
  "*, colaborador:colaboradores!colaborador_id(id,nombre,pantalla:pantallas(id,nombre),producto:productos(id,nombre,precio))";

async function cargarVentasDeOrden(orden) {
  let ids = orden.ventas_ids;
  if (typeof ids === "string")
    try {
      ids = JSON.parse(ids);
    } catch {
      ids = [];
    }
  ids = Array.isArray(ids) ? ids.filter(Boolean) : [];

  const idsSet = new Set(ids.map((x) => String(x)));
  const ventasMap = new Map();

  const { data: ventasLigadas, error: errLigadas } = await supabase
    .from("ventas")
    .select(SELECT_VENTAS)
    .eq("orden_de_compra_id", orden.id)
    .order("fecha_inicio");
  if (errLigadas) throw new Error(errLigadas.message);

  for (const v of ventasLigadas ?? []) {
    ventasMap.set(String(v.id), v);
  }

  // Fallback: si existen IDs históricos en ventas_ids que ya no están ligadas por FK.
  const idsFaltantes = [...idsSet].filter((id) => !ventasMap.has(id));
  if (idsFaltantes.length > 0) {
    const { data: ventasPorIds, error: errPorIds } = await supabase
      .from("ventas")
      .select(SELECT_VENTAS)
      .in("id", idsFaltantes)
      .order("fecha_inicio");
    if (errPorIds) throw new Error(errPorIds.message);
    for (const v of ventasPorIds ?? []) {
      ventasMap.set(String(v.id), v);
    }
  }

  return [...ventasMap.values()].sort((a, b) => {
    const fa = String(a.fecha_inicio ?? "");
    const fb = String(b.fecha_inicio ?? "");
    return fa.localeCompare(fb);
  });
}

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
  return q
    .lte("fecha_inicio", finStr)
    .gte("fecha_fin", inicio)
    .eq("estado_venta", "aceptado");
}

const DIA_CORTE_ORDEN_DEFAULT = 20;

async function obtenerDiaCorteOrdenes() {
  const { data, error } = await supabase
    .from("configuracion")
    .select("dia_corte_ordenes")
    .limit(1)
    .maybeSingle();
  if (error) return DIA_CORTE_ORDEN_DEFAULT;
  const raw = Number(data?.dia_corte_ordenes);
  if (!Number.isFinite(raw)) return DIA_CORTE_ORDEN_DEFAULT;
  return Math.min(31, Math.max(1, Math.floor(raw)));
}

/** YYYY-MM-DD desde fila venta */
function ymdInicioVenta(venta) {
  const s = String(venta?.fecha_inicio ?? venta?.fechaInicio ?? "").slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
}

/**
 * Primer día en que la venta cuenta para órdenes de compra:
 * si día(fecha_inicio) > dia_corte → 1 del mes siguiente; si no → 1 del mismo mes.
 * Ej.: corte 29, inicio 30-mar → inicio efectivo 1-abr (no entra en OC de marzo).
 */
function inicioEfectivoOrdenesVenta(venta, diaCorte) {
  const p = ymdInicioVenta(venta);
  if (!p) return null;
  const { y, mo, d } = p;
  if (d > diaCorte) {
    return new Date(y, mo, 1);
  }
  return new Date(y, mo - 1, 1);
}

function ymdFinVenta(venta) {
  return String(venta?.fecha_fin ?? venta?.fechaFin ?? "").slice(0, 10);
}

/** Solapa el mes calendario (mes 1–12) considerando inicio efectivo por corte. */
function ventaIncluidaEnMesOrden(venta, mes1a12, anio, diaCorte) {
  const eff = inicioEfectivoOrdenesVenta(venta, diaCorte);
  if (!eff || Number.isNaN(eff.getTime())) return false;
  const finS = ymdFinVenta(venta);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(finS)) return false;
  const { inicio, finStr } = boundsMesCalendario(anio, mes1a12);
  const ms = new Date(`${inicio}T12:00:00`);
  const me = new Date(`${finStr}T12:00:00`);
  const feff = new Date(
    eff.getFullYear(),
    eff.getMonth(),
    eff.getDate(),
    12,
    0,
    0,
  );
  const ffin = new Date(`${finS}T12:00:00`);
  return feff <= me && ffin >= ms;
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

/** Precio total del contrato (base para derivar cuota mensual o prorrateo por días). */
function importeTotalContratoVentaParaPct(venta) {
  const total = Number(venta?.precio_total ?? venta?.importe_total ?? 0) || 0;
  if (total > 0) return round2(total);
  const meses = Math.max(1, Math.floor(Number(venta?.duracion_meses ?? venta?.meses_renta ?? 1) || 1));
  const pm = Number(venta?.precio_por_mes ?? 0) || 0;
  if (pm > 0) return round2(pm * meses);
  return 0;
}

/**
 * Venta por días (paquete): misma heurística que el front `esVentaPorDiasOrden`.
 */
function esVentaPorDiasOrdenBackend(venta) {
  const u = String(venta?.duracion_unidad ?? "").toLowerCase();
  if (["dias", "días", "dia", "día"].some((x) => u.includes(x))) return true;
  const mr = Math.max(
    1,
    Math.floor(Number(venta?.duracion_meses ?? venta?.meses_renta) || 1),
  );
  const s = String(venta?.fecha_inicio ?? "").slice(0, 10);
  const e = String(venta?.fecha_fin ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !/^\d{4}-\d{2}-\d{2}$/.test(e)) return false;
  const vi = new Date(`${s}T12:00:00`);
  const vf = new Date(`${e}T12:00:00`);
  if (Number.isNaN(vi.getTime()) || Number.isNaN(vf.getTime())) return false;
  const dias = Math.max(1, Math.round((vf - vi) / 86400000) + 1);
  if ([1, 3, 7, 15].includes(mr) && dias <= 31) return true;
  if (mr === dias || Math.abs(dias - mr) <= 1) return true;
  return false;
}

/**
 * Base bruta antes del % del socio (igual que front `importeVentaEnMesOrden` para OC):
 * contrato por meses → total/meses; por días → prorrateo de `precio_total` al mes calendario.
 */
function importeBrutoAplicarPorcentajeEnMes(venta, inicioMes, finMesStr) {
  const pt = importeTotalContratoVentaParaPct(venta);
  if (!(pt > 0)) return 0;
  if (esVentaPorDiasOrdenBackend(venta)) {
    return round2(importeVentaEnMes(venta, inicioMes, finMesStr));
  }
  const meses = mesesContratoVenta(venta);
  return round2(pt / meses);
}

/** Subtotal OC: importe de venta solo con colaborador por %; si no, base en costo de la venta. */
function colaboradorUsaCostoEnOrden(row) {
  return !colaboradorEsTipoPorcentaje(row);
}

function colaboradorEsTipoPorcentaje(row) {
  if (!row) return false;
  const tc = String(row.tipo_comision ?? "").toLowerCase();
  if (tc === "porcentaje") return true;
  const nom = String(row.tipo_pago?.nombre ?? "").toLowerCase();
  return nom.includes("porcentaje");
}

/**
 * Porcentaje vigente del colaborador (tabla `porcentajes`, misma regla que el front).
 * Si no hay fila, se usa el guardado en la venta.
 */
async function porcentajeSocioVivoColaborador(colaboradorId) {
  if (!colaboradorId) return null;
  const { data: tp, error: e1 } = await supabase
    .from("tipo_pago")
    .select("id")
    .eq("nombre", "porcentaje")
    .maybeSingle();
  if (e1 || !tp?.id) return null;
  const idStr = String(colaboradorId).trim();
  const { data: rows, error: e2 } = await supabase
    .from("porcentajes")
    .select("valor")
    .eq("tipo_pago_id", tp.id)
    .ilike("descripcion", `%${idStr}%`)
    .order("created_at", { ascending: false })
    .limit(1);
  if (e2 || !rows?.length) return null;
  const v = Number(rows[0].valor);
  if (!Number.isFinite(v) || v < 0 || v > 100) return null;
  return v;
}

/**
 * Importe de línea o mes en OC: colaborador por % aplica ese % sobre el bruto.
 * Prioriza `venta.porcentaje_socio` si viene en la venta; si no, `porcentajeColaboradorVivo` (tabla porcentajes).
 * `aplicarPorcentajeEnLinea === false` (detalle_lineas) no aplica el %.
 */
function importeTrasPorcentajeSocio(
  venta,
  importeBruto,
  colabRow,
  aplicarPorcentajeEnLinea,
  porcentajeColaboradorVivo,
) {
  const bruto = round2(Number(importeBruto) || 0);
  if (!(bruto > 0)) return bruto;
  if (colaboradorUsaCostoEnOrden(colabRow)) return bruto;
  if (!colaboradorEsTipoPorcentaje(colabRow)) return bruto;
  if (aplicarPorcentajeEnLinea === false) return bruto;
  const ps = venta?.porcentaje_socio;
  const ventaDefinePct =
    ps != null && ps !== "" && Number.isFinite(Number(ps));
  let pct = 0;
  if (ventaDefinePct) {
    pct = Math.min(100, Math.max(0, Number(ps)));
  } else if (
    porcentajeColaboradorVivo != null &&
    Number.isFinite(Number(porcentajeColaboradorVivo))
  ) {
    pct = Math.min(100, Math.max(0, Number(porcentajeColaboradorVivo)));
  }
  if (!(pct > 0)) return bruto;
  return round2(bruto * (pct / 100));
}

/** Meses de contrato: `duracion_meses` en BD o diferencia inicio–fin. */
function mesesContratoVenta(venta) {
  const mr = Number(venta?.duracion_meses ?? venta?.meses_renta);
  if (Number.isFinite(mr) && mr > 0) return Math.max(1, Math.floor(mr));
  const s = String(venta?.fecha_inicio ?? "").slice(0, 10);
  const e = String(venta?.fecha_fin ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !/^\d{4}-\d{2}-\d{2}$/.test(e)) return 1;
  const vi = new Date(`${s}T12:00:00`);
  const vf = new Date(`${e}T12:00:00`);
  if (Number.isNaN(vi.getTime()) || Number.isNaN(vf.getTime())) return 1;
  const n =
    (vf.getFullYear() - vi.getFullYear()) * 12 +
    (vf.getMonth() - vi.getMonth());
  return Math.max(1, n);
}

/**
 * Consideración / precio fijo: cuota mensual = costo total ÷ meses; línea parcial según
 * importe línea vs importe de la venta en ese mes calendario.
 */
function costoLineaConsideracionPrecioFijo(
  venta,
  mes1a12,
  anio,
  importeLinea,
  diaCorte,
  inicioMes,
  finMesStr,
) {
  const cv = Number(venta?.costo_venta ?? venta?.costos ?? 0) || 0;
  if (!(cv > 0) || !(importeLinea > 0)) return 0;
  if (!ventaIncluidaEnMesOrden(venta, mes1a12, anio, diaCorte)) return 0;
  const meses = mesesContratoVenta(venta);
  const cuota = round2(cv / meses);
  const ventaMesFull = importeVentaEnMes(venta, inicioMes, finMesStr);
  const EPS = 0.05;
  if (!(ventaMesFull > 0.01)) return cuota;
  if (Math.abs(importeLinea - ventaMesFull) < EPS) return cuota;
  return round2((cuota * importeLinea) / ventaMesFull);
}

async function subtotalGrupoOrden(
  colaboradorId,
  groupVentas,
  mes1a12,
  anio,
  diaCorte,
) {
  const { inicio, finStr } = boundsMesCalendario(anio, mes1a12);
  const { data: c } = await supabase
    .from("colaboradores")
    .select("tipo_pago:tipo_pago(nombre)")
    .eq("id", colaboradorId)
    .maybeSingle();
  const pctVivo = await porcentajeSocioVivoColaborador(colaboradorId);
  if (colaboradorUsaCostoEnOrden(c)) {
    return round2(
      groupVentas.reduce((sum, v) => {
        if (!ventaIncluidaEnMesOrden(v, mes1a12, anio, diaCorte)) return sum;
        const cv = Number(v.costo_venta ?? v.costos ?? 0) || 0;
        if (!(cv > 0)) return sum;
        const meses = mesesContratoVenta(v);
        return sum + round2(cv / meses);
      }, 0),
    );
  }
  return round2(
    groupVentas.reduce((sum, v) => {
      if (!ventaIncluidaEnMesOrden(v, mes1a12, anio, diaCorte)) return sum;
      const bruto = importeBrutoAplicarPorcentajeEnMes(v, inicio, finStr);
      return sum + importeTrasPorcentajeSocio(v, bruto, c, undefined, pctVivo);
    }, 0),
  );
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
      const ventas = await cargarVentasDeOrden(orden);
      return { ...orden, ventas };
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
  const diaCorte = await obtenerDiaCorteOrdenes();
  const list = data ?? [];
  return list.filter((v) => ventaIncluidaEnMesOrden(v, m, a, diaCorte));
}

export async function generarOrden(mes, anio, userId) {
  const m = Number(mes);
  const a = Number(anio);
  if (!m || m < 1 || m > 12 || !a) return { error: "mes (1-12) y anio son obligatorios" };
  const genPor = await generadoPorSeguro(userId);
  const { inicio, finStr } = boundsMesCalendario(a, m);

  let vq = supabase
    .from("ventas")
    .select(
      "id,colaborador_id,precio_total,costo_venta,costos,fecha_inicio,fecha_fin,porcentaje_socio,duracion_meses,precio_por_mes",
    );
  vq = queryVentasSolapanMes(vq, inicio, finStr);
  const { data: ventas, error: errVentas } = await vq;

  if (errVentas) throw new Error(errVentas.message);
  const diaCorte = await obtenerDiaCorteOrdenes();
  const ventasPeriodo = (ventas ?? []).filter((v) =>
    ventaIncluidaEnMesOrden(v, m, a, diaCorte),
  );
  if (ventasPeriodo.length === 0) return { ordenes: [] };

  // Agrupar ventas por colaborador (Orden de compra por colaborador y mes/año)
  const grupos = new Map();
  for (const v of ventasPeriodo) {
    const key = v.colaborador_id;
    if (!key) continue;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key).push(v);
  }

  const ordenesActualizadas = [];
  for (const [colaboradorId, groupVentas] of grupos.entries()) {
    const ventasIds = groupVentas.map((v) => v.id);
    const subtotal = await subtotalGrupoOrden(
      colaboradorId,
      groupVentas,
      m,
      a,
      diaCorte,
    );
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
    .select(
      "id,colaborador_id,precio_total,costo_venta,costos,fecha_inicio,fecha_fin,porcentaje_socio,duracion_meses,precio_por_mes",
    )
    .eq("colaborador_id", cid);
  vq = queryVentasSolapanMes(vq, inicio, finStr);
  const { data: ventasRows, error: errVentas } = await vq;

  if (errVentas) throw new Error(errVentas.message);
  const diaCorte = await obtenerDiaCorteOrdenes();
  const groupVentasPeriodo = (ventasRows ?? []).filter((v) =>
    ventaIncluidaEnMesOrden(v, m, a, diaCorte),
  );
  if (groupVentasPeriodo.length === 0) return { ordenes: [], sinVentas: true };

  const { data: yaHayOrdenes } = await supabase
    .from("orden_de_compra")
    .select("id")
    .eq("colaborador_id", cid)
    .eq("mes", m)
    .eq("anio", a)
    .limit(1);

  if (yaHayOrdenes?.length) return { ordenes: [], skipped: true };

  const ventasIds = groupVentasPeriodo.map((v) => v.id);
  const subtotal = await subtotalGrupoOrden(
    cid,
    groupVentasPeriodo,
    m,
    a,
    diaCorte,
  );
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
  const diaCorteManual = await obtenerDiaCorteOrdenes();
  const { inicio: inicioMesManual, finStr: finMesManual } = boundsMesCalendario(
    a,
    m,
  );

  const ventasIds = Array.isArray(ventas_ids)
    ? ventas_ids.map((x) => String(x).trim()).filter(Boolean)
    : [];
  if (ventasIds.length === 0) return { error: "Selecciona al menos una venta o pantalla" };

  const ivaPct =
    iva_porcentaje != null && !Number.isNaN(Number(iva_porcentaje))
      ? round2(Number(iva_porcentaje))
      : null;

  const { data: ventasRows, error: errV } = await supabase
    .from("ventas")
    .select(
      "id,colaborador_id,estado_venta,precio_total,costo_venta,costos,porcentaje_socio,fecha_inicio,fecha_fin,duracion_meses,precio_por_mes",
    )
    .in("id", ventasIds);
  if (errV) throw new Error(errV.message);
  const list = ventasRows ?? [];
  if (list.length !== ventasIds.length) return { error: "Una o más ventas no existen" };
  for (const v of list) {
    if (String(v.colaborador_id) !== String(cid)) {
      return { error: "Todas las ventas deben pertenecer al colaborador seleccionado" };
    }
    if (String(v.estado_venta ?? "").toLowerCase() !== "aceptado") {
      return { error: "Solo se pueden crear órdenes con ventas en estado Aceptado" };
    }
  }

  const { data: colabOrdenRow } = await supabase
    .from("colaboradores")
    .select("tipo_pago:tipo_pago(nombre)")
    .eq("id", cid)
    .maybeSingle();
  const pctVivoCrear = await porcentajeSocioVivoColaborador(cid);

  let subRecalc = round2(subtotal);
  if (Array.isArray(detalle_lineas) && detalle_lineas.length > 0) {
    const usarCosto = colaboradorUsaCostoEnOrden(colabOrdenRow);
    let sumB = 0;
    for (const line of detalle_lineas) {
      const wid = String(line.venta_id ?? "");
      const ventaRow = list.find((x) => String(x.id) === wid);
      const imp = Number(line.importe) || 0;
      const aplicarPct = line.aplicar_porcentaje_socio;
      /** El front envía `importe` = precio de venta del mes (o prorrateo); el % se aplica por venta sobre eso. */
      let basePct = imp;
      if (
        !usarCosto &&
        colaboradorEsTipoPorcentaje(colabOrdenRow) &&
        !(basePct > 0) &&
        ventaRow
      ) {
        basePct = importeBrutoAplicarPorcentajeEnMes(
          ventaRow,
          inicioMesManual,
          finMesManual,
        );
      }
      const psLinea =
        line.porcentaje_socio_aplicado ?? line.porcentajeSocioAplicado;
      const ventaParaPct =
        ventaRow &&
        psLinea != null &&
        psLinea !== "" &&
        Number.isFinite(Number(psLinea))
          ? { ...ventaRow, porcentaje_socio: Number(psLinea) }
          : ventaRow;
      sumB += usarCosto
        ? costoLineaConsideracionPrecioFijo(
            ventaRow,
            m,
            a,
            imp,
            diaCorteManual,
            inicioMesManual,
            finMesManual,
          )
        : importeTrasPorcentajeSocio(
            ventaParaPct,
            basePct,
            colabOrdenRow,
            aplicarPct,
            pctVivoCrear,
          );
    }
    subRecalc = round2(sumB);
  }
  const ivRecalc = round2(
    subRecalc * (ivaPct != null ? ivaPct / 100 : IVA_RATE),
  );
  const totRecalc = round2(subRecalc + ivRecalc);

  const payload = {
    colaborador_id: cid,
    mes: m,
    anio: a,
    ventas_ids: ventasIds,
    subtotal: subRecalc,
    iva: ivRecalc,
    total: totRecalc,
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

  const ventas = await cargarVentasDeOrden(ordenFull);
  const detalleLineasRespuesta =
    Array.isArray(detalle_lineas) && detalle_lineas.length > 0
      ? detalle_lineas
      : ordenFull.detalle_lineas;

  return {
    orden: {
      ...ordenFull,
      ...(detalleLineasRespuesta
        ? { detalle_lineas: detalleLineasRespuesta }
        : {}),
      ventas,
    },
  };
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
