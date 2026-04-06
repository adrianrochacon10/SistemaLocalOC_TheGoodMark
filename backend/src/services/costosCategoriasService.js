import { supabase } from "../config/supabase.js";

const TABLA_CAT = "costos_categoria";
const TABLA_ASOC = "costos_categoria_asociado";
const TABLA_COSTOS = "costos_administrativos";

function norm(v) {
  return String(v ?? "").trim();
}

const PAGE = 1000;

/** Evita el límite de filas embebidas de PostgREST: trae categorías y asociados por separado. */
async function fetchAllPages(fromTable, selectCols, orderCol) {
  const out = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(fromTable)
      .select(selectCols)
      .order(orderCol)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const chunk = data ?? [];
    out.push(...chunk);
    if (chunk.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

export async function listarConAsociados() {
  const [cats, asocs] = await Promise.all([
    fetchAllPages(TABLA_CAT, "id, tipo, created_at, updated_at", "tipo"),
    fetchAllPages(TABLA_ASOC, "id, categoria_id, nombre, created_at, updated_at", "nombre"),
  ]);
  const byCat = new Map();
  for (const a of asocs) {
    const list = byCat.get(a.categoria_id);
    const item = {
      id: a.id,
      nombre: a.nombre,
      created_at: a.created_at,
      updated_at: a.updated_at,
    };
    if (list) list.push(item);
    else byCat.set(a.categoria_id, [item]);
  }
  for (const list of byCat.values()) {
    list.sort((x, y) => x.nombre.localeCompare(y.nombre, "es"));
  }
  return cats.map((row) => ({
    id: row.id,
    tipo: row.tipo,
    created_at: row.created_at,
    updated_at: row.updated_at,
    asociados: byCat.get(row.id) ?? [],
  }));
}

export async function crearCategoria(body) {
  const tipo = norm(body.tipo);
  if (!tipo) return { error: "tipo es obligatorio" };
  const asociadosIniciales = Array.isArray(body.asociados)
    ? body.asociados.map((n) => norm(n)).filter(Boolean)
    : typeof body.asociados === "string"
      ? body.asociados
          .split(/[\n,;]+/)
          .map((n) => norm(n))
          .filter(Boolean)
      : [];

  const { data: cat, error } = await supabase.from(TABLA_CAT).insert({ tipo }).select("*").single();
  if (error) {
    if (String(error.code ?? "") === "23505") return { error: "Ya existe una categoría con ese nombre" };
    throw new Error(error.message);
  }

  for (const nombre of asociadosIniciales) {
    const { error: e2 } = await supabase.from(TABLA_ASOC).insert({ categoria_id: cat.id, nombre });
    if (e2 && String(e2.code ?? "") !== "23505") throw new Error(e2.message);
  }

  return { data: cat };
}

export async function actualizarCategoria(id, body) {
  if (!id) return { error: "id obligatorio" };
  const tipo = body.tipo !== undefined ? norm(body.tipo) : undefined;
  if (tipo !== undefined && !tipo) return { error: "tipo no puede quedar vacío" };

  const payload = { updated_at: new Date().toISOString() };
  if (tipo !== undefined) payload.tipo = tipo;

  const { data, error } = await supabase
    .from(TABLA_CAT)
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    if (String(error.code ?? "") === "23505") return { error: "Ya existe una categoría con ese nombre" };
    if (String(error.code ?? "") === "PGRST116") return { error: "Categoría no encontrada" };
    throw new Error(error.message);
  }
  return { data };
}

export async function eliminarCategoria(id) {
  if (!id) return { error: "id obligatorio" };
  const { data: catRow } = await supabase.from(TABLA_CAT).select("tipo").eq("id", id).maybeSingle();
  if (catRow?.tipo === "Sin clasificar") {
    return { error: "No se puede eliminar la categoría reservada «Sin clasificar»" };
  }
  const { count, error: cErr } = await supabase
    .from(TABLA_COSTOS)
    .select("id", { count: "exact", head: true })
    .eq("categoria_id", id);
  if (cErr) throw new Error(cErr.message);
  if ((count ?? 0) > 0) {
    return {
      error: "No se puede eliminar: hay costos administrativos usando esta categoría",
    };
  }
  const { error } = await supabase.from(TABLA_CAT).delete().eq("id", id);
  if (error) throw new Error(error.message);
  return {};
}

export async function crearAsociado(categoriaId, body) {
  const nombre = norm(body.nombre);
  if (!categoriaId) return { error: "categoria_id obligatorio" };
  if (!nombre) return { error: "nombre es obligatorio" };

  const { data, error } = await supabase
    .from(TABLA_ASOC)
    .insert({ categoria_id: categoriaId, nombre })
    .select("*")
    .single();
  if (error) {
    if (String(error.code ?? "") === "23505") return { error: "Ya existe ese asociado en la categoría" };
    throw new Error(error.message);
  }
  return { data };
}

export async function actualizarAsociado(categoriaId, asociadoId, body) {
  const nombre = norm(body.nombre);
  if (!asociadoId) return { error: "id obligatorio" };
  if (!nombre) return { error: "nombre no puede quedar vacío" };

  const { data, error } = await supabase
    .from(TABLA_ASOC)
    .update({ nombre, updated_at: new Date().toISOString() })
    .eq("id", asociadoId)
    .eq("categoria_id", categoriaId)
    .select("*")
    .single();
  if (error) {
    if (String(error.code ?? "") === "PGRST116") return { error: "Asociado no encontrado" };
    if (String(error.code ?? "") === "23505") return { error: "Ya existe ese nombre en la categoría" };
    throw new Error(error.message);
  }
  return { data };
}

export async function eliminarAsociado(categoriaId, asociadoId) {
  if (!asociadoId) return { error: "id obligatorio" };
  const { error } = await supabase
    .from(TABLA_ASOC)
    .delete()
    .eq("id", asociadoId)
    .eq("categoria_id", categoriaId);
  if (error) throw new Error(error.message);
  return {};
}

export async function eliminarTodosAsociados(categoriaId) {
  if (!categoriaId) return { error: "categoria_id obligatorio" };
  const { error } = await supabase.from(TABLA_ASOC).delete().eq("categoria_id", categoriaId);
  if (error) throw new Error(error.message);
  return {};
}
