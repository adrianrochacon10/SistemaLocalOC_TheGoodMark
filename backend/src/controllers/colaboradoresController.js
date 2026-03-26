import * as colaboradoresService from "../services/colaboradoresService.js";
import { validarYConsumirCodigo } from "../services/codigosService.js";

export async function listar(_req, res) {
  try {
    const data = await colaboradoresService.listar();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function crear(req, res) {
  try {
    const body = req.body || {};
    const userId = req.user?.id;
    const result = await colaboradoresService.crear(body, userId);
    if (result.error) return res.status(400).json({ error: result.error });
    res.status(201).json(result.data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function actualizar(req, res) {
  const { id } = req.params;
  const body = req.body || {};
  if (req.user.rol !== "admin") {
    const codigo = body.codigo_edicion;
    const resultado = await validarYConsumirCodigo(codigo, req.user.id, "colaborador", id);
    if (!resultado.ok) return res.status(400).json({ error: resultado.error });
  }
  try {
    const data = await colaboradoresService.actualizar(id, body, req.user.id);
    res.json(data);
  } catch (e) {
    if (e.message === "Colaborador no encontrado") return res.status(404).json({ error: e.message });
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function obtenerPorId(req, res) {
  try {
    const data = await colaboradoresService.obtenerPorId(req.params.id);
    res.json(data);
  } catch (e) {
    if (e.message === "Colaborador no encontrado") return res.status(404).json({ error: e.message });
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function eliminar(req, res) {
  try {
    await colaboradoresService.eliminar(req.params.id);
    res.status(204).send();
  } catch (e) {
    if (e.message === "Colaborador no encontrado") {
      return res.status(404).json({ error: e.message });
    }
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}
