import { supabase } from "../config/supabase.js";

function errorColumnaPrecioDia(error) {
  return /habilitar_precio_por_dia|tarifas_dias|schema cache/i.test(
    String(error?.message ?? ""),
  );
}

function payloadCompatSinCamposNuevos(payload) {
  const { habilitar_precio_por_dia, tarifas_dias, ...rest } = payload;
  return rest;
}

function normalizarTarifasDias(raw) {
  if (!Array.isArray(raw)) {
    return [
      { dias: 1, precio: 0 },
      { dias: 3, precio: 0 },
      { dias: 7, precio: 0 },
      { dias: 15, precio: 0 },
    ];
  }
  const out = raw
    .map((r) => ({
      dias: Math.max(1, Number(r?.dias) || 0),
      precio: Math.max(0, Number(r?.precio) || 0),
    }))
    .filter((r) => Number.isFinite(r.dias) && Number.isFinite(r.precio))
    .sort((a, b) => a.dias - b.dias);
  if (out.length > 0) return out;
  return [
    { dias: 1, precio: 0 },
    { dias: 3, precio: 0 },
    { dias: 7, precio: 0 },
    { dias: 15, precio: 0 },
  ];
}

export const obtener = async () => {
  const { data, error } = await supabase
    .from("configuracion")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ?? {
    nombre_empresa: "",
    rfc: null,
    direccion: null,
    telefono: null,
    email: null,
    iva_percentaje: 16,
    habilitar_precio_por_dia: false,
    tarifas_dias: normalizarTarifasDias(null),
    dia_corte_ordenes: 20,
    activo: true,
  };
};

export const guardar = async (body) => {
  const payload = {
    nombre_empresa: body.nombreEmpresa,
    rfc: body.rfc ?? null,
    direccion: body.direccion ?? null,
    telefono: body.telefono ?? null,
    email: body.email ?? null,
    iva_percentaje: body.ivaPercentaje ?? 16,
    habilitar_precio_por_dia: body.habilitarPrecioPorDia ?? false,
    tarifas_dias: normalizarTarifasDias(body.tarifasDias),
    dia_corte_ordenes:
      body.diaCorteOrdenes != null ? Number(body.diaCorteOrdenes) : 20,
    activo: body.activo ?? true,
  };

  const { data: existing } = await supabase
    .from("configuracion")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    let { data, error } = await supabase
      .from("configuracion")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error && errorColumnaPrecioDia(error)) {
      const sinPrecioDia = payloadCompatSinCamposNuevos(payload);
      const r2 = await supabase
        .from("configuracion")
        .update(sinPrecioDia)
        .eq("id", existing.id)
        .select()
        .single();
      data = r2.data;
      error = r2.error;
    }
    if (error) throw new Error(error.message);
    return data;
  }

  let { data, error } = await supabase
    .from("configuracion")
    .insert(payload)
    .select()
    .single();
  if (error && errorColumnaPrecioDia(error)) {
    const sinPrecioDia = payloadCompatSinCamposNuevos(payload);
    const r2 = await supabase
      .from("configuracion")
      .insert(sinPrecioDia)
      .select()
      .single();
    data = r2.data;
    error = r2.error;
  }
  if (error) throw new Error(error.message);
  return data;
};
