import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { supabase } from "../config/supabase.js";

const router = Router();
router.use(requireAuth);

// GET todas las asignaciones de pantallas
router.get("/", async (_req, res) => {
  const { data, error } = await supabase
    .from("asignaciones")
    .select("*")
    .eq("activa", true);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET asignaciones de productos
router.get("/productos", async (_req, res) => {
  const { data, error } = await supabase
    .from("asignaciones_productos")
    .select("*")
    .eq("activa", true);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST asignación de pantalla
router.post("/", async (req, res) => {
  const { cliente_id, pantalla_id, activa } = req.body;
  const { data, error } = await supabase
    .from("asignaciones")
    .insert({ cliente_id, pantalla_id, activa })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE asignación de pantalla
router.delete("/:id", async (req, res) => {
  const { error } = await supabase
    .from("asignaciones")
    .delete()
    .eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// POST asignación de producto
router.post("/productos", async (req, res) => {
  const { cliente_id, producto_id, activa } = req.body;
  const { data, error } = await supabase
    .from("asignaciones_productos")
    .insert({ cliente_id, producto_id, activa })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE asignación de producto
router.delete("/productos/:id", async (req, res) => {
  const { error } = await supabase
    .from("asignaciones_productos")
    .delete()
    .eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

export default router;
