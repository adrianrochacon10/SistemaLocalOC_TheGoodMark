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
import {
  mapVentaFromApi,
  detallePantallaId,
  detallePrecioMensual,
} from "../../../utils/ordenApiMapper";
import { ventaSolapaMesCalendario } from "../../../utils/ordenUtils";
import {
  construirDetalleLineas,
  totalesDesdeLineas,
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

const round2 = (n: number) => Math.round(n * 100) / 100;

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
  const [pantallasSeleccionadasPorVenta, setPantallasSeleccionadasPorVenta] =
    useState<Record<string, string[]>>({});
  const [ventasConProductoIncluido, setVentasConProductoIncluido] = useState<
    Set<string>
  >(() => new Set());
  /** Gastos adicionales de la venta incluidos en el cálculo de la orden (mismo monto que trae la venta). */
  const [ventasConGastosIncluido, setVentasConGastosIncluido] = useState<
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
    const todas = new Set(ventasDelMes.map((v) => String(v.id)));
    const porVenta: Record<string, string[]> = {};
    for (const v of ventasDelMes) {
      porVenta[String(v.id)] = [...new Set(v.pantallasIds ?? [])];
    }
    setVentasSeleccionadas(todas);
    setPantallasSeleccionadasPorVenta(porVenta);
  }, [colaboradorId, mes, año, ventaIdsKey]);

  // El producto solo cuenta si el usuario lo marca (como pantallas). No auto-marcar todas las ventas.
  useEffect(() => {
    setVentasConProductoIncluido(new Set());
  }, [colaboradorId, mes, año, ventaIdsKey]);

  // Gastos adicionales: por defecto se toman de la venta (incluidos si la venta tiene monto > 0).
  useEffect(() => {
    const next = new Set<string>();
    for (const v of ventasDelMes) {
      const g = Number(v.gastosAdicionales ?? 0) || 0;
      if (g > 0) next.add(String(v.id));
    }
    setVentasConGastosIncluido(next);
  }, [colaboradorId, mes, año, ventaIdsKey]);

  const toggleVenta = useCallback((ventaId: string) => {
    setVentasSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(ventaId)) {
        next.delete(ventaId);
        setPantallasSeleccionadasPorVenta((prevSel) => ({
          ...prevSel,
          [ventaId]: [],
        }));
        setVentasConProductoIncluido((prevProd) => {
          const n = new Set(prevProd);
          n.delete(String(ventaId));
          return n;
        });
        setVentasConGastosIncluido((prevG) => {
          const n = new Set(prevG);
          n.delete(String(ventaId));
          return n;
        });
      } else {
        next.add(ventaId);
        const venta = ventasDelMes.find((v) => String(v.id) === String(ventaId));
        const pids = [...new Set(venta?.pantallasIds ?? [])];
        setPantallasSeleccionadasPorVenta((prevSel) => ({
          ...prevSel,
          [ventaId]: pids,
        }));
        const g = Number(venta?.gastosAdicionales ?? 0) || 0;
        if (g > 0) {
          setVentasConGastosIncluido((prevG) => new Set(prevG).add(String(ventaId)));
        }
      }
      return next;
    });
  }, [ventasDelMes]);

  const togglePantallaEnVenta = useCallback(
    (ventaId: string, pantallaId: string) => {
      const venta = ventasDelMes.find((v) => String(v.id) === String(ventaId));
      const validas = new Set((venta?.pantallasIds ?? []).map(String));
      if (!validas.has(String(pantallaId))) return;
      setPantallasSeleccionadasPorVenta((prev) => {
        const actual = Array.isArray(prev[ventaId]) ? prev[ventaId] : [];
        const set = new Set(actual.map(String));
        if (set.has(String(pantallaId))) set.delete(String(pantallaId));
        else set.add(String(pantallaId));
        const nextArr = [...set];
        setVentasSeleccionadas((prevVentas) => {
          const nextVentas = new Set(prevVentas);
          const tieneProductoIncluido = ventasConProductoIncluido.has(String(ventaId));
          if (nextArr.length > 0 || tieneProductoIncluido) nextVentas.add(String(ventaId));
          else nextVentas.delete(String(ventaId));
          return nextVentas;
        });
        return { ...prev, [ventaId]: nextArr };
      });
    },
    [ventasDelMes, ventasConProductoIncluido],
  );

  const toggleProductoEnOrden = useCallback((ventaId: string) => {
    setVentasConProductoIncluido((prev) => {
      const next = new Set(prev);
      if (next.has(ventaId)) {
        next.delete(ventaId);
        setVentasSeleccionadas((prevVentas) => {
          const nextVentas = new Set(prevVentas);
          const pantallasSel = pantallasSeleccionadasPorVenta[String(ventaId)] ?? [];
          if ((pantallasSel?.length ?? 0) === 0) nextVentas.delete(String(ventaId));
          return nextVentas;
        });
      } else {
        next.add(ventaId);
        // Permite orden solo de producto sin pantallas.
        setVentasSeleccionadas((prevVentas) => {
          const nextVentas = new Set(prevVentas);
          nextVentas.add(String(ventaId));
          return nextVentas;
        });
      }
      return next;
    });
  }, [pantallasSeleccionadasPorVenta]);

  const marcarTodasVentas = () =>
    {
      setVentasSeleccionadas(new Set(ventasDelMes.map((v) => String(v.id))));
      const porVenta: Record<string, string[]> = {};
      const conGastos = new Set<string>();
      for (const v of ventasDelMes) {
        const id = String(v.id);
        porVenta[id] = [...new Set(v.pantallasIds ?? [])];
        if ((Number(v.gastosAdicionales ?? 0) || 0) > 0) conGastos.add(id);
      }
      setPantallasSeleccionadasPorVenta(porVenta);
      setVentasConGastosIncluido(conGastos);
    };
  const quitarTodasVentas = () => {
    setVentasSeleccionadas(new Set());
    setVentasConProductoIncluido(new Set());
    setVentasConGastosIncluido(new Set());
    const porVenta: Record<string, string[]> = {};
    for (const v of ventasDelMes) porVenta[String(v.id)] = [];
    setPantallasSeleccionadasPorVenta(porVenta);
  };

  const toggleGastosEnOrden = useCallback((ventaId: string) => {
    const venta = ventasDelMes.find((v) => String(v.id) === String(ventaId));
    const g = Number(venta?.gastosAdicionales ?? 0) || 0;
    if (g <= 0) return;
    setVentasConGastosIncluido((prev) => {
      const next = new Set(prev);
      if (next.has(ventaId)) next.delete(ventaId);
      else next.add(ventaId);
      return next;
    });
  }, [ventasDelMes]);

  const seleccionArrays = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const v of ventasDelMes) {
      const id = String(v.id);
      if (!ventasSeleccionadas.has(id)) continue;
      const pids = (pantallasSeleccionadasPorVenta[id] ?? []).filter((pid) =>
        (v.pantallasIds ?? []).includes(pid),
      );
      m.set(id, pids);
    }
    return m;
  }, [ventasDelMes, ventasSeleccionadas, pantallasSeleccionadasPorVenta]);

  const ventasAjustadasParaOrden = useMemo(() => {
    return ventasDelMes.map((v) => {
      const id = String(v.id);
      const incluirProducto = ventasConProductoIncluido.has(id);
      const incluirGastos = ventasConGastosIncluido.has(id);
      const precioGeneralActual = Math.max(0, Number(v.precioGeneral ?? 0));
      const G = Math.max(0, Number(v.gastosAdicionales ?? 0) || 0);
      const T = Math.max(0, Number(v.importeTotal ?? v.precioTotal ?? 0) || 0);
      const totalSinGastos = Math.max(0, round2(T - G));
      return {
        ...v,
        productoIncluidoEnOrden: incluirProducto,
        precioBaseMensualOrden: precioGeneralActual,
        gastosAdicionales: incluirGastos ? G : 0,
        importeTotal: incluirGastos ? T : totalSinGastos,
        precioTotal: incluirGastos ? T : totalSinGastos,
      };
    });
  }, [ventasDelMes, ventasConProductoIncluido, ventasConGastosIncluido]);

  const detalleLineas = useMemo(
    () => construirDetalleLineas(ventasAjustadasParaOrden, seleccionArrays, pantallas),
    [ventasAjustadasParaOrden, seleccionArrays, pantallas],
  );

  const { subtotal, iva, total } = useMemo(
    () => totalesDesdeLineas(detalleLineas, config.ivaPercentaje),
    [detalleLineas, config.ivaPercentaje],
  );

  const ventasIds = useMemo(
    () => [...new Set(detalleLineas.map((l) => String(l.venta_id)).filter(Boolean))],
    [detalleLineas],
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
    if (detalleLineas.length === 0) {
      alert("Selecciona al menos una pantalla o activa la opción de producto.");
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

        <div className="modal-steps modal-crear-orden-steps modal-crear-orden-steps--compact">
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
          <div className="modal-crear-orden-filtros">
            <div className="modal-section modal-crear-orden-section modal-crear-orden-section--compact">
            <h3 className="modal-crear-orden-heading-compact">Colaborador</h3>
            {cargandoColabs ? (
              <p className="modal-cargando-hint modal-cargando-hint--sm">Cargando colaboradores…</p>
            ) : null}
            {errorCargaColabs ? (
              <div className="modal-error-banner" role="alert">
                {errorCargaColabs}
              </div>
            ) : null}
            <select
              value={colaboradorId}
              onChange={(e) => setColaboradorId(e.target.value)}
              className="form-select modal-crear-orden-select modal-crear-orden-select--compact"
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
              <div className="colaborador-ficha modal-colaborador-ficha modal-colaborador-ficha--compact">
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

            {colaboradorId ? (
              <div className="modal-section modal-crear-orden-section modal-crear-orden-section--compact">
                <h3 className="modal-crear-orden-heading-compact">Período</h3>
                <div className="form-row modal-periodo-row modal-periodo-row--compact">
                  <div className="form-group">
                    <label className="modal-label-sm">Mes</label>
                    <select
                      value={mes}
                      onChange={(e) => setMes(Number(e.target.value))}
                      className="form-select modal-crear-orden-select--compact"
                    >
                      {MESES.map((mName, i) => (
                        <option key={i} value={i}>
                          {mName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="modal-label-sm">Año</label>
                    <select
                      value={año}
                      onChange={(e) => setAño(Number(e.target.value))}
                      className="form-select modal-crear-orden-select--compact"
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
            ) : null}
          </div>

          {colaboradorId && (
            <>
              <div className="modal-section modal-crear-orden-section modal-crear-orden-section--ventas">
                <div className="modal-section-toolbar modal-ventas-toolbar">
                  <h3 className="modal-crear-orden-heading-ventas">
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
                      const productoTxt = (v.productoNombre ?? "").trim();
                      const precioProducto =
                        Number(v.productoPrecioMensual ?? 0) || 0;
                      const tieneProducto =
                        Boolean(v.productoId) ||
                        (Array.isArray(v.productoIds) && v.productoIds.length > 0) ||
                        Boolean((v.productoNombre ?? "").trim()) ||
                        Number(v.productoPrecioMensual ?? 0) > 0;
                      const productoLabel = tieneProducto
                        ? productoTxt || "Producto(s) de la venta"
                        : "Sin producto";
                      const incluirProducto =
                        ventasConProductoIncluido.has(id);
                      const gastosVenta =
                        Math.max(0, Number(v.gastosAdicionales ?? 0) || 0);
                      const incluirGastos = ventasConGastosIncluido.has(id);
                      const pantallasDeVenta = [...new Set(v.pantallasIds ?? [])];
                      const pantallasSeleccionadasLocal =
                        pantallasSeleccionadasPorVenta[id] ?? [];
                      const resumenSeleccion = `${pantallasSeleccionadasLocal.length} pantalla${pantallasSeleccionadasLocal.length !== 1 ? "s" : ""}${
                        incluirProducto ? " + producto" : ""
                      }${incluirGastos && gastosVenta > 0 ? " + gastos adic." : ""}`;
                      const mainChkId = `modal-venta-main-${id}`;
                      return (
                        <li key={id}>
                          <div className="modal-venta-fila">
                            <input
                              id={mainChkId}
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleVenta(id)}
                            />
                            <div className="modal-venta-fila-body">
                              <label htmlFor={mainChkId} className="modal-venta-fila-select">
                                <span className="modal-venta-titulo">
                                  {v.vendidoA || "—"}
                                </span>
                                <div className="modal-venta-meta">
                                  <div className="modal-venta-meta-row">
                                    <span className="modal-venta-meta-k">Producto</span>
                                    <span className="modal-venta-meta-v">{productoLabel}</span>
                                  </div>
                                  {tieneProducto ? (
                                    <div className="modal-venta-meta-row">
                                      <span className="modal-venta-meta-k">Precio producto</span>
                                      <span className="modal-venta-meta-v">
                                        ${fmtMoney(precioProducto)}/mes
                                      </span>
                                    </div>
                                  ) : null}
                                  <div className="modal-venta-meta-row">
                                    <span className="modal-venta-meta-k">Pantallas del contrato</span>
                                    <span className="modal-venta-meta-v">
                                      {nombresPantallas(pids, pantallas) || "—"}
                                    </span>
                                  </div>
                                  {gastosVenta > 0 ? (
                                    <div className="modal-venta-meta-row">
                                      <span className="modal-venta-meta-k">Gastos adic. (venta)</span>
                                      <span className="modal-venta-meta-v">
                                        ${fmtMoney(gastosVenta)}
                                      </span>
                                    </div>
                                  ) : null}
                                </div>
                                <p className="modal-venta-resumen">
                                  Incluye en esta orden: <strong>{resumenSeleccion}</strong>
                                </p>
                              </label>
                              {tieneProducto ? (
                                <div className="modal-venta-section">
                                  <div className="modal-venta-section-title">Producto en esta orden</div>
                                  <label className="modal-venta-check-row">
                                    <input
                                      id={`modal-venta-prod-${id}`}
                                      type="checkbox"
                                      checked={incluirProducto}
                                      onChange={() => toggleProductoEnOrden(id)}
                                    />
                                    <span className="modal-venta-check-label">
                                      Incluir producto (${fmtMoney(precioProducto)}/mes)
                                    </span>
                                  </label>
                                </div>
                              ) : null}
                              {pantallasDeVenta.length > 0 ? (
                                <div className="modal-venta-section">
                                  <div className="modal-venta-section-title">
                                    Pantallas en esta orden
                                  </div>
                                  <div className="modal-venta-checklist" role="group">
                                    {pantallasDeVenta.map((pid) => {
                                      const nombre =
                                        pantallas.find((p) => String(p.id) === String(pid))
                                          ?.nombre ?? "Pantalla";
                                      const marcada = pantallasSeleccionadasLocal.includes(pid);
                                      const snap = v.pantallasDetalle?.find(
                                        (d) =>
                                          detallePantallaId(d) === String(pid),
                                      );
                                      const precioSnap = detallePrecioMensual(snap);
                                      const precioCat =
                                        Number(
                                          pantallas.find((p) => String(p.id) === String(pid))
                                            ?.precio ?? 0,
                                        ) || 0;
                                      const precioUnit =
                                        precioSnap > 0 ? precioSnap : precioCat;
                                      const subId = `modal-venta-p-${id}-${pid}`;
                                      return (
                                        <label key={`${id}-${pid}`} className="modal-venta-check-row">
                                          <input
                                            id={subId}
                                            type="checkbox"
                                            checked={marcada}
                                            onChange={() => togglePantallaEnVenta(id, pid)}
                                          />
                                          <span className="modal-venta-check-label">{nombre}</span>
                                          <span className="modal-venta-check-precio">
                                            ${fmtMoney(precioUnit)}/mes
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : null}
                              {gastosVenta > 0 ? (
                                <div className="modal-venta-section modal-venta-section--gastos-last">
                                  <div className="modal-venta-section-title">
                                    Gastos adicionales
                                  </div>
                                  {incluirGastos ? (
                                    <div className="modal-venta-gastos-estado">
                                      <span className="modal-venta-gastos-estado-txt">
                                        Incluidos en la orden:{" "}
                                        <strong>${fmtMoney(gastosVenta)}</strong>{" "}
                                        (de la venta)
                                      </span>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline modal-venta-gastos-quitar"
                                        onClick={() => toggleGastosEnOrden(id)}
                                      >
                                        Quitar
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline modal-venta-gastos-agregar"
                                      onClick={() => toggleGastosEnOrden(id)}
                                    >
                                      Agregar gastos adicionales (${fmtMoney(gastosVenta)})
                                    </button>
                                  )}
                                </div>
                              ) : null}
                            </div>
                            <label htmlFor={mainChkId} className="modal-venta-importe">
                              $
                              {(checked ? importeLinea : 0).toLocaleString("es-MX", {
                                minimumFractionDigits: 2,
                              })}
                            </label>
                          </div>
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
