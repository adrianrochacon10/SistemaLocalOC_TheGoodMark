import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
} from "react";
import ReactDOM from "react-dom";
import {
  RegistroVenta,
  Colaborador,
  Pantalla,
  ConfiguracionEmpresa,
} from "../../../types";
import { backendApi } from "../../../lib/backendApi";
import { mapVentaFromApi } from "../../../utils/ordenApiMapper";
import { ventaSolapaMesCalendario } from "../../../utils/ordenUtils";
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

const fmtMoney = (n: number) =>
  Number(n || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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
  const [ventasDelMes, setVentasDelMes] = useState<RegistroVenta[]>([]);
  const [cargandoVentas, setCargandoVentas] = useState(false);
  const [avisoVentas, setAvisoVentas] = useState("");
  /** Ventas (contratos) incluidas en la orden */
  const [ventasSeleccionadas, setVentasSeleccionadas] = useState<Set<string>>(
    () => new Set(),
  );
  const [ventasConProductoIncluido, setVentasConProductoIncluido] = useState<
    Set<string>
  >(() => new Set());
  const [guardando, setGuardando] = useState(false);

  const pasoActual = colaboradorId ? 2 : 1;
  const años = Array.from({ length: 4 }, (_, i) => hoy.getFullYear() - 2 + i);
  const colaboradorSeleccionado = clientes.find((c) => c.id === colaboradorId);

  const ventaIdsKey = useMemo(
    () => ventasDelMes.map((v) => String(v.id)).sort().join("|"),
    [ventasDelMes],
  );

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

  useEffect(() => {
    if (!colaboradorId) {
      setVentasDelMes([]);
      setAvisoVentas("");
      return;
    }
    let cancel = false;
    setCargandoVentas(true);
    setAvisoVentas("");
    void (async () => {
      try {
        const data = await backendApi.get(
          `/api/ordenes/ventas?mes=${mes + 1}&anio=${año}`,
        );
        const list = Array.isArray(data) ? data.map(mapVentaFromApi) : [];
        const filtradas = list.filter(
          (v) => String(v.colaboradorId) === String(colaboradorId),
        );
        if (!cancel) {
          setVentasDelMes(filtradas);
          if (filtradas.length === 0 && list.length > 0) {
            setAvisoVentas(
              "Este colaborador no tiene ventas que crucen el mes seleccionado.",
            );
          }
        }
      } catch (e) {
        if (!cancel) {
          const local = ventasRegistradas.filter(
            (v) =>
              String(v.colaboradorId) === String(colaboradorId) &&
              ventaSolapaMesCalendario(v, mes, año),
          );
          setVentasDelMes(local);
          setAvisoVentas(
            e instanceof Error
              ? `Sin conexión al servidor (${e.message}). Mostrando ventas locales.`
              : "Mostrando ventas locales.",
          );
        }
      } finally {
        if (!cancel) setCargandoVentas(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [colaboradorId, mes, año, ventasRegistradas]);

  useEffect(() => {
    setVentasSeleccionadas(new Set(ventasDelMes.map((v) => String(v.id))));
  }, [colaboradorId, mes, año, ventaIdsKey]);

  useEffect(() => {
    const conProducto = new Set<string>();
    for (const v of ventasDelMes) {
      const id = String(v.id);
      const tieneProducto =
        Boolean(v.productoId) || Boolean((v.productoNombre ?? "").trim());
      if (tieneProducto) conProducto.add(id);
    }
    setVentasConProductoIncluido(conProducto);
  }, [colaboradorId, mes, año, ventaIdsKey]);

  const toggleVenta = useCallback((ventaId: string) => {
    setVentasSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(ventaId)) next.delete(ventaId);
      else next.add(ventaId);
      return next;
    });
  }, []);

  const toggleProductoEnOrden = useCallback((ventaId: string) => {
    setVentasConProductoIncluido((prev) => {
      const next = new Set(prev);
      if (next.has(ventaId)) next.delete(ventaId);
      else next.add(ventaId);
      return next;
    });
  }, []);

  const marcarTodasVentas = () =>
    setVentasSeleccionadas(new Set(ventasDelMes.map((v) => String(v.id))));
  const quitarTodasVentas = () => setVentasSeleccionadas(new Set());

  const seleccionArrays = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const v of ventasDelMes) {
      const id = String(v.id);
      if (!ventasSeleccionadas.has(id)) continue;
      const pids = [...new Set(v.pantallasIds ?? [])];
      m.set(id, pids);
    }
    return m;
  }, [ventasDelMes, ventasSeleccionadas]);

  const ventasAjustadasParaOrden = useMemo(() => {
    return ventasDelMes.map((v) => {
      const id = String(v.id);
      const incluirProducto = ventasConProductoIncluido.has(id);
      const precioGeneralActual = Math.max(0, Number(v.precioGeneral ?? 0));
      return {
        ...v,
        productoIncluidoEnOrden: incluirProducto,
        precioBaseMensualOrden: precioGeneralActual,
      };
    });
  }, [ventasDelMes, ventasConProductoIncluido]);

  const detalleLineas = useMemo(
    () => construirDetalleLineas(ventasAjustadasParaOrden, seleccionArrays, pantallas),
    [ventasAjustadasParaOrden, seleccionArrays, pantallas],
  );

  const { subtotal, iva, total } = useMemo(
    () => totalesDesdeLineas(detalleLineas, config.ivaPercentaje),
    [detalleLineas, config.ivaPercentaje],
  );

  const ventasIds = useMemo(
    () => ventasIdsDesdeSeleccion(seleccionArrays),
    [seleccionArrays],
  );

  const handleConfirmar = async () => {
    if (!colaboradorId) {
      alert("Selecciona un colaborador");
      return;
    }
    if (ventasDelMes.length === 0) {
      alert("No hay ventas para ese período");
      return;
    }
    if (ventasSeleccionadas.size === 0 || detalleLineas.length === 0) {
      alert("Selecciona al menos una venta");
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
    <div className="modal-overlay modal-crear-orden-overlay" onClick={onCancelar}>
      <div
        className="modal-container modal-crear-orden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header modal-crear-orden-header">
          <div>
            <h2>Nueva orden de compra</h2>
          </div>
          <button type="button" className="modal-close" onClick={onCancelar}>
            ✕
          </button>
        </div>

        <div className="modal-steps modal-crear-orden-steps">
          <div className={`step ${pasoActual >= 1 ? "step-activo" : ""}`}>
            <span className="step-num">1</span>
            <span className="step-label">Colaborador</span>
          </div>
          <div className="step-linea" />
          <div className={`step ${pasoActual >= 2 ? "step-activo" : ""}`}>
            <span className="step-num">2</span>
            <span className="step-label">Ventas y totales</span>
          </div>
        </div>

        <div className="modal-body">
          {mensajeError ? (
            <div className="modal-error-banner" role="alert">
              {mensajeError}
            </div>
          ) : null}
          <div className="modal-section modal-crear-orden-section">
            <h3>Colaborador</h3>
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
              className="form-select form-select-lg modal-crear-orden-select"
              disabled={cargandoColabs}
            >
              <option value="">
                {cargandoColabs
                  ? "— Cargando… —"
                  : clientes.length === 0
                    ? "— No hay colaboradores —"
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
              <div className="colaborador-ficha modal-colaborador-ficha">
                {colaboradorSeleccionado.alias && (
                  <span>{colaboradorSeleccionado.alias}</span>
                )}
                {colaboradorSeleccionado.telefono && (
                  <span>{colaboradorSeleccionado.telefono}</span>
                )}
                {colaboradorSeleccionado.email && (
                  <span>{colaboradorSeleccionado.email}</span>
                )}
              </div>
            )}
          </div>

          {colaboradorId && (
            <>
              <div className="modal-section modal-crear-orden-section">
                <h3>Período</h3>
                <div className="form-row modal-periodo-row">
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

              <div className="modal-section modal-crear-orden-section">
                <div className="modal-section-toolbar modal-ventas-toolbar">
                  <h3>
                    Ventas a incluir
                    <span className="badge-count">{ventasSeleccionadas.size}</span>
                  </h3>
                  <div className="toolbar-chips">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={marcarTodasVentas}
                      disabled={ventasDelMes.length === 0}
                    >
                      Marcar todas
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline"
                      onClick={quitarTodasVentas}
                      disabled={ventasDelMes.length === 0}
                    >
                      Quitar todas
                    </button>
                  </div>
                </div>

                {cargandoVentas ? (
                  <p className="modal-cargando-hint">Cargando ventas del mes…</p>
                ) : null}
                {avisoVentas ? (
                  <div className="modal-aviso-ventas" role="status">
                    {avisoVentas}
                  </div>
                ) : null}

                {ventasDelMes.length === 0 && !cargandoVentas ? (
                  <div className="empty-msg">
                    <p>
                      No hay ventas que crucen {MESES[mes]} {año} para{" "}
                      {colaboradorSeleccionado?.nombre ?? "este colaborador"}.
                    </p>
                  </div>
                ) : null}

                {ventasDelMes.length > 0 ? (
                  <ul className="modal-ventas-seleccion-list">
                    {ventasDelMes.map((v) => {
                      const id = String(v.id);
                      const checked = ventasSeleccionadas.has(id);
                      const pids = [...new Set(v.pantallasIds ?? [])];
                      const importeLinea = detalleLineas
                        .filter((l) => String(l.venta_id) === id)
                        .reduce((s, l) => s + l.importe, 0);
                      const productoTxt =
                        (v.productoNombre ?? "").trim() || "Sin producto";
                      const precioMensual = Number(v.precioGeneral ?? 0) || 0;
                      const precioProducto =
                        Number(v.productoPrecioMensual ?? 0) || 0;
                      const tieneProducto =
                        Boolean(v.productoId) ||
                        Boolean((v.productoNombre ?? "").trim());
                      const incluirProducto =
                        ventasConProductoIncluido.has(id);
                      return (
                        <li key={id}>
                          <label className="modal-venta-fila">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleVenta(id)}
                            />
                            <span className="modal-venta-fila-body">
                              <span className="modal-venta-titulo">
                                {v.vendidoA || "—"}
                              </span>
                              <span className="modal-venta-pantallas">
                                Producto: {productoTxt}
                              </span>
                              <span className="modal-venta-pantallas">
                                Precio producto: ${fmtMoney(precioProducto)}
                              </span>
                              <span className="modal-venta-pantallas">
                                Precio mensual venta: ${fmtMoney(precioMensual)}
                              </span>
                              {tieneProducto ? (
                                <span className="modal-venta-pantallas">
                                  <input
                                    type="checkbox"
                                    checked={incluirProducto}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={() => toggleProductoEnOrden(id)}
                                  />{" "}
                                  Sumar producto en esta orden
                                </span>
                              ) : null}
                              <span className="modal-venta-pantallas">
                                Pantallas:{" "}
                                {nombresPantallas(pids, pantallas) || "—"}
                              </span>
                            </span>
                            <span className="modal-venta-importe">
                              $
                              {(checked ? importeLinea : 0).toLocaleString("es-MX", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

                <div className="modal-totales modal-totales-orden">
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
              ventasSeleccionadas.size === 0 ||
              detalleLineas.length === 0 ||
              guardando ||
              cargandoVentas
            }
          >
            {guardando ? "Guardando…" : "Guardar orden"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
