import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res) => {
  try {
    const { data, error } = await supabase.from("clientes").select("*, tipo_pago(id, nombre)").order("nombre");
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
  if (!body.tipo_pago_id) return res.status(400).json({ error: "Tipo de pago es obligatorio" });

  try {
    const { data, error } = await supabase
      .from("clientes")
      .insert({
        nombre: body.nombre.trim(),
        telefono: body.telefono ?? null,
        email: body.email ?? null,
        contacto: body.contacto ?? null,
        tipo_pago_id: body.tipo_pago_id,
        creado_por: userId,
        actualizado_por: userId,
      })
      .select("*, tipo_pago(id, nombre)")
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const body = req.body;
  const payload = { updated_at: new Date().toISOString(), actualizado_por: req.user.id };
  if (body.nombre !== undefined) payload.nombre = body.nombre;
  if (body.telefono !== undefined) payload.telefono = body.telefono;
  if (body.email !== undefined) payload.email = body.email;
  if (body.contacto !== undefined) payload.contacto = body.contacto;
  if (body.tipo_pago_id !== undefined) payload.tipo_pago_id = body.tipo_pago_id;

  try {
    const { data, error } = await supabase.from("clientes").update(payload).eq("id", id).select("*, tipo_pago(id, nombre)").single();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Cliente no encontrado" });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase.from("clientes").select("*, tipo_pago(id, nombre)").eq("id", req.params.id).single();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Cliente no encontrado" });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

export default router;
