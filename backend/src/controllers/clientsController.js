import * as clientsService from "../services/clientsService.js";

export async function listar(_req, res) {
  try {
    const data = await clientsService.listar();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function crear(req, res) {
  try {
    const result = await clientsService.crear(req.body || {});
    if (result.error) return res.status(400).json({ error: result.error });
    res.status(201).json(result.data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function actualizar(req, res) {
  try {
    const result = await clientsService.actualizar(req.params.id, req.body || {});
    if (result.error) {
      const status = /no encontrado/i.test(result.error) ? 404 : 400;
      return res.status(status).json({ error: result.error });
    }
    res.json(result.data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function eliminar(req, res) {
  try {
    const result = await clientsService.eliminar(req.params.id);
    if (result.error) {
      const status = /no encontrado/i.test(result.error) ? 404 : 400;
      return res.status(status).json({ error: result.error });
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}
