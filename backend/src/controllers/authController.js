//Autenticacion del usuario
import * as authService from "../services/authService.js";

export async function login(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email y contrasena son obligatorios" });
  try {
    const result = await authService.login(email, password);
    if (result.error) return res.status(401).json({ error: result.error });
    return res.json({
      user: result.user,
      session: result.session,
      perfil: result.perfil,
    });
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : "Error en login" });
  }
}

export function me(req, res) {
  return res.json({ perfil: req.user });
}
