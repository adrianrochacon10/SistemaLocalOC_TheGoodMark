import * as ventasService from "../services/ventasService.js";
import { validarYConsumirCodigo } from "../services/codigosService.js";

export async function listar(_req, res) {
  try {
    const data = await ventasService.listar();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function crear(req, res) {
  const body = req.body || {};
  const vendedorId =
    req.user?.rol === "admin"
      ? body.vendedor_id ?? req.user?.id ?? null
      : req.user?.id ?? null;
  try {
    const result = await ventasService.crear(body, vendedorId);
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
    // Mismo `entidad` que POST /api/codigos/solicitar con entidad "orden" (id = venta).
    const resultado = await validarYConsumirCodigo(codigo, req.user.id, "orden", id);
    if (!resultado.ok) return res.status(400).json({ error: resultado.error });
  }
  try {
    const data = await ventasService.actualizar(id, body);
    res.json(data);
  } catch (e) {
    if (e.message === "Venta no encontrada") return res.status(404).json({ error: e.message });
    if (String(e?.message ?? "").toLowerCase().includes("identificador_venta")) {
      return res.status(400).json({
        error:
          "El identificador de venta ya existe. Usa uno diferente (4 letras o numeros).",
      });
    }
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function renovar(req, res) {
  if (req.user.rol !== "admin") return res.status(403).json({ error: "Solo admin puede renovar" });
  const { id } = req.params;
  const body = req.body || {};
  try {
    const result = await ventasService.renovar(id, body);
    if (result.error) return res.status(400).json({ error: result.error });
    res.status(201).json(result.data);
  } catch (e) {
    if (e.message === "Venta no encontrada") return res.status(404).json({ error: e.message });
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function eliminar(req, res) {
  if (req.user.rol !== "admin") {
    return res.status(403).json({ error: "Solo admin puede eliminar ventas" });
  }
  const { id } = req.params;
  try {
    await ventasService.eliminar(id);
    res.status(204).send();
  } catch (e) {
    if (e.message === "Venta no encontrada") {
      return res.status(404).json({ error: e.message });
    }
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}
