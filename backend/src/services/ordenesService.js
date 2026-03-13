import { supabase } from "../config/supabase.js";

const SELECT_VENTAS =
  "*, cliente:clientes(id, nombre, email, telefono), pantalla:pantallas(id, nombre), producto:productos(id, nombre, precio), vendedor:perfiles(id, nombre, email), tipo_pago(id, nombre), orden_mes:ordenes_mes(id, mes, anio)";

export async function listar(mes, anio) {
  let q = supabase.from("ordenes_mes").select("*");
  if (mes && mes >= 1 && mes <= 12) q = q.eq("mes", mes);
  if (anio) q = q.eq("anio", anio);
  const { data: ordenes, error } = await q.order("anio", { ascending: false }).order("mes", { ascending: false });
  if (error) throw new Error(error.message);
  if (!ordenes?.length) return [];

  const ordenesConVentas = await Promise.all(
    ordenes.map(async (orden) => {
      const { data: ventas } = await supabase
        .from("ventas")
        .select(SELECT_VENTAS)
        .eq("orden_mes_id", orden.id)
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
    .select("id")
    .gte("fecha_inicio", inicio)
    .lte("fecha_fin", finStr);
  if (errVentas) throw new Error(errVentas.message);
  const ventasIds = (ventas ?? []).map((v) => v.id);
  const { data: orden, error: errOrden } = await supabase
    .from("ordenes_mes")
    .upsert({ mes: m, anio: a, generado_por: userId }, { onConflict: "mes,anio" })
    .select()
    .single();
  if (errOrden) throw new Error(errOrden.message);
  if (orden?.id && ventasIds.length > 0) {
    await supabase
      .from("ventas")
      .update({ orden_mes_id: orden.id, orden_mes_fecha: inicio })
      .in("id", ventasIds);
  }
  return { orden, ventas_ids: ventasIds };
}
