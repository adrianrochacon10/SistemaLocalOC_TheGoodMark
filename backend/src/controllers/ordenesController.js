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

export async function generarColaborador(req, res) {
  const { mes, anio, colaborador_id } = req.body || {};
  const userId = req.user.id;
  try {
    const result = await ordenesService.generarOrdenColaborador(
      mes,
      anio,
      colaborador_id,
      userId,
    );
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function crearManual(req, res) {
  const userId = req.user.id;
  const b = req.body || {};
  try {
    const result = await ordenesService.crearManual({
      colaborador_id: b.colaborador_id,
      mes: b.mes,
      anio: b.anio,
      ventas_ids: b.ventas_ids,
      subtotal: b.subtotal,
      iva: b.iva,
      total: b.total,
      iva_porcentaje: b.iva_porcentaje,
      detalle_lineas: b.detalle_lineas,
      userId,
    });
    if (result.error) return res.status(400).json({ error: result.error });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function eliminar(req, res) {
  if (req.user.rol !== "admin") {
    return res.status(403).json({ error: "Solo admin puede eliminar órdenes" });
  }
  try {
    await ordenesService.eliminar(req.params.id);
    res.status(204).send();
  } catch (e) {
    if (e.message === "Orden no encontrada") {
      return res.status(404).json({ error: e.message });
    }
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}
