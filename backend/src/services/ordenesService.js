import { supabase } from "../config/supabase.js";

const IVA_RATE = 0.16;

const SELECT_ORDENES = "*, colaborador:colaboradores(id,nombre)";
const SELECT_VENTAS =
  "*, colaborador:colaboradores(id,nombre,pantalla:pantallas(id,nombre),producto:productos(id,nombre,precio))";

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
  const inicio = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const fin = new Date(anio, mes, 0);
  const finStr = fin.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("ventas")
    .select(SELECT_VENTAS)
    .gte("fecha_inicio", inicio)
    .lte("fecha_fin", finStr)
    .order("fecha_inicio");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function generarOrden(mes, anio, userId) {
  const m = Number(mes);
  const a = Number(anio);
  if (!m || m < 1 || m > 12 || !a) return { error: "mes (1-12) y anio son obligatorios" };
  const inicio = `${a}-${String(m).padStart(2, "0")}-01`;
  const fin = new Date(a, m, 0);
  const finStr = fin.toISOString().slice(0, 10);

  const { data: ventas, error: errVentas } = await supabase
    .from("ventas")
    .select("id,colaborador_id,precio_total")
    .gte("fecha_inicio", inicio)
    .lte("fecha_fin", finStr);

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
    const subtotalRaw = groupVentas.reduce((sum, v) => sum + (Number(v.precio_total) || 0), 0);
    const subtotal = Math.round(subtotalRaw * 100) / 100;
    const iva = Math.round(subtotal * IVA_RATE * 100) / 100;
    const total = Math.round((subtotal + iva) * 100) / 100;

    // Buscar orden existente (evita depender de constraints/unique de upsert)
    const { data: existing } = await supabase
      .from("orden_de_compra")
      .select("id")
      .eq("colaborador_id", colaboradorId)
      .eq("mes", m)
      .eq("anio", a)
      .limit(1);

    if (existing?.[0]?.id) {
      const ordenId = existing[0].id;
      await supabase.from("orden_de_compra").update({ ventas_ids: ventasIds, subtotal, iva, total, generado_por: userId }).eq("id", ordenId);
      const { data: orden } = await supabase.from("orden_de_compra").select(SELECT_ORDENES).eq("id", ordenId).single();
      await supabase.from("ventas").update({ orden_de_compra_id: ordenId }).in("id", ventasIds);
      ordenesActualizadas.push(orden);
    } else {
      const { data: orden, error: errInsert } = await supabase
        .from("orden_de_compra")
        .insert({
          colaborador_id: colaboradorId,
          mes: m,
          anio: a,
          ventas_ids: ventasIds,
          subtotal,
          iva,
          total,
          generado_por: userId,
        })
        .select(SELECT_ORDENES)
        .single();

      if (errInsert) throw new Error(errInsert.message);

      await supabase.from("ventas").update({ orden_de_compra_id: orden.id }).in("id", ventasIds);
      ordenesActualizadas.push(orden);
    }
  }

  return { ordenes: ordenesActualizadas };
}
