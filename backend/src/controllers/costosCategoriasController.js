import * as costosCategoriasService from "../services/costosCategoriasService.js";

export async function listar(_req, res) {
  try {
    const data = await costosCategoriasService.listarConAsociados();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function crear(req, res) {
  try {
    const result = await costosCategoriasService.crearCategoria(req.body ?? {});
    if (result.error) return res.status(400).json({ error: result.error });
    res.status(201).json(result.data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function actualizar(req, res) {
  try {
    const result = await costosCategoriasService.actualizarCategoria(req.params?.id, req.body ?? {});
    if (result.error) {
      if (result.error === "Categoría no encontrada") return res.status(404).json({ error: result.error });
      return res.status(400).json({ error: result.error });
    }
    res.json(result.data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function eliminar(req, res) {
  try {
    const result = await costosCategoriasService.eliminarCategoria(req.params?.id);
    if (result.error) return res.status(400).json({ error: result.error });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function crearAsociado(req, res) {
  try {
    const result = await costosCategoriasService.crearAsociado(req.params?.id, req.body ?? {});
    if (result.error) return res.status(400).json({ error: result.error });
    res.status(201).json(result.data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function actualizarAsociado(req, res) {
  try {
    const result = await costosCategoriasService.actualizarAsociado(
      req.params?.id,
      req.params?.asociadoId,
      req.body ?? {},
    );
    if (result.error) {
      if (result.error === "Asociado no encontrado") return res.status(404).json({ error: result.error });
      return res.status(400).json({ error: result.error });
    }
    res.json(result.data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function eliminarAsociado(req, res) {
  try {
    const result = await costosCategoriasService.eliminarAsociado(
      req.params?.id,
      req.params?.asociadoId,
    );
    if (result.error) return res.status(400).json({ error: result.error });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}

export async function eliminarTodosAsociados(req, res) {
  try {
    const result = await costosCategoriasService.eliminarTodosAsociados(req.params?.id);
    if (result.error) return res.status(400).json({ error: result.error });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
}
