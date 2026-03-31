import * as porcentajesService from "../services/porcentajesService.js";

export async function listar(_req, res) {
  try {
    const data = await porcentajesService.listar();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function crear(req, res) {
  const { valor, descripcion, colaborador_id } = req.body || {};
  const result = await porcentajesService.crear(valor, descripcion, colaborador_id);
  if (result.error) return res.status(400).json({ error: result.error });
  try {
    res.status(201).json(result.data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}
