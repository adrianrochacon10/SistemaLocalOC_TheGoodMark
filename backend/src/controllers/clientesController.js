import * as clientesService from "../services/clientesService.js";
import { validarYConsumirCodigo } from "../services/codigosService.js";

export async function listar(_req, res) {
  try {
    const data = await clientesService.listar();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function crear(req, res) {
  const body = req.body || {};
  const userId = req.user.id;
  const result = await clientesService.crear(body, userId);
  if (result.error) return res.status(400).json({ error: result.error });
  try {
    res.status(201).json(result.data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function actualizar(req, res) {
  const { id } = req.params;
  const body = req.body || {};
  if (req.user.rol === "vendedor") {
    const codigo = body.codigo_edicion;
    const resultado = await validarYConsumirCodigo(codigo, req.user.id, "cliente", id);
    if (!resultado.ok) return res.status(400).json({ error: resultado.error });
  }
  try {
    const data = await clientesService.actualizar(id, body, req.user.id);
    res.json(data);
  } catch (e) {
    if (e.message === "Cliente no encontrado") return res.status(404).json({ error: e.message });
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function obtenerPorId(req, res) {
  try {
    const data = await clientesService.obtenerPorId(req.params.id);
    res.json(data);
  } catch (e) {
    if (e.message === "Cliente no encontrado") return res.status(404).json({ error: e.message });
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}
