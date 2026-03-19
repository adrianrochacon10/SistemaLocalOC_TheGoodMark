import { supabase } from "../config/supabase.js";

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Token de autorizacion requerido" });

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: "Token invalido o expirado" });

    const { data: perfil } = await supabase.from("perfiles").select("id, nombre, email, rol").eq("id", user.id).single();
    if (!perfil) return res.status(403).json({ error: "Usuario sin perfil en el sistema" });

    req.user = { id: perfil.id, email: perfil.email, nombre: perfil.nombre, rol: perfil.rol };
    next();
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : "Error al verificar sesion" });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.rol !== "admin") return res.status(403).json({ error: "Solo administrador puede realizar esta accion" });
  next();
}
