import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import ReactDOM from "react-dom";
import {
  RegistroVenta,
  Colaborador,
  Pantalla,
  ConfiguracionEmpresa,
} from "../../../types";
import {
  construirDetalleLineas,
  totalesDesdeLineas,
  ventasIdsDesdeSeleccion,
  nombresPantallas,
  type CrearOrdenPayload,
} from "../../../utils/ordenCompraLineas";

interface Props {
  clientes: Colaborador[];
  pantallas: Pantalla[];
  ventasRegistradas: RegistroVenta[];
  config: ConfiguracionEmpresa;
  onConfirmar: (payload: CrearOrdenPayload) => void | Promise<void>;
  onCancelar: () => void;
  mensajeError?: string;
  /** Al abrir el modal, vuelve a pedir la lista (corrige lista vacía / sesión recién lista) */
  onRecargarColaboradores?: () => Promise<void>;
}

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function seleccionToArrays(m: Map<string, Set<string>>): Map<string, string[]> {
  const out = new Map<string, string[]>();
  m.forEach((set, vid) => out.set(vid, [...set]));
  return out;
}

export const ModalCrearOrden: React.FC<Props> = ({
  clientes,
  pantallas,
  ventasRegistradas,
  config,
  onConfirmar,
  onCancelar,
  mensajeError,
  onRecargarColaboradores,
}) => {
  const hoy = new Date();
  const [colaboradorId, setColaboradorId] = useState("");
  const [cargandoColabs, setCargandoColabs] = useState(
    Boolean(onRecargarColaboradores),
  );
  const [errorCargaColabs, setErrorCargaColabs] = useState("");
  const [mes, setMes] = useState(hoy.getMonth());
  const [año, setAño] = useState(hoy.getFullYear());
  const [seleccion, setSeleccion] = useState<Map<string, Set<string>>>(
    () => new Map(),
  );
  const [guardando, setGuardando] = useState(false);

  const pasoActual = colaboradorId ? 2 : 1;
  const años = Array.from({ length: 4 }, (_, i) => hoy.getFullYear() - 2 + i);
  const colaboradorSeleccionado = clientes.find((c) => c.id === colaboradorId);

  useEffect(() => {
    if (!onRecargarColaboradores) {
      setCargandoColabs(false);
      return;
    }
    let cancelado = false;
    setCargandoColabs(true);
    setErrorCargaColabs("");
    void onRecargarColaboradores()
      .catch((e) => {
        if (!cancelado) {
          setErrorCargaColabs(
            e instanceof Error
              ? e.message
              : "No se pudieron cargar los colaboradores",
          );
        }
      })
      .finally(() => {
        if (!cancelado) setCargandoColabs(false);
      });
    return () => {
      cancelado = true;
    };
  }, [onRecargarColaboradores]);

  const ventasDelMes = useMemo(() => {
    if (!colaboradorId) return [];
    return ventasRegistradas.filter((v) => {
      const fecha = new Date(v.fechaInicio);
      return (
        v.colaboradorId === colaboradorId &&
        fecha.getMonth() === mes &&
        fecha.getFullYear() === año
      );
    });
  }, [ventasRegistradas, mes, año, colaboradorId]);

  const ventaIdsKey = useMemo(
    () => ventasDelMes.map((v) => v.id).sort().join(","),
    [ventasDelMes],
  );

  const ventasDelMesRef = useRef(ventasDelMes);
  ventasDelMesRef.current = ventasDelMes;

  useEffect(() => {
    const list = ventasDelMesRef.current;
    if (!colaboradorId || list.length === 0) {
      setSeleccion(new Map());
      return;
    }
    const m = new Map<string, Set<string>>();
    for (const v of list) {
      m.set(v.id, new Set(v.pantallasIds ?? []));
    }
    setSeleccion(m);
  }, [colaboradorId, mes, año, ventaIdsKey]);

  const seleccionArrays = useMemo(
    () => seleccionToArrays(seleccion),
    [seleccion],
  );

  const detalleLineas = useMemo(
    () => construirDetalleLineas(ventasDelMes, seleccionArrays, pantallas),
    [ventasDelMes, seleccionArrays, pantallas],
  );

  const { subtotal, iva, total } = useMemo(
    () => totalesDesdeLineas(detalleLineas, config.ivaPercentaje),
    [detalleLineas, config.ivaPercentaje],
  );

  const ventasIds = useMemo(
    () => ventasIdsDesdeSeleccion(seleccionArrays),
    [seleccionArrays],
  );

  const togglePantalla = useCallback((ventaId: string, pantallaId: string) => {
    setSeleccion((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(ventaId) ?? []);
      if (set.has(pantallaId)) set.delete(pantallaId);
      else set.add(pantallaId);
      next.set(ventaId, set);
      return next;
    });
  }, []);

  const setTodasPantallasVenta = useCallback(
    (venta: RegistroVenta, todas: boolean) => {
      setSeleccion((prev) => {
        const next = new Map(prev);
        next.set(
          venta.id,
          todas ? new Set(venta.pantallasIds ?? []) : new Set(),
        );
        return next;
      });
    },
    [],
  );

  const seleccionarTodasGlobal = () => {
    const m = new Map<string, Set<string>>();
    for (const v of ventasDelMes) {
      m.set(v.id, new Set(v.pantallasIds ?? []));
    }
    setSeleccion(m);
  };

  const quitarTodasGlobal = () => {
    const m = new Map<string, Set<string>>();
    for (const v of ventasDelMes) {
      m.set(v.id, new Set());
    }
    setSeleccion(m);
  };

  const handleConfirmar = async () => {
    if (!colaboradorId) {
      alert("Selecciona un colaborador");
      return;
    }
    if (ventasDelMes.length === 0) {
      alert("No hay ventas para ese período");
      return;
    }
    if (detalleLineas.length === 0) {
      alert("Selecciona al menos una pantalla");
      return;
    }

    const payload: CrearOrdenPayload = {
      colaboradorId,
      mes,
      año,
      ventasIds,
      detalleLineas,
      subtotal,
      iva,
      total,
      ivaPercentaje: config.ivaPercentaje,
    };

    setGuardando(true);
    try {
      await onConfirmar(payload);
    } finally {
      setGuardando(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 Nueva Orden de Compra</h2>
          <button type="button" className="modal-close" onClick={onCancelar}>
            ✕
          </button>
        </div>

        <div className="modal-steps">
          <div className={`step ${pasoActual >= 1 ? "step-activo" : ""}`}>
            <span className="step-num">1</span>
            <span className="step-label">Colaborador</span>
          </div>
          <div className="step-linea" />
          <div className={`step ${pasoActual >= 2 ? "step-activo" : ""}`}>
            <span className="step-num">2</span>
            <span className="step-label">Pantallas y totales</span>
          </div>
        </div>

        <div className="modal-body">
          {mensajeError ? (
            <div className="modal-error-banner" role="alert">
              {mensajeError}
            </div>
          ) : null}
          <div className="modal-section">
            <h3>🤝 Colaborador *</h3>
            {cargandoColabs ? (
              <p className="modal-cargando-hint">Cargando colaboradores…</p>
            ) : null}
            {errorCargaColabs ? (
              <div className="modal-error-banner" role="alert">
                {errorCargaColabs}
              </div>
            ) : null}
            <select
              value={colaboradorId}
              onChange={(e) => setColaboradorId(e.target.value)}
              className="form-select form-select-lg"
              disabled={cargandoColabs}
            >
              <option value="">
                {cargandoColabs
                  ? "— Cargando… —"
                  : clientes.length === 0
                    ? "— No hay colaboradores (revisa conexión o permisos) —"
                    : "— Seleccionar colaborador —"}
              </option>
              {clientes.map((c) => {
                const label = (c.nombre ?? "").trim() || `Sin nombre (${c.id})`;
                return (
                  <option key={c.id} value={c.id}>
                    {label}
                  </option>
                );
              })}
            </select>

            {colaboradorSeleccionado && (
              <div className="colaborador-ficha">
                {colaboradorSeleccionado.alias && (
                  <span>👤 {colaboradorSeleccionado.alias}</span>
                )}
                {colaboradorSeleccionado.telefono && (
                  <span>📞 {colaboradorSeleccionado.telefono}</span>
                )}
                {colaboradorSeleccionado.email && (
                  <span>✉️ {colaboradorSeleccionado.email}</span>
                )}
              </div>
            )}
          </div>

          {colaboradorId && (
            <>
              <div className="modal-section">
                <h3>📅 Período</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Mes</label>
                    <select
                      value={mes}
                      onChange={(e) => setMes(Number(e.target.value))}
                      className="form-select"
                    >
                      {MESES.map((mName, i) => (
                        <option key={i} value={i}>
                          {mName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Año</label>
                    <select
                      value={año}
                      onChange={(e) => setAño(Number(e.target.value))}
                      className="form-select"
                    >
                      {años.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-section">
                <div className="modal-section-toolbar">
                  <h3>
                    Pantallas incluidas
                    <span className="badge-count">{detalleLineas.length}</span>
                  </h3>
                  <div className="toolbar-chips">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={seleccionarTodasGlobal}
                    >
                      Todas
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={quitarTodasGlobal}
                    >
                      Ninguna
                    </button>
                  </div>
                </div>

                {ventasDelMes.length === 0 ? (
                  <div className="empty-msg">
                    <p>
                      ⚠️ No hay ventas para {colaboradorSeleccionado?.nombre} en{" "}
                      {MESES[mes]} {año}.
                    </p>
                  </div>
                ) : (
                  <div className="ventas-seleccion-list">
                    {ventasDelMes.map((v) => {
                      const pids = v.pantallasIds ?? [];
                      const selSet = seleccion.get(v.id) ?? new Set();
                      const todasSel =
                        pids.length > 0 && pids.every((id) => selSet.has(id));

                      return (
                        <div key={v.id} className="venta-seleccion-bloque">
                          <div className="venta-seleccion-head">
                            <div>
                              <strong>{v.vendidoA}</strong>
                              <span className="venta-seleccion-periodo">
                                {new Date(v.fechaInicio).toLocaleDateString(
                                  "es-MX",
                                )}{" "}
                                →{" "}
                                {new Date(v.fechaFin).toLocaleDateString(
                                  "es-MX",
                                )}
                              </span>
                            </div>
                            {pids.length > 1 && (
                              <label className="check-todas-venta">
                                <input
                                  type="checkbox"
                                  checked={todasSel}
                                  onChange={() =>
                                    setTodasPantallasVenta(v, !todasSel)
                                  }
                                />
                                Todas las pantallas de esta venta
                              </label>
                            )}
                          </div>
                          <ul className="pantallas-check-list">
                            {pids.map((pid) => {
                              const p = pantallas.find((x) => x.id === pid);
                              const precioRef =
                                p?.precio != null && p.precio > 0
                                  ? `$${p.precio.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`
                                  : null;
                              return (
                                <li key={`${v.id}-${pid}`}>
                                  <label>
                                    <input
                                      type="checkbox"
                                      checked={selSet.has(pid)}
                                      onChange={() =>
                                        togglePantalla(v.id, pid)
                                      }
                                    />
                                    <span className="pantalla-nombre-check">
                                      📺 {p?.nombre ?? pid}
                                    </span>
                                    {precioRef && (
                                      <span className="pantalla-precio-ref">
                                        Ref. {precioRef}/mes
                                      </span>
                                    )}
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                          <div className="venta-linea-importe">
                            Línea (selección):{" "}
                            <strong>
                              $
                              {detalleLineas
                                .filter((l) => l.venta_id === v.id)
                                .reduce((s, l) => s + l.importe, 0)
                                .toLocaleString("es-MX", {
                                  minimumFractionDigits: 2,
                                })}
                            </strong>
                            <span className="nombres-seleccionados">
                              {" "}
                              —{" "}
                              {nombresPantallas(
                                [...selSet].filter((id) => pids.includes(id)),
                                pantallas,
                              ) || "—"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="modal-totales">
                  <div className="total-row">
                    <span>Subtotal</span>
                    <span>
                      $
                      {subtotal.toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="total-row">
                    <span>IVA ({config.ivaPercentaje}%)</span>
                    <span>
                      $
                      {iva.toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="total-row total-final">
                    <span>TOTAL</span>
                    <span>
                      $
                      {total.toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onCancelar}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void handleConfirmar()}
            disabled={
              !colaboradorId ||
              ventasDelMes.length === 0 ||
              detalleLineas.length === 0 ||
              guardando
            }
          >
            {guardando
              ? "Guardando…"
              : `✅ Crear orden — ${MESES[mes]} ${año}`}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
