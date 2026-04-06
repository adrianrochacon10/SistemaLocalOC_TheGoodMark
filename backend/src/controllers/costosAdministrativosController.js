import * as costosAdministrativosService from "../services/costosAdministrativosService.js";

export async function listar(req, res) {
  try {
    const data = await costosAdministrativosService.listar(req.query ?? {});
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function crear(req, res) {
  try {
    const result = await costosAdministrativosService.crear(req.body ?? {});
    if (result.error) return res.status(400).json({ error: result.error });
    res.status(201).json(result.data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function actualizar(req, res) {
  try {
    const result = await costosAdministrativosService.actualizar(
      req.params?.id,
      req.body ?? {},
    );
    if (result.error) {
      if (result.error === "Registro no encontrado") {
        return res.status(404).json({ error: result.error });
      }
      return res.status(400).json({ error: result.error });
    }
    res.json(result.data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function eliminar(req, res) {
  try {
    const result = await costosAdministrativosService.eliminar(req.params?.id);
    if (result.error) return res.status(400).json({ error: result.error });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}
