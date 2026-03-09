import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (_req, res) => {
  try {
    const { data, error } = await supabase.from("productos").select("*").order("nombre");
    if (error) return res.status(500).json({ error: error.message });
    res.json(data ?? []);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { nombre, precio } = req.body || {};
  if (!nombre?.trim()) return res.status(400).json({ error: "Nombre es obligatorio" });
  const precioNum = Number(precio);
  if (!Number.isFinite(precioNum) || precioNum < 0) return res.status(400).json({ error: "Precio debe ser un numero mayor o igual a 0" });

  try {
    const { data, error } = await supabase
      .from("productos")
      .insert({ nombre: nombre.trim(), precio: precioNum })
      .select("*")
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

export default router;

