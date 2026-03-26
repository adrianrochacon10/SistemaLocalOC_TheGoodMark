import * as vendedoresService from "../services/vendedoresService.js";

export async function listar(_req, res) {
  try {
    const data = await vendedoresService.listar();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function crear(req, res) {
  try {
    const { nombre, email, password, rol } = req.body || {};
    const result = await vendedoresService.crear(nombre, email, password, rol);
    if (result.error) return res.status(400).json({ error: result.error });
    res.status(201).json(result.data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error al agregar vendedor" });
  }
}

export async function actualizar(req, res) {
  try {
    const { id } = req.params;
    const { nombre, email, rol, password } = req.body || {};
    const result = await vendedoresService.actualizar(
      id,
      nombre,
      email,
      rol,
      password,
    );
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result.data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error al actualizar vendedor" });
  }
}

export async function eliminar(req, res) {
  const { id } = req.params;
  const result = await vendedoresService.eliminar(id);
  if (result.error) return res.status(400).json({ error: result.error });
  try {
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error al eliminar vendedor" });
  }
}
