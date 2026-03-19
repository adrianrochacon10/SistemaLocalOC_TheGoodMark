import { supabase } from "../config/supabase.js";

const SELECT_VENTAS =
  "*, colaborador:colaboradores(id, nombre, email, telefono, pantalla_id, producto_id, pantalla:pantallas(id, nombre), producto:productos(id, nombre, precio)), vendedor:perfiles(id, nombre, email), tipo_pago(id, nombre), orden_de_compra:orden_de_compra(id, mes, anio, subtotal, iva, total)";

const ORDEN_SELECT =
  "*, colaborador:colaboradores(id, nombre, email, telefono, pantalla_id, producto_id, pantalla:pantallas(id, nombre), producto:productos(id, nombre, precio))";

function rangoMes(anio, mes) {
  const inicio = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const fin = new Date(anio, mes, 0);
  const finStr = fin.toISOString().slice(0, 10);
  return { inicio, finStr };
}

/** Solape con el mes: la venta cruza el rango [inicio, finStr] */
function filtroVentasEnMes(q, anio, mes) {
  const { inicio, finStr } = rangoMes(anio, mes);
  return q.lte("fecha_inicio", finStr).gte("fecha_fin", inicio);
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

/**
 * @param {{ mes?: number, anio?: number, colaborador_id?: string }} filtros
 */
export async function listar(filtros = {}) {
  const { mes, anio, colaborador_id } = filtros;
  let q = supabase.from("orden_de_compra").select(ORDEN_SELECT);
  if (mes && mes >= 1 && mes <= 12) q = q.eq("mes", mes);
  if (anio) q = q.eq("anio", anio);
  if (colaborador_id) q = q.eq("colaborador_id", colaborador_id);
  const { data: ordenes, error } = await q
    .order("anio", { ascending: false })
    .order("mes", { ascending: false });
  if (error) throw new Error(error.message);
  if (!ordenes?.length) return [];

  const ordenesConVentas = await Promise.all(
    ordenes.map(async (orden) => {
      const { data: ventas } = await supabase
        .from("ventas")
        .select(SELECT_VENTAS)
        .eq("orden_de_compra_id", orden.id)
        .order("fecha_inicio");
      return { ...orden, ventas: ventas ?? [] };
    })
  );
  return ordenesConVentas;
}

/**
 * Ventas del colaborador (opcional) que solapan el mes/año
 */
export async function listarVentasPorMes(mes, anio, colaborador_id) {
  const m = Number(mes);
  const a = Number(anio);
  if (!m || m < 1 || m > 12 || !a) throw new Error("mes (1-12) y anio son obligatorios");
  let q = supabase.from("ventas").select(SELECT_VENTAS);
  q = filtroVentasEnMes(q, a, m);
  if (colaborador_id) q = q.eq("colaborador_id", colaborador_id);
  const { data, error } = await q.order("fecha_inicio");
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Genera o actualiza orden_de_compra para un colaborador y mes/año.
 * Suma precio_total de ventas en ese periodo; IVA 16%; enlaza ventas.
 */
export async function generarOrden(colaborador_id, mes, anio, userId) {
  const cid = colaborador_id?.trim?.() || colaborador_id;
  const m = Number(mes);
  const a = Number(anio);
  if (!cid) return { error: "colaborador_id es obligatorio" };
  if (!m || m < 1 || m > 12 || !a) return { error: "mes (1-12) y anio son obligatorios" };

  let q = supabase
    .from("ventas")
    .select("id, precio_total")
    .eq("colaborador_id", cid);
  q = filtroVentasEnMes(q, a, m);
  const { data: ventasRows, error: errVentas } = await q;
  if (errVentas) throw new Error(errVentas.message);

  const ventasIds = (ventasRows ?? []).map((v) => v.id);
  const subtotal = round2(
    (ventasRows ?? []).reduce((s, v) => s + Number(v.precio_total || 0), 0)
  );
  const iva = round2(subtotal * 0.16);
  const total = round2(subtotal + iva);
  const ventas_ids = ventasIds;

  const { data: orden, error: errOrden } = await supabase
    .from("orden_de_compra")
    .upsert(
      {
        colaborador_id: cid,
        mes: m,
        anio: a,
        subtotal,
        iva,
        total,
        ventas_ids,
        generado_por: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "colaborador_id,mes,anio" }
    )
    .select()
    .single();

  if (errOrden) throw new Error(errOrden.message);

  await supabase.from("ventas").update({ orden_de_compra_id: null }).eq("orden_de_compra_id", orden.id);

  if (ventasIds.length > 0) {
    await supabase.from("ventas").update({ orden_de_compra_id: orden.id }).in("id", ventasIds);
  }

  return { orden, ventas_ids: ventasIds };
}

export async function obtenerConVentas(id) {
  const { data: orden, error } = await supabase
    .from("orden_de_compra")
    .select(ORDEN_SELECT)
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  if (!orden) return null;
  const { data: ventas } = await supabase
    .from("ventas")
    .select(SELECT_VENTAS)
    .eq("orden_de_compra_id", id)
    .order("fecha_inicio");
  return { ...orden, ventas: ventas ?? [] };
}
