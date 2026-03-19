import * as ordenesService from "../services/ordenesService.js";

export async function listar(req, res) {
  const mes = req.query.mes != null && req.query.mes !== "" ? Number(req.query.mes) : undefined;
  const anio = req.query.anio != null && req.query.anio !== "" ? Number(req.query.anio) : undefined;
  const colaborador_id =
    typeof req.query.colaborador_id === "string" && req.query.colaborador_id.trim()
      ? req.query.colaborador_id.trim()
      : undefined;
  try {
    const data = await ordenesService.listar({ mes, anio, colaborador_id });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function listarVentas(req, res) {
  const mes = Number(req.query.mes);
  const anio = Number(req.query.anio);
  const colaborador_id =
    typeof req.query.colaborador_id === "string" && req.query.colaborador_id.trim()
      ? req.query.colaborador_id.trim()
      : undefined;
  if (!mes || !anio) return res.status(400).json({ error: "Query mes y anio son obligatorios" });
  try {
    const data = await ordenesService.listarVentasPorMes(mes, anio, colaborador_id);
    res.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error interno";
    if (msg.includes("obligatorios")) return res.status(400).json({ error: msg });
    res.status(500).json({ error: msg });
  }
}

export async function generar(req, res) {
  const { mes, anio, colaborador_id } = req.body || {};
  const userId = req.user.id;
  try {
    const result = await ordenesService.generarOrden(colaborador_id, mes, anio, userId);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}
