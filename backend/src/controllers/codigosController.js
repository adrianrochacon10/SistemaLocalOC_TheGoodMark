import * as codigosService from "../services/codigosService.js";

export async function solicitar(req, res) {
  if (req.user.rol === "admin") return res.status(400).json({ error: "El admin no necesita codigo para editar" });
  const { entidad, entidad_id } = req.body || {};
  if (!entidad || !entidad_id) return res.status(400).json({ error: "entidad (cliente|orden) y entidad_id son obligatorios" });
  try {
    const result = await codigosService.solicitarCodigo(entidad, entidad_id, req.user);
    if (result.error) return res.status(400).json({ error: result.error });
    res.status(201).json(result.data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error al generar codigo" });
  }
}

export async function validar(req, res) {
  const { codigo, entidad, entidad_id } = req.body || {};
  if (!codigo || !entidad || !entidad_id) return res.status(400).json({ error: "codigo, entidad y entidad_id son obligatorios" });
  const result = await codigosService.validarCodigo(codigo, entidad, entidad_id, req.user.id);
  res.json(result);
}

export async function listar(_req, res) {
  try {
    const data = await codigosService.listarVigentes();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}
