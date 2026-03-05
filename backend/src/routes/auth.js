import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email y contrasena son obligatorios" });

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
    if (!data?.user || !data?.session) return res.status(401).json({ error: "Error al iniciar sesion" });

    const { data: perfil } = await supabase.from("perfiles").select("id, nombre, email, rol").eq("id", data.user.id).single();
    if (!perfil) return res.status(403).json({ error: "Usuario sin perfil (contacte al administrador)" });

    return res.json({
      user: data.user,
      session: data.session,
      perfil: { id: perfil.id, nombre: perfil.nombre, email: perfil.email, rol: perfil.rol },
    });
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : "Error en login" });
  }
});

router.get("/me", requireAuth, (req, res) => res.json({ perfil: req.user }));

export default router;
