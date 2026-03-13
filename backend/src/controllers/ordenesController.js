import * as ordenesService from "../services/ordenesService.js";

export async function listar(req, res) {
  const mes = Number(req.query.mes);
  const anio = Number(req.query.anio);
  try {
    const data = await ordenesService.listar(mes, anio);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function listarVentas(req, res) {
  const mes = Number(req.query.mes);
  const anio = Number(req.query.anio);
  if (!mes || !anio) return res.status(400).json({ error: "Query mes y anio son obligatorios" });
  try {
    const data = await ordenesService.listarVentasPorMes(mes, anio);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function generar(req, res) {
  const { mes, anio } = req.body || {};
  const userId = req.user.id;
  try {
    const result = await ordenesService.generarOrden(mes, anio, userId);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}
