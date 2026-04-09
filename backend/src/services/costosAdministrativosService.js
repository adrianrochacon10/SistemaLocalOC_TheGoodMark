import { supabase } from "../config/supabase.js";

const TABLA = "costos_administrativos";

function normalizarTexto(v) {
  return String(v ?? "").trim();
}

function mapFilaCosto(row) {
  if (!row) return row;
  const cat = row.costos_categoria;
  const asoc = row.costos_categoria_asociado;
  const categoriaTipo = cat?.tipo ?? "";
  const asociadoNombre = asoc?.nombre ?? null;
  const categoriaDisplay = [categoriaTipo, asociadoNombre].filter(Boolean).join(" · ");
  const rest = { ...row };
  delete rest.costos_categoria;
  delete rest.costos_categoria_asociado;
  return {
    ...rest,
    categoria_tipo: categoriaTipo,
    asociado_nombre: asociadoNombre,
    categoria: categoriaDisplay,
  };
}

export async function listar(filtros = {}) {
  const mes = Number(filtros.mes);
  const anio = Number(filtros.anio);
  const categoriaIdFilt = normalizarTexto(filtros.categoria_id);
  const asociadoIdFilt = normalizarTexto(filtros.asociado_id);
  const sinAsociado =
    filtros.sin_asociado === "1" ||
    filtros.sin_asociado === "true" ||
    filtros.sin_asociado === true;
  const categoriaBusq = normalizarTexto(filtros.categoria);
  const fechaDesde = normalizarTexto(filtros.fecha_desde);
  const fechaHasta = normalizarTexto(filtros.fecha_hasta);

  let idsCatMatch = null;
  let idsAsocMatch = null;
  if (!categoriaIdFilt && categoriaBusq) {
    const esc = categoriaBusq.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
    const pat = `%${esc}%`;
    const [{ data: rowsCat }, { data: rowsAsoc }] = await Promise.all([
      supabase.from("costos_categoria").select("id").ilike("tipo", pat),
      supabase.from("costos_categoria_asociado").select("id").ilike("nombre", pat),
    ]);
    idsCatMatch = (rowsCat ?? []).map((r) => r.id);
    idsAsocMatch = (rowsAsoc ?? []).map((r) => r.id);
    if (idsCatMatch.length === 0 && idsAsocMatch.length === 0) {
      return [];
    }
  }

  let q = supabase
    .from(TABLA)
    .select(
      `
      *,
      costos_categoria ( tipo ),
      costos_categoria_asociado ( nombre, categoria_id )
    `,
    )
    .order("fecha", { ascending: false });

  if (Number.isFinite(mes) && mes >= 1 && mes <= 12) q = q.eq("mes", mes);
  if (Number.isFinite(anio) && anio >= 2000 && anio <= 3000) q = q.eq("anio", anio);

  if (categoriaIdFilt) {
    q = q.eq("categoria_id", categoriaIdFilt);
    if (sinAsociado) {
      q = q.is("asociado_id", null);
    } else if (asociadoIdFilt) {
      q = q.eq("asociado_id", asociadoIdFilt);
    }
  } else if (sinAsociado) {
    q = q.is("asociado_id", null);
  } else if (asociadoIdFilt) {
    q = q.eq("asociado_id", asociadoIdFilt);
  }

  if (!categoriaIdFilt && idsCatMatch !== null) {
    if (idsCatMatch.length && idsAsocMatch.length) {
      q = q.or(
        `categoria_id.in.(${idsCatMatch.join(",")}),asociado_id.in.(${idsAsocMatch.join(",")})`,
      );
    } else if (idsCatMatch.length) {
      q = q.in("categoria_id", idsCatMatch);
    } else {
      q = q.in("asociado_id", idsAsocMatch);
    }
  }

  if (fechaDesde) q = q.gte("fecha", fechaDesde);
  if (fechaHasta) q = q.lte("fecha", fechaHasta);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapFilaCosto);
}

async function validarAsociadoEnCategoria(categoriaId, asociadoId) {
  if (!asociadoId) return { ok: true };
  const { data, error } = await supabase
    .from("costos_categoria_asociado")
    .select("id, categoria_id")
    .eq("id", asociadoId)
    .single();
  if (error || !data) return { error: "asociado no encontrado" };
  if (data.categoria_id !== categoriaId) {
    return { error: "El asociado no pertenece a la categoría indicada" };
  }
  return { ok: true };
}

