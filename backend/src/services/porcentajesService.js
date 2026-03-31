import { supabase } from "../config/supabase.js";

export async function listar() {
  const { data, error } = await supabase
    .from("porcentajes")
    .select("*, tipo_pago:tipo_pago(id, nombre)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Crea o actualiza el porcentaje del colaborador: un solo registro por colaborador
 * (identificado por colaborador_id en el body o por descripción estable).
 */
export async function crear(valor, descripcion, colaboradorId) {
  const valorNum = Number(valor);
  if (!Number.isFinite(valorNum) || valorNum < 0 || valorNum > 100) {
    return { error: "valor debe ser un numero entre 0 y 100" };
  }

  const { data: tp, error: errTp } = await supabase
    .from("tipo_pago")
    .select("id")
    .eq("nombre", "porcentaje")
    .single();
  if (errTp || !tp) throw new Error("Tipo de pago 'porcentaje' no encontrado");

  const descripcionLimpia =
    typeof descripcion === "string" ? descripcion.trim() : "";
  const idColab =
    colaboradorId != null && String(colaboradorId).trim()
      ? String(colaboradorId).trim()
      : "";

  // 1) Por ID de colaborador: filas cuya descripción incluya el UUID, o (legado) la descripción exacta por nombre.
  if (idColab) {
    let lista = [];

    const { data: porColab, error: errColab } = await supabase
      .from("porcentajes")
      .select("id, created_at, descripcion")
      .eq("tipo_pago_id", tp.id)
      .ilike("descripcion", `%${idColab}%`)
      .order("created_at", { ascending: false });
    if (errColab) throw new Error(errColab.message);
    lista = Array.isArray(porColab) ? porColab : [];

    if (lista.length === 0) {
      const { data: rowColab, error: errNombre } = await supabase
        .from("colaboradores")
        .select("nombre")
        .eq("id", idColab)
        .maybeSingle();
      if (!errNombre && rowColab?.nombre) {
        const descLegacy = `Porcentaje para colaborador ${String(rowColab.nombre).trim()}`;
        const { data: porLegacy, error: errLegacy } = await supabase
          .from("porcentajes")
          .select("id, created_at, descripcion")
          .eq("tipo_pago_id", tp.id)
          .eq("descripcion", descLegacy)
          .order("created_at", { ascending: false });
        if (errLegacy) throw new Error(errLegacy.message);
        lista = Array.isArray(porLegacy) ? porLegacy : [];
      }
    }

    if (lista.length > 0) {
      const keepId = lista[0].id;
      const borrarIds = lista.slice(1).map((r) => r.id).filter(Boolean);
      if (borrarIds.length > 0) {
        await supabase.from("porcentajes").delete().in("id", borrarIds);
      }
      const patch = { valor: valorNum };
      if (descripcionLimpia) patch.descripcion = descripcionLimpia;
      const { data, error } = await supabase
        .from("porcentajes")
        .update(patch)
        .eq("id", keepId)
        .select("*, tipo_pago:tipo_pago(id, nombre)")
        .single();
      if (error) throw new Error(error.message);
      return { data };
    }
  }

  // 2) Misma descripción exacta (compatibilidad).
  if (descripcionLimpia) {
    const { data: existente, error: errExistente } = await supabase
      .from("porcentajes")
      .select("id")
      .eq("tipo_pago_id", tp.id)
      .eq("descripcion", descripcionLimpia)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (errExistente) throw new Error(errExistente.message);

    if (existente?.id) {
      const { data, error } = await supabase
        .from("porcentajes")
        .update({ valor: valorNum })
        .eq("id", existente.id)
        .select("*, tipo_pago:tipo_pago(id, nombre)")
        .single();
      if (error) throw new Error(error.message);
      return { data };
    }
  }

  const { data, error } = await supabase
    .from("porcentajes")
    .insert({
      tipo_pago_id: tp.id,
      valor: valorNum,
      descripcion: descripcionLimpia || null,
    })
    .select("*, tipo_pago:tipo_pago(id, nombre)")
    .single();
  if (error) throw new Error(error.message);
  return { data };
}
