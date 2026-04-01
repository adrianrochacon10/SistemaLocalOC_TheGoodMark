import { supabase } from "../config/supabase.js";

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
    const { data, error } = await supabase
      .from("configuracion")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  const { data, error } = await supabase
    .from("configuracion")
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};
