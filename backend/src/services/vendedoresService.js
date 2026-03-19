import { supabase } from "../config/supabase.js";

export async function listar() {
  const { data, error } = await supabase
    .from("perfiles")
    .select("id, nombre, email, rol")
    .eq("rol", "vendedor")
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
