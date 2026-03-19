import * as pantallasService from "../services/pantallasService.js";

export async function listar(_req, res) {
  try {
    const data = await pantallasService.listar();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function crear(req, res) {
  const body = req.body || {};
  const userId = req.user.id;
  if (!body.nombre?.trim()) return res.status(400).json({ error: "Nombre es obligatorio" });
  try {
    const data = await pantallasService.crear(body, userId);
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function actualizar(req, res) {
  const { id } = req.params;
  const body = req.body || {};
  const payload = {};
  if (body.nombre !== undefined) payload.nombre = body.nombre;
  if (Object.keys(payload).length === 0) return res.status(400).json({ error: "Nada que actualizar" });
  try {
    const data = await pantallasService.actualizar(id, payload);
    res.json(data);
  } catch (e) {
    if (e.message === "Pantalla no encontrada") return res.status(404).json({ error: e.message });
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function obtenerPorId(req, res) {
  try {
    const data = await pantallasService.obtenerPorId(req.params.id);
    res.json(data);
  } catch (e) {
    if (e.message === "Pantalla no encontrada") return res.status(404).json({ error: e.message });
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}