export async function crear(body) {
  const fechaRaw = normalizarTexto(body.fecha);
  const mes = Number(body.mes);
  const anio = Number(body.anio);
  const importe = Number(body.importe);
  const categoriaId = normalizarTexto(body.categoria_id);
  const asociadoId = body.asociado_id != null && String(body.asociado_id).trim() !== ""
    ? normalizarTexto(body.asociado_id)
    : null;
  const nota = body.nota != null ? normalizarTexto(body.nota) : null;

  if (!Number.isFinite(mes) || mes < 1 || mes > 12) return { error: "mes debe ser 1-12" };
  if (!Number.isFinite(anio) || anio < 2000 || anio > 3000) {
    return { error: "anio fuera de rango (2000-3000)" };
  }
  if (!Number.isFinite(importe) || importe < 0) return { error: "importe debe ser >= 0" };
  if (!categoriaId) return { error: "categoria_id es obligatoria" };
  if (!asociadoId) return { error: "asociado_id es obligatorio" };

  const v = await validarAsociadoEnCategoria(categoriaId, asociadoId);
  if (v.error) return { error: v.error };

  const fecha = fechaRaw || `${Math.trunc(anio)}-${String(Math.trunc(mes)).padStart(2, "0")}-01`;

  const payload = {
    fecha,
    mes: Math.trunc(mes),
    anio: Math.trunc(anio),
    importe: Math.round(importe * 100) / 100,
    categoria_id: categoriaId,
    asociado_id: asociadoId,
    nota,
  };

  const { data, error } = await supabase
    .from(TABLA)
    .insert(payload)
    .select(
      `
      *,
      costos_categoria ( tipo ),
      costos_categoria_asociado ( nombre, categoria_id )
    `,
    )
    .single();

  if (error) throw new Error(error.message);
  return { data: mapFilaCosto(data) };
}

export async function actualizar(id, body) {
  if (!id) return { error: "id es obligatorio" };

  const { data: existente, error: exErr } = await supabase
    .from(TABLA)
    .select("categoria_id, asociado_id, mes, anio")
    .eq("id", id)
    .single();
  if (exErr || !existente) return { error: "Registro no encontrado" };

  const payload = { updated_at: new Date().toISOString() };
  if (body.fecha !== undefined) {
    payload.fecha =
      body.fecha == null || String(body.fecha).trim() === ""
        ? null
        : normalizarTexto(body.fecha);
  }
  if (body.mes !== undefined) payload.mes = Math.trunc(Number(body.mes));
  if (body.anio !== undefined) payload.anio = Math.trunc(Number(body.anio));
  if (body.importe !== undefined) payload.importe = Math.round(Number(body.importe) * 100) / 100;
  if (body.nota !== undefined) payload.nota = body.nota == null ? null : normalizarTexto(body.nota);

  let categoriaId = null;
  if (body.categoria_id !== undefined) {
    payload.categoria_id = normalizarTexto(body.categoria_id);
    categoriaId = payload.categoria_id;
    if (!payload.categoria_id) return { error: "categoria_id no puede quedar vacía" };
  }

  if (body.asociado_id !== undefined) {
    const raw = body.asociado_id;
    payload.asociado_id =
      raw == null || String(raw).trim() === "" ? null : normalizarTexto(raw);
  }

  if (payload.fecha !== undefined && payload.fecha !== null && !payload.fecha) {
    return { error: "fecha invalida" };
  }
  if (payload.mes !== undefined && (!Number.isFinite(payload.mes) || payload.mes < 1 || payload.mes > 12)) {
    return { error: "mes debe ser 1-12" };
  }
  if (
    payload.anio !== undefined &&
    (!Number.isFinite(payload.anio) || payload.anio < 2000 || payload.anio > 3000)
  ) {
    return { error: "anio fuera de rango (2000-3000)" };
  }
  if (payload.fecha === null) {
    const mesFinal = Number(payload.mes ?? existente.mes);
    const anioFinal = Number(payload.anio ?? existente.anio);
    if (!Number.isFinite(mesFinal) || mesFinal < 1 || mesFinal > 12) {
      return { error: "mes debe ser 1-12 para calcular fecha" };
    }
    if (!Number.isFinite(anioFinal) || anioFinal < 2000 || anioFinal > 3000) {
      return { error: "anio fuera de rango (2000-3000)" };
    }
    payload.fecha = `${Math.trunc(anioFinal)}-${String(Math.trunc(mesFinal)).padStart(2, "0")}-01`;
  }
  if (payload.importe !== undefined && (!Number.isFinite(payload.importe) || payload.importe < 0)) {
    return { error: "importe debe ser >= 0" };
  }

  const catFinal = categoriaId ?? existente.categoria_id;
  const asocFinal =
    payload.asociado_id !== undefined ? payload.asociado_id : existente.asociado_id ?? null;

  if (catFinal) {
    const v = await validarAsociadoEnCategoria(catFinal, asocFinal);
    if (v.error) return { error: v.error };
  }

  const { data, error } = await supabase
    .from(TABLA)
    .update(payload)
    .eq("id", id)
    .select(
      `
      *,
      costos_categoria ( tipo ),
      costos_categoria_asociado ( nombre, categoria_id )
    `,
    )
    .single();

  if (error) {
    if (String(error.code ?? "") === "PGRST116") return { error: "Registro no encontrado" };
    throw new Error(error.message);
  }

  return { data: mapFilaCosto(data) };
}

export async function eliminar(id) {
  if (!id) return { error: "id es obligatorio" };
  const { error } = await supabase.from(TABLA).delete().eq("id", id);
  if (error) throw new Error(error.message);
  return {};
}
