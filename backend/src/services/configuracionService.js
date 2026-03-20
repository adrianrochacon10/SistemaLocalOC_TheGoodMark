export const obtener = async () => {
  const { data, error } = await supabase
    .from("configuracion")
    .select("*")
    .limit(1)
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const guardar = async (body) => {
  const payload = {
    nombre_empresa: body.nombreEmpresa,
    rfc: body.rfc ?? null,
    direccion: body.direccion ?? null,
    telefono: body.telefono ?? null,
    email: body.email ?? null,
    iva_percentaje: body.ivaPercentaje ?? 16,
    activo: body.activo ?? true,
  };

  // Intentar actualizar el registro existente primero
  const { data: existing } = await supabase
    .from("configuracion")
    .select("id")
    .limit(1)
    .single();

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

  // Si no existe, insertar
  const { data, error } = await supabase
    .from("configuracion")
    .insert(payload)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};
