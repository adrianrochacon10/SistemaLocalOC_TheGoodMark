import * as tipoPagoService from "../services/tipoPagoService.js";

export async function listar(_req, res) {
  try {
    const data = await tipoPagoService.listar();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}
