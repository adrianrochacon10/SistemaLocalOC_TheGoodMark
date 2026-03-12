import { supabase } from "../config/supabase.js";

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  if (!data?.user || !data?.session) return { error: "Error al iniciar sesion" };

  const { data: perfil, error: errPerfil } = await supabase
    .from("perfiles")
    .select("id, nombre, email, rol")
    .eq("id", data.user.id)
    .single();
  if (errPerfil || !perfil) return { error: "Usuario sin perfil (contacte al administrador)" };

  return {
    user: data.user,
    session: data.session,
    perfil: { id: perfil.id, nombre: perfil.nombre, email: perfil.email, rol: perfil.rol },
  };
}
