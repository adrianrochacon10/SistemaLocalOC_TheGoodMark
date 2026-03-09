import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res) => {
  try {
    const { data, error } = await supabase.from("pantallas").select("*").order("nombre");
    if (error) return res.status(500).json({ error: error.message });
    res.json(data ?? []);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

router.post("/", async (req, res) => {
  const body = req.body;
  const userId = req.user.id;
  if (!body.nombre?.trim()) return res.status(400).json({ error: "Nombre es obligatorio" });

  try {
    const { data, error } = await supabase.from("pantallas").insert({
      nombre: body.nombre.trim(),
      direccion: body.direccion ?? null,
      creado_por: userId,
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const body = req.body;
  const payload = {};
  if (body.nombre !== undefined) payload.nombre = body.nombre;
  if (body.direccion !== undefined) payload.direccion = body.direccion;
  if (Object.keys(payload).length === 0) return res.status(400).json({ error: "Nada que actualizar" });

  try {
    const { data, error } = await supabase.from("pantallas").update(payload).eq("id", id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Pantalla no encontrada" });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase.from("pantallas").select("*").eq("id", req.params.id).single();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Pantalla no encontrada" });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

export default router;
