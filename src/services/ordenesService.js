import { supabase } from "../config/supabase.js";

const SELECT_VENTAS =
  "*, colaborador:colaboradores(id, nombre, email, telefono, contacto, tipo_pdf, pantalla:pantallas(id, nombre), producto:productos(id, nombre, precio)), vendedor:perfiles(id, nombre, email)";

export async function listar(mes, anio) {
  let q = supabase.from("ordenes_compra").select("*");
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

export async function generarOrden(mes, anio, userId) {
  const m = Number(mes);
  const a = Number(anio);
  if (!m || m < 1 || m > 12 || !a) return { error: "mes (1-12) y anio son obligatorios" };
  const inicio = `${a}-${String(m).padStart(2, "0")}-01`;
  const fin = new Date(a, m, 0);
  const finStr = fin.toISOString().slice(0, 10);

  const { data: ventas, error: errVentas } = await supabase
    .from("ventas")
    .select("id, colaborador_id, colaborador:colaboradores(id, nombre, tipo_pdf)")
    .gte("fecha_inicio", inicio)
    .lte("fecha_fin", finStr);
  if (errVentas) throw new Error(errVentas.message);
  const ventasIds = (ventas ?? []).map((v) => v.id);
  const porTipoPdf = {
    1: (ventas ?? []).filter((v) => v.colaborador?.tipo_pdf === 1),
    2: (ventas ?? []).filter((v) => v.colaborador?.tipo_pdf === 2),
  };
  const { data: orden, error: errOrden } = await supabase
    .from("ordenes_compra")
    .upsert({ mes: m, anio: a, ventas_ids: ventasIds, generado_por: userId }, { onConflict: "mes,anio" })
    .select()
    .single();
  if (errOrden) throw new Error(errOrden.message);
  return { orden, ventas_ids: ventasIds, por_tipo_pdf: porTipoPdf };
}
