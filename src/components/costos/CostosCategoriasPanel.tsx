import React, { useCallback, useState } from "react";
import { toast } from "react-toastify";
import { backendApi } from "../../lib/backendApi";
import { confirmWithToast } from "../../lib/confirmWithToast";

export interface CostoCategoriaAsociado {
  id: string;
  nombre: string;
  created_at?: string;
  updated_at?: string;
}

export interface CostoCategoria {
  id: string;
  tipo: string;
  asociados: CostoCategoriaAsociado[];
  created_at?: string;
  updated_at?: string;
}

interface Props {
  categorias: CostoCategoria[];
  onRecargar: () => Promise<void> | void;
}

export const CostosCategoriasPanel: React.FC<Props> = ({ categorias, onRecargar }) => {
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [nuevoTipo, setNuevoTipo] = useState("");
  const [nuevosAsociados, setNuevosAsociados] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [expandida, setExpandida] = useState<Record<string, boolean>>({});
  const [nuevoAsocPorCat, setNuevoAsocPorCat] = useState<Record<string, string>>({});

  const toggle = (id: string) => {
    setExpandida((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const recargar = useCallback(async () => {
    await onRecargar();
  }, [onRecargar]);

  const handleCrearCategoria = async () => {
    const tipo = nuevoTipo.trim();
    if (!tipo) {
      toast.warning("Escribe el nombre del tipo de categoría.");
      return;
    }
    const lineas = nuevosAsociados
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    setGuardando(true);
    try {
      await backendApi.post("/api/costos-categorias", { tipo, asociados: lineas });
      toast.success("Categoría creada.");
      setNuevoTipo("");
      setNuevosAsociados("");
      setMostrarNueva(false);
      await recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo crear");
    } finally {
      setGuardando(false);
    }
  };

  const handleEditarCategoria = async (id: string, tipoActual: string) => {
    const tipo = window.prompt("Nombre de la categoría (tipo)", tipoActual)?.trim();
    if (tipo == null || tipo === "") return;
    try {
      await backendApi.patch(`/api/costos-categorias/${encodeURIComponent(id)}`, { tipo });
      toast.success("Categoría actualizada.");
      await recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo editar");
    }
  };

  const handleEliminarCategoria = async (id: string, tipo: string) => {
    const ok = await confirmWithToast(`¿Eliminar la categoría "${tipo}"?`);
    if (!ok) return;
    try {
      await backendApi.del(`/api/costos-categorias/${encodeURIComponent(id)}`);
      toast.success("Categoría eliminada.");
      await recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  };

  const handleAgregarAsociado = async (categoriaId: string) => {
    const nombre = (nuevoAsocPorCat[categoriaId] ?? "").trim();
    if (!nombre) {
      toast.warning("Escribe el nombre de la subcategoría.");
      return;
    }
    try {
      await backendApi.post(`/api/costos-categorias/${encodeURIComponent(categoriaId)}/asociados`, {
        nombre,
      });
      toast.success("Subcategoría agregada.");
      setNuevoAsocPorCat((p) => ({ ...p, [categoriaId]: "" }));
      await recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo agregar");
    }
  };

  const handleEditarAsociado = async (categoriaId: string, asociadoId: string, nombreActual: string) => {
    const nombre = window.prompt("Nombre de la subcategoría", nombreActual)?.trim();
    if (nombre == null || nombre === "") return;
    try {
      await backendApi.patch(
        `/api/costos-categorias/${encodeURIComponent(categoriaId)}/asociados/${encodeURIComponent(asociadoId)}`,
        { nombre },
      );
      toast.success("Subcategoría actualizada.");
      await recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo editar");
    }
  };

  const handleEliminarAsociado = async (categoriaId: string, asociadoId: string, nombre: string) => {
    const ok = await confirmWithToast(`¿Eliminar la subcategoría "${nombre}"?`);
    if (!ok) return;
    try {
      await backendApi.del(
        `/api/costos-categorias/${encodeURIComponent(categoriaId)}/asociados/${encodeURIComponent(asociadoId)}`,
      );
      toast.success("Subcategoría eliminada.");
      await recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  };

  const handleEliminarTodosAsociados = async (categoriaId: string, tipo: string) => {
    const ok = await confirmWithToast(
      `¿Borrar todas las subcategorías de "${tipo}"? Los costos que usaban una subcategoría quedarán solo con la categoría.`,
    );
    if (!ok) {
      return;
    }
    try {
      await backendApi.del(`/api/costos-categorias/${encodeURIComponent(categoriaId)}/asociados`);
      toast.success("Subcategorías eliminadas.");
      await recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo borrar");
    }
  };

  return (
    <div className="formulario-section costos-administrativos__categorias-panel">
      <div className="costos-administrativos__categorias-toolbar">
        <h4>Categorías y subcategorías</h4>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => setMostrarNueva((v) => !v)}
        >
          {mostrarNueva ? "Cerrar" : "Crear categoría"}
        </button>
      </div>

      {mostrarNueva ? (
        <div className="costos-administrativos__nueva-categoria">
          <div className="form-group">
            <label>Tipo (nombre de la categoría)</label>
            <input
              type="text"
              value={nuevoTipo}
              onChange={(e) => setNuevoTipo(e.target.value)}
              placeholder="Ej. Nómina, Servicios…"
            />
          </div>
          <div className="form-group">
            <label>Subcategorías</label>
            <textarea
              rows={4}
              value={nuevosAsociados}
              onChange={(e) => setNuevosAsociados(e.target.value)}
              placeholder={"Ej.\nSueldos\nPrestaciones"}
              className="costos-administrativos__textarea-asociados"
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={guardando}
            onClick={() => void handleCrearCategoria()}
          >
            {guardando ? "Guardando…" : "Guardar categoría"}
          </button>
        </div>
      ) : null}

      <ul className="costos-administrativos__lista-categorias">
        {categorias.map((c) => (
          <li key={c.id} className="costos-administrativos__categoria-item">
            <div className="costos-administrativos__categoria-row">
              <button
                type="button"
                className="costos-administrativos__categoria-toggle"
                onClick={() => toggle(c.id)}
                aria-expanded={!!expandida[c.id]}
              >
                {expandida[c.id] ? "▼" : "▶"} {c.tipo}
                <span className="costos-administrativos__categoria-count">
                  ({c.asociados?.length ?? 0}{" "}
                  {(c.asociados?.length ?? 0) === 1 ? "subcategoría" : "subcategorías"})
                </span>
              </button>
              <div className="costos-administrativos__categoria-acciones">
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => void handleEditarCategoria(c.id, c.tipo)}
                >
                  Editar
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => void handleEliminarCategoria(c.id, c.tipo)}
                >
                  Eliminar
                </button>
              </div>
            </div>

            {expandida[c.id] ? (
              <div className="costos-administrativos__asociados-bloque">
                {(c.asociados ?? []).length === 0 ? (
                  <p className="costos-administrativos__vacio">Sin subcategorías. Puedes agregar abajo.</p>
                ) : (
                  <ul className="costos-administrativos__lista-asociados">
                    {(c.asociados ?? []).map((a) => (
                      <li key={a.id}>
                        <span>{a.nombre}</span>
                        <span className="costos-administrativos__asociado-btns">
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => void handleEditarAsociado(c.id, a.id, a.nombre)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => void handleEliminarAsociado(c.id, a.id, a.nombre)}
                          >
                            Borrar
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="costos-administrativos__agregar-asociado">
                  <input
                    type="text"
                    placeholder="Nueva subcategoría"
                    value={nuevoAsocPorCat[c.id] ?? ""}
                    onChange={(e) =>
                      setNuevoAsocPorCat((p) => ({ ...p, [c.id]: e.target.value }))
                    }
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => void handleAgregarAsociado(c.id)}
                  >
                    Agregar subcategoría
                  </button>
                  {(c.asociados ?? []).length > 0 ? (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => void handleEliminarTodosAsociados(c.id, c.tipo)}
                    >
                      Borrar todas las subcategorías
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
};
