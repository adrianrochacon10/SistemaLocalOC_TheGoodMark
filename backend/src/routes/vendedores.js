import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);
router.use(requireAdmin);

router.post("/", async (req, res) => {
  const { nombre, email, password, rol } = req.body || {};
  if (!nombre?.trim()) return res.status(400).json({ error: "Nombre es obligatorio" });
  if (!email?.trim()) return res.status(400).json({ error: "Email es obligatorio" });
  if (!password) return res.status(400).json({ error: "Contrasena es obligatoria" });
  const rolFinal = rol === "admin" ? "admin" : "vendedor";

  try {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { nombre: nombre.trim(), rol: rolFinal },
    });
    if (authError) return res.status(400).json({ error: authError.message });
    if (!authData?.user) return res.status(500).json({ error: "Error al crear usuario" });
    const user = authData.user;
    await supabase.from("perfiles").upsert({ id: user.id, nombre: nombre.trim(), email: user.email, rol: rolFinal }, { onConflict: "id" });
    const { data: perfil } = await supabase.from("perfiles").select("id, nombre, email, rol").eq("id", user.id).single();
    res.status(201).json({ id: user.id, nombre: perfil?.nombre ?? nombre.trim(), email: perfil?.email ?? user.email, rol: perfil?.rol ?? rolFinal });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error al agregar vendedor" });
  }
});

router.get("/", async (_req, res) => {
  try {
    const { data, error } = await supabase.from("perfiles").select("id, nombre, email, rol").eq("rol", "vendedor").order("nombre");
    if (error) return res.status(500).json({ error: error.message });
    res.json(data ?? []);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

export default router;
