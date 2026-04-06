import { supabase } from "../config/supabase.js";

const TABLA = "costos_administrativos";

function normalizarTexto(v) {
  return String(v ?? "").trim();
}

export async function listar(filtros = {}) {
  let q = supabase.from(TABLA).select("*").order("fecha", { ascending: false });

  const mes = Number(filtros.mes);
  const anio = Number(filtros.anio);
  const categoria = normalizarTexto(filtros.categoria);
  const fechaDesde = normalizarTexto(filtros.fecha_desde);
  const fechaHasta = normalizarTexto(filtros.fecha_hasta);

  if (Number.isFinite(mes) && mes >= 1 && mes <= 12) q = q.eq("mes", mes);
  if (Number.isFinite(anio) && anio >= 2000 && anio <= 3000) q = q.eq("anio", anio);
  if (categoria) {
    const esc = categoria.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
    q = q.ilike("categoria", `%${esc}%`);
  }
  if (fechaDesde) q = q.gte("fecha", fechaDesde);
  if (fechaHasta) q = q.lte("fecha", fechaHasta);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function crear(body) {
  const fecha = normalizarTexto(body.fecha);
  const mes = Number(body.mes);
  const anio = Number(body.anio);
  const importe = Number(body.importe);
  const categoria = normalizarTexto(body.categoria);
  const nota = body.nota != null ? normalizarTexto(body.nota) : null;

  if (!fecha) return { error: "fecha es obligatoria" };
  if (!Number.isFinite(mes) || mes < 1 || mes > 12) return { error: "mes debe ser 1-12" };
  if (!Number.isFinite(anio) || anio < 2000 || anio > 3000) {
    return { error: "anio fuera de rango (2000-3000)" };
  }
  if (!Number.isFinite(importe) || importe < 0) return { error: "importe debe ser >= 0" };
  if (!categoria) return { error: "categoria es obligatoria" };

  const payload = {
    fecha,
    mes: Math.trunc(mes),
    anio: Math.trunc(anio),
    importe: Math.round(importe * 100) / 100,
    categoria,
    nota,
  };

  const { data, error } = await supabase
    .from(TABLA)
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return { data };
}

export async function actualizar(id, body) {
  if (!id) return { error: "id es obligatorio" };

  const payload = { updated_at: new Date().toISOString() };
  if (body.fecha !== undefined) payload.fecha = normalizarTexto(body.fecha);
  if (body.mes !== undefined) payload.mes = Math.trunc(Number(body.mes));
  if (body.anio !== undefined) payload.anio = Math.trunc(Number(body.anio));
  if (body.importe !== undefined) payload.importe = Math.round(Number(body.importe) * 100) / 100;
  if (body.categoria !== undefined) payload.categoria = normalizarTexto(body.categoria);
  if (body.nota !== undefined) payload.nota = body.nota == null ? null : normalizarTexto(body.nota);

  if (payload.fecha !== undefined && !payload.fecha) return { error: "fecha invalida" };
  if (payload.mes !== undefined && (!Number.isFinite(payload.mes) || payload.mes < 1 || payload.mes > 12)) {
    return { error: "mes debe ser 1-12" };
  }
  if (
    payload.anio !== undefined &&
    (!Number.isFinite(payload.anio) || payload.anio < 2000 || payload.anio > 3000)
  ) {
    return { error: "anio fuera de rango (2000-3000)" };
  }
  if (payload.importe !== undefined && (!Number.isFinite(payload.importe) || payload.importe < 0)) {
    return { error: "importe debe ser >= 0" };
  }
  if (payload.categoria !== undefined && !payload.categoria) {
    return { error: "categoria no puede quedar vacia" };
  }

  const { data, error } = await supabase
    .from(TABLA)
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (String(error.code ?? "") === "PGRST116") return { error: "Registro no encontrado" };
    throw new Error(error.message);
  }
  return { data };
}

export async function eliminar(id) {
  if (!id) return { error: "id es obligatorio" };
  const { error } = await supabase.from(TABLA).delete().eq("id", id);
  if (error) throw new Error(error.message);
  return {};
}
