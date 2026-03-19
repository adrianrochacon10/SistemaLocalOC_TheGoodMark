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
  const { nombre, precio } = req.body || {};
  const result = await productosService.crear(nombre, precio);
  if (result.error) return res.status(400).json({ error: result.error });
  try {
    res.status(201).json(result.data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}
