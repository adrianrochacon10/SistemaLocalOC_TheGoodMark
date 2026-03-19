import * as diagnosticoService from "../services/diagnosticoService.js";

export async function emailPrueba(req, res) {
  const to = String(req.query.to || "").trim();
  try {
    const result = await diagnosticoService.enviarCorreoPrueba(to);
    if (result.error) return res.status(400).json({ ok: false, error: result.error });
    res.json({ ok: true, message: result.message });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : "Error enviando correo de prueba",
    });
  }
}
