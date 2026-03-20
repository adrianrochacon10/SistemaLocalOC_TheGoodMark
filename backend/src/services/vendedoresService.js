import { supabase } from "../config/supabase.js";

export async function listar() {
  const { data, error } = await supabase
    .from("perfiles")
    .select("id, nombre, email, rol")
    .order("nombre");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function crear(nombre, email, password, rol) {
  if (!nombre?.trim()) return { error: "Nombre es obligatorio" };
  if (!email?.trim()) return { error: "Email es obligatorio" };
  if (!password) return { error: "Contrasena es obligatoria" };
  const rolFinal = rol === "admin" ? "admin" : "vendedor";

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: { nombre: nombre.trim(), rol: rolFinal },
  });
  if (authError) return { error: authError.message };
  if (!authData?.user) return { error: "Error al crear usuario" };
  const user = authData.user;
  await supabase.from("perfiles").upsert(
    { id: user.id, nombre: nombre.trim(), email: user.email, rol: rolFinal },
    { onConflict: "id" }
  );
  const { data: perfil } = await supabase.from("perfiles").select("id, nombre, email, rol").eq("id", user.id).single();
  return {
    data: {
      id: user.id,
      nombre: perfil?.nombre ?? nombre.trim(),
      email: perfil?.email ?? user.email,
      rol: perfil?.rol ?? rolFinal,
    },
  };
}

export async function actualizar(id, nombre, email, rol) {
  if (!id) return { error: "Id es obligatorio" };
  if (!nombre?.trim()) return { error: "Nombre es obligatorio" };
  if (!email?.trim()) return { error: "Email es obligatorio" };
  const rolFinal = rol === "admin" ? "admin" : "vendedor";

  const { data: existente, error: errorExistente } = await supabase
    .from("perfiles")
    .select("id")
    .eq("email", email.trim())
    .neq("id", id)
    .maybeSingle();
  if (errorExistente) return { error: errorExistente.message };
  if (existente) return { error: "Ya existe un usuario con ese email" };

  const { error: authError } = await supabase.auth.admin.updateUserById(id, {
    email: email.trim(),
    user_metadata: { nombre: nombre.trim(), rol: rolFinal },
  });
  if (authError) return { error: authError.message };

  const { error: perfilError } = await supabase
    .from("perfiles")
    .update({ nombre: nombre.trim(), email: email.trim(), rol: rolFinal })
    .eq("id", id);
  if (perfilError) return { error: perfilError.message };

  const { data: perfil, error } = await supabase
    .from("perfiles")
    .select("id, nombre, email, rol")
    .eq("id", id)
    .single();
  if (error) return { error: error.message };

  return { data: perfil };
}

export async function eliminar(id) {
  if (!id) return { error: "Id es obligatorio" };

  const { error: perfilError } = await supabase.from("perfiles").delete().eq("id", id);
  if (perfilError) return { error: perfilError.message };

  const { error: authError } = await supabase.auth.admin.deleteUser(id);
  if (authError) return { error: authError.message };

  return { data: { ok: true } };
}
