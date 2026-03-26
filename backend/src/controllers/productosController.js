import * as productosService from "../services/productosService.js";

export async function listar(_req, res) {
  try {
    const data = await productosService.listar();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function crear(req, res) {
  try {
    const { nombre, precio } = req.body || {};
    const result = await productosService.crear(nombre, precio);
    if (result.error) return res.status(400).json({ error: result.error });
    res.status(201).json(result.data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function actualizar(req, res) {
  try {
    const { id } = req.params;
    const { nombre, precio } = req.body || {};
    const result = await productosService.actualizar(id, nombre, precio);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result.data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}
