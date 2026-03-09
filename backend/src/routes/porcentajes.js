import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("porcentajes")
      .select("*, tipo_pago:tipo_pago(id, nombre)")
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data ?? []);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

router.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { valor, descripcion } = req.body || {};
  const valorNum = Number(valor);
  if (!Number.isFinite(valorNum) || valorNum < 0 || valorNum > 100) {
    return res.status(400).json({ error: "valor debe ser un numero entre 0 y 100" });
  }

  try {
    const { data: tp, error: errTp } = await supabase
      .from("tipo_pago")
      .select("id")
      .eq("nombre", "porcentaje")
      .single();
    if (errTp || !tp) return res.status(500).json({ error: "Tipo de pago 'porcentaje' no encontrado" });

    const { data, error } = await supabase
      .from("porcentajes")
      .insert({
        tipo_pago_id: tp.id,
        valor: valorNum,
        descripcion: descripcion ?? null,
      })
      .select("*, tipo_pago:tipo_pago(id, nombre)")
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

export default router;

