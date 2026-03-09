import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { validarYConsumirCodigo } from "./codigos.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("clientes")
      .select("*, tipo_pago(id, nombre), pantalla:pantallas(id, nombre, direccion)")
      .order("nombre");
    if (error) return res.status(500).json({ error: error.message });
    res.json(data ?? []);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

router.post("/", async (req, res) => {
  const body = req.body || {};
  const userId = req.user.id;
  if (!body.nombre?.trim()) return res.status(400).json({ error: "Nombre es obligatorio" });
  const tipoPagoId = body.tipo_pago_id != null && String(body.tipo_pago_id).trim() ? String(body.tipo_pago_id).trim() : null;
  if (!tipoPagoId) return res.status(400).json({ error: "Tipo de pago es obligatorio (tipo_pago_id en el body)" });
  const pantallaId = body.pantalla_id != null && String(body.pantalla_id).trim() ? String(body.pantalla_id).trim() : null;
  if (!pantallaId) return res.status(400).json({ error: "Pantalla es obligatoria (pantalla_id en el body). Envía el body en JSON con Content-Type: application/json." });

  try {
    const { data, error } = await supabase
      .from("clientes")
      .insert({
        nombre: body.nombre.trim(),
        telefono: body.telefono ?? null,
        email: body.email ?? null,
        contacto: body.contacto ?? null,
        tipo_pago_id: tipoPagoId,
        pantalla_id: pantallaId,
        creado_por: userId,
        actualizado_por: userId,
      })
      .select("*, tipo_pago(id, nombre), pantalla:pantallas(id, nombre, direccion)")
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
  if (req.user.rol === "vendedor") {
    const codigo = body.codigo_edicion;
    const resultado = await validarYConsumirCodigo(codigo, req.user.id, "cliente", id);
    if (!resultado.ok) return res.status(400).json({ error: resultado.error });
  }
  const payload = { updated_at: new Date().toISOString(), actualizado_por: req.user.id };
  if (body.nombre !== undefined) payload.nombre = body.nombre;
  if (body.telefono !== undefined) payload.telefono = body.telefono;
  if (body.email !== undefined) payload.email = body.email;
  if (body.contacto !== undefined) payload.contacto = body.contacto;
  if (body.tipo_pago_id !== undefined) payload.tipo_pago_id = body.tipo_pago_id;
  if (body.pantalla_id !== undefined) payload.pantalla_id = body.pantalla_id;

  try {
    const { data, error } = await supabase
      .from("clientes")
      .update(payload)
      .eq("id", id)
      .select("*, tipo_pago(id, nombre), pantalla:pantallas(id, nombre, direccion)")
      .single();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Cliente no encontrado" });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("clientes")
      .select("*, tipo_pago(id, nombre), pantalla:pantallas(id, nombre, direccion)")
      .eq("id", req.params.id)
      .single();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Cliente no encontrado" });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

export default router;
