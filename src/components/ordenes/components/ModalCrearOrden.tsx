import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
} from "react";
import ReactDOM from "react-dom";
import { toast } from "react-toastify";
import {
  RegistroVenta,
  Colaborador,
  Pantalla,
  Producto,
  ConfiguracionEmpresa,
} from "../../../types";
import { backendApi } from "../../../lib/backendApi";
import {
  mapVentaFromApi,
  detallePantallaId,
  detallePrecioMensual,
  PREFIJO_LINEA_PRODUCTO,
} from "../../../utils/ordenApiMapper";
import {
  ventaIncluidaEnMesOrdenConCorte,
  porcentajeSocioEfectivoVentaEnOrden,
} from "../../../utils/ordenUtils";
import {
  construirDetalleLineas,
  totalesDesdeLineas,
  nombresPantallas,
  enriquecerProductoNombreMultiplesIds,
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

function esVentaPorDiasModal(v: RegistroVenta): boolean {
  const unidad = String((v as { duracionUnidad?: string }).duracionUnidad ?? "")
    .toLowerCase()
    .trim();
  if (["dias", "días", "dia", "día"].includes(unidad)) return true;
  if ((v as { gastoAdicionalEnDias?: boolean }).gastoAdicionalEnDias === true) {
    return true;
  }
  const notas = String(v.notas ?? "").toLowerCase();
  if (notas.includes("gasto_dia") || notas.includes("al día") || notas.includes("al dia")) {
    return true;
  }
  const mr = Math.max(1, Number(v.mesesRenta ?? 1) || 1);
  const fi = new Date(v.fechaInicio);
  const ff = new Date(v.fechaFin);
  if (Number.isNaN(fi.getTime()) || Number.isNaN(ff.getTime())) return false;
  const dias = Math.max(1, Math.round((ff.getTime() - fi.getTime()) / 86400000) + 1);
  if ([1, 3, 7, 15].includes(mr) && dias <= 31) return true;
  if (mr === dias || Math.abs(dias - mr) <= 1) return true;
  return false;
}

function costoVentaBrutoVenta(v: RegistroVenta): number {
  return Math.max(0, Number(v.costoVenta ?? v.costos ?? 0) || 0);
}

/** Prorrateo mensual (contratos por meses); por días se muestra el total del período. */
function costoVentaDesgloseParaOrden(v: RegistroVenta): {
  total: number;
  mensual: number;
  etiquetaSufijo: string;
} {
  const total = costoVentaBrutoVenta(v);
  if (total <= 0) {
    return { total: 0, mensual: 0, etiquetaSufijo: "/mes" };
  }
  if (esVentaPorDiasModal(v)) {
    return { total, mensual: total, etiquetaSufijo: " (período)" };
  }
  const meses = Math.max(1, Number(v.mesesRenta ?? 1) || 1);
  return {
    total,
    mensual: round2(total / meses),
    etiquetaSufijo: "/mes",
  };
}

function precioVentaMensualBrutoModal(v: RegistroVenta, porDias: boolean): number {
  if (porDias) {
    return Math.max(
      0,
      Number(v.precioGeneral ?? v.importeTotal ?? v.precioTotal ?? 0) || 0,
    );
  }
  const pg = Number(v.precioGeneral ?? 0) || 0;
  if (pg > 0) return pg;
  const tot = Math.max(0, Number(v.importeTotal ?? v.precioTotal ?? 0) || 0);
  const meses = Math.max(1, Number(v.mesesRenta ?? 1) || 1);
  return round2(tot / meses);
}

/**
 * Colaborador por %: **cuota del socio** = precio de venta (bruto) × % — lo mismo que PDF/subtotal OC.
 * No usar (100−%): eso es “lo que queda” del cliente, no la cuota a pagar al colaborador.
 */
function cuotaSocioDesdePrecioVentaDesglose(
  v: RegistroVenta,
  porDias: boolean,
  pctSocio: number,
): { total: number; mensual: number; etiquetaSufijo: string } {
  const p = Math.min(100, Math.max(0, Number(pctSocio) || 0));
  const factorPct = p / 100;
  if (porDias) {
    const bruto = Math.max(
      0,
      Number(v.precioGeneral ?? v.importeTotal ?? v.precioTotal ?? 0) || 0,
    );
    const cuota = round2(bruto * factorPct);
    return { mensual: cuota, total: cuota, etiquetaSufijo: " (período)" };
  }
  const meses = Math.max(1, Number(v.mesesRenta ?? 1) || 1);
  const mensualBruto = precioVentaMensualBrutoModal(v, false);
  const cuotaMensual = round2(mensualBruto * factorPct);
  const totalCuotaContrato = round2(cuotaMensual * meses);
  return { mensual: cuotaMensual, total: totalCuotaContrato, etiquetaSufijo: "/mes" };
}

function idsProductosVenta(v: RegistroVenta): string[] {
  if (Array.isArray(v.productoIds) && v.productoIds.length > 0) {
    return v.productoIds.map((x) => String(x));
  }
  if (v.productoId) return [String(v.productoId)];
  return [];
}

function nombreProductoEnVenta(
  productoId: string,
  v: RegistroVenta,
  catalogo: Producto[],
): string {
  const p = catalogo.find((x) => String(x.id) === String(productoId));
  if (p?.nombre?.trim()) return p.nombre.trim();
  const nombres = (v.productoNombre ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const ids = idsProductosVenta(v);
  const idx = ids.indexOf(String(productoId));
  if (idx >= 0 && nombres[idx]) return nombres[idx];
  return "Producto";
}

/** Reparto equitativo del total mensual de producto entre las líneas de la venta (fallback). */
function precioMensualPorProductoLinea(v: RegistroVenta): number {
  const ids = idsProductosVenta(v);
  const total = Number(v.productoPrecioMensual ?? 0) || 0;
  if (ids.length === 0) return 0;
  return round2(total / ids.length);
}

/** Precio mensual guardado en `pantallasDetalle` (`__producto_linea__{id}`) o reparto equitativo. */
function precioMensualProductoDesdeDetalle(
  v: RegistroVenta,
  productoId: string,
): number {
  const key = `${PREFIJO_LINEA_PRODUCTO}${String(productoId)}`;
  const snap = v.pantallasDetalle?.find((d) => detallePantallaId(d) === key);
  if (snap) return round2(detallePrecioMensual(snap));
  return precioMensualPorProductoLinea(v);
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
  const [ventasDelMes, setVentasDelMes] = useState<RegistroVenta[]>([]);
  const [cargandoVentas, setCargandoVentas] = useState(false);
  const [avisoVentas, setAvisoVentas] = useState("");
  /** Ventas (contratos) incluidas en la orden */
  const [ventasSeleccionadas, setVentasSeleccionadas] = useState<Set<string>>(
    () => new Set(),
  );
  const [pantallasSeleccionadasPorVenta, setPantallasSeleccionadasPorVenta] =
    useState<Record<string, string[]>>({});
  /** IDs de producto incluidos en la orden por venta (subconjunto de `productoIds` de la venta). */
  const [productosIncluidosPorVenta, setProductosIncluidosPorVenta] = useState<
    Record<string, string[]>
  >({});
  const [guardando, setGuardando] = useState(false);
  const [productosCatalogo, setProductosCatalogo] = useState<Producto[]>([]);

  const pasoActual = colaboradorId ? 2 : 1;
  const años = Array.from({ length: 4 }, (_, i) => hoy.getFullYear() - 2 + i);
  const colaboradorSeleccionado = clientes.find((c) => c.id === colaboradorId);
  const esColaboradorPorcentaje = useMemo(() => {
    const tc = String(colaboradorSeleccionado?.tipoComision ?? "").toLowerCase();
    if (tc === "porcentaje") return true;
    const tpn = String(colaboradorSeleccionado?.tipoPagoNombre ?? "").toLowerCase();
    return tpn.includes("porcentaje");
  }, [colaboradorSeleccionado?.tipoComision, colaboradorSeleccionado?.tipoPagoNombre]);

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
    let cancel = false;
    void (async () => {
      try {
        const data = await backendApi.get("/api/productos");
        if (!cancel && Array.isArray(data)) setProductosCatalogo(data as Producto[]);
      } catch {
        if (!cancel) setProductosCatalogo([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const ventasParaOrden = useMemo(
    () => enriquecerProductoNombreMultiplesIds(ventasDelMes, productosCatalogo),
    [ventasDelMes, productosCatalogo],
  );

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
          (v) =>
            String(v.colaboradorId) === String(colaboradorId) &&
            String(v.estadoVenta ?? "").toLowerCase() === "aceptado",
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
              ventaIncluidaEnMesOrdenConCorte(
                v,
                mes,
                año,
                Number(config.diaCorteOrdenes ?? 20) || 20,
              ) &&
              String(v.estadoVenta ?? "").toLowerCase() === "aceptado",
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
  }, [colaboradorId, mes, año, ventasRegistradas, config.diaCorteOrdenes]);

  useEffect(() => {
    const todas = new Set(ventasDelMes.map((v) => String(v.id)));
    const porVenta: Record<string, string[]> = {};
    const porProd: Record<string, string[]> = {};
    for (const v of ventasDelMes) {
      const id = String(v.id);
      porVenta[id] = [...new Set(v.pantallasIds ?? [])];
      porProd[id] = idsProductosVenta(v);
    }
    setVentasSeleccionadas(todas);
    setPantallasSeleccionadasPorVenta(porVenta);
    setProductosIncluidosPorVenta(porProd);
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
        setProductosIncluidosPorVenta((prev) => {
          const next = { ...prev };
          delete next[String(ventaId)];
          return next;
        });
      } else {
        next.add(ventaId);
        const venta = ventasDelMes.find((v) => String(v.id) === String(ventaId));
        const pids = [...new Set(venta?.pantallasIds ?? [])];
        setPantallasSeleccionadasPorVenta((prevSel) => ({
          ...prevSel,
          [ventaId]: pids,
        }));
        setProductosIncluidosPorVenta((prevProd) => ({
          ...prevProd,
          [ventaId]: venta ? idsProductosVenta(venta) : [],
        }));
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
          const tieneProductoIncluido =
            (productosIncluidosPorVenta[String(ventaId)]?.length ?? 0) > 0;
          if (nextArr.length > 0 || tieneProductoIncluido) nextVentas.add(String(ventaId));
          else nextVentas.delete(String(ventaId));
          return nextVentas;
        });
        return { ...prev, [ventaId]: nextArr };
      });
    },
    [ventasDelMes, productosIncluidosPorVenta],
  );

  const toggleProductoEnOrden = useCallback(
    (ventaId: string, productoId: string) => {
      const pid = String(productoId);
      setProductosIncluidosPorVenta((prev) => {
        const cur = [...(prev[ventaId] ?? [])];
        const i = cur.indexOf(pid);
        if (i >= 0) cur.splice(i, 1);
        else cur.push(pid);
        const next = { ...prev, [ventaId]: cur };
        setVentasSeleccionadas((prevVentas) => {
          const nextVentas = new Set(prevVentas);
          const pantallasSel =
            pantallasSeleccionadasPorVenta[String(ventaId)] ?? [];
          if (cur.length === 0 && (pantallasSel?.length ?? 0) === 0) {
            nextVentas.delete(String(ventaId));
          } else {
            nextVentas.add(String(ventaId));
          }
          return nextVentas;
        });
        return next;
      });
    },
    [pantallasSeleccionadasPorVenta],
  );

  const marcarTodasVentas = () => {
    setVentasSeleccionadas(new Set(ventasDelMes.map((v) => String(v.id))));
    const porVenta: Record<string, string[]> = {};
    const porProd: Record<string, string[]> = {};
    for (const v of ventasDelMes) {
      const id = String(v.id);
      porVenta[id] = [...new Set(v.pantallasIds ?? [])];
      porProd[id] = idsProductosVenta(v);
    }
    setPantallasSeleccionadasPorVenta(porVenta);
    setProductosIncluidosPorVenta(porProd);
  };
  const quitarTodasVentas = () => {
    setVentasSeleccionadas(new Set());
    setProductosIncluidosPorVenta({});
    const porVenta: Record<string, string[]> = {};
    for (const v of ventasDelMes) porVenta[String(v.id)] = [];
    setPantallasSeleccionadasPorVenta(porVenta);
  };

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
    return ventasParaOrden.map((v) => {
      const id = String(v.id);
      const idsProd = idsProductosVenta(v);
      const selRaw = productosIncluidosPorVenta[id] ?? [];
      const sel = selRaw.filter((pid) => idsProd.includes(String(pid)));
      const incluirProducto = sel.length > 0;
      // Precios de producto = los del contrato / Productos del colaborador (no volver a descontar %).
      const precioProdAjustado = round2(
        sel.reduce((s, pid) => {
          const base = precioMensualProductoDesdeDetalle(v, pid);
          return s + base;
        }, 0),
      );
      const nombresProd =
        sel.length > 0
          ? sel
              .map((pid) => nombreProductoEnVenta(pid, v, productosCatalogo))
              .join(", ")
          : undefined;
      const precioGeneralActual = Math.max(0, Number(v.precioGeneral ?? 0));
      const T = Math.max(0, Number(v.importeTotal ?? v.precioTotal ?? 0) || 0);
      const precioProductoContrato = round2(
        Number(v.productoPrecioMensual ?? 0) || 0,
      );
      return {
        ...v,
        productoIncluidoEnOrden: incluirProducto,
        productoPrecioMensual: precioProdAjustado,
        productoPrecioMensualContrato: precioProductoContrato,
        productoNombre: incluirProducto ? nombresProd : undefined,
        precioBaseMensualOrden: precioGeneralActual,
        gastosAdicionales: 0,
        importeTotal: T,
        precioTotal: T,
        ...(colaboradorSeleccionado?.tipoComision === "porcentaje"
          ? {
              aplicarPorcentajeSocioEnOrden: true,
            }
          : {}),
      };
    });
  }, [
    ventasParaOrden,
    productosIncluidosPorVenta,
    colaboradorSeleccionado?.tipoComision,
    productosCatalogo,
  ]);

  const detalleLineas = useMemo(
    () =>
      construirDetalleLineas(
        ventasAjustadasParaOrden,
        seleccionArrays,
        pantallas,
        mes,
        año,
        {
          prorratearEnMes: true,
          tipoComision: colaboradorSeleccionado?.tipoComision,
          tipoPagoNombre: colaboradorSeleccionado?.tipoPagoNombre,
          porcentajeColaboradorActual:
            typeof colaboradorSeleccionado?.porcentajeSocio === "number"
              ? colaboradorSeleccionado.porcentajeSocio
              : null,
        },
      ),
    [
      ventasAjustadasParaOrden,
      seleccionArrays,
      pantallas,
      mes,
      año,
      esColaboradorPorcentaje,
      colaboradorSeleccionado?.tipoComision,
      colaboradorSeleccionado?.tipoPagoNombre,
      colaboradorSeleccionado?.porcentajeSocio,
    ],
  );

  const ventasPorIdOrden = useMemo(() => {
    const m = new Map<string, RegistroVenta>();
    for (const v of ventasAjustadasParaOrden) m.set(String(v.id), v);
    return m;
  }, [ventasAjustadasParaOrden]);

  const { subtotal, iva, total } = useMemo(
    () =>
      totalesDesdeLineas(detalleLineas, config.ivaPercentaje, {
        tipoComision: colaboradorSeleccionado?.tipoComision,
        tipoPagoNombre: colaboradorSeleccionado?.tipoPagoNombre,
        porcentajeColaboradorActual:
          typeof colaboradorSeleccionado?.porcentajeSocio === "number"
            ? colaboradorSeleccionado.porcentajeSocio
            : null,
        mesOrden0: mes,
        añoOrden: año,
        diaCorteOrdenes: Number(config.diaCorteOrdenes ?? 20) || 20,
        ventasPorId: ventasPorIdOrden,
      }),
    [
      detalleLineas,
      config.ivaPercentaje,
      config.diaCorteOrdenes,
      mes,
      año,
      colaboradorSeleccionado?.tipoComision,
      colaboradorSeleccionado?.tipoPagoNombre,
      colaboradorSeleccionado?.porcentajeSocio,
      ventasPorIdOrden,
    ],
  );

  const ventasIds = useMemo(
    () => [...new Set(detalleLineas.map((l) => String(l.venta_id)).filter(Boolean))],
    [detalleLineas],
  );

  const handleConfirmar = async () => {
    if (!colaboradorId) {
      toast.warning("Selecciona un colaborador");
      return;
    }
    if (ventasDelMes.length === 0) {
      toast.warning("No hay ventas para ese período");
      return;
    }
    if (detalleLineas.length === 0) {
      toast.warning(
        "Selecciona al menos una pantalla o marca al menos un producto en la orden.",
      );
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
                    {ventasParaOrden.map((v) => {
                      const id = String(v.id);
                      const porDias = esVentaPorDiasModal(v);
                      const checked = ventasSeleccionadas.has(id);
                      const pids = [...new Set(v.pantallasIds ?? [])];
                      const productoTxt = (v.productoNombre ?? "").trim();
                      const productoIdsVenta = idsProductosVenta(v);
                      const tieneProducto =
                        Boolean(v.productoId) ||
                        (Array.isArray(v.productoIds) && v.productoIds.length > 0) ||
                        Boolean((v.productoNombre ?? "").trim()) ||
                        Number(v.productoPrecioMensual ?? 0) > 0;
                      const productoLabel = tieneProducto
                        ? productoTxt || "Producto(s) de la venta"
                        : "Sin producto";
                      const nProdSel = (productosIncluidosPorVenta[id] ?? []).length;
                      const pantallasDeVenta = [...new Set(v.pantallasIds ?? [])];
                      const pantallasSeleccionadasLocal =
                        pantallasSeleccionadasPorVenta[id] ?? [];
                      const incluirPctPdf = esColaboradorPorcentaje;
                      const resumenSeleccion = `${pantallasSeleccionadasLocal.length} pantalla${pantallasSeleccionadasLocal.length !== 1 ? "s" : ""}${
                        nProdSel > 0
                          ? ` + ${nProdSel} producto${nProdSel !== 1 ? "s" : ""}`
                          : ""
                      }${
                        incluirPctPdf ? " + % socio (PDF)" : ""
                      }`;
                      const mainChkId = `modal-venta-main-${id}`;
                      const costoDesgloseVenta = costoVentaDesgloseParaOrden(v);
                      const pctSocioVenta = porcentajeSocioEfectivoVentaEnOrden(
                        v,
                        typeof colaboradorSeleccionado?.porcentajeSocio ===
                          "number"
                          ? colaboradorSeleccionado.porcentajeSocio
                          : null,
                      );
                      const cuotaSocioDesglose =
                        esColaboradorPorcentaje && pctSocioVenta > 0
                          ? cuotaSocioDesdePrecioVentaDesglose(
                              v,
                              porDias,
                              pctSocioVenta,
                            )
                          : null;
                      const columnaReferenciaVenta =
                        cuotaSocioDesglose ?? costoDesgloseVenta;
                      const etiquetaColumnaReferencia = esColaboradorPorcentaje
                        ? "Cuota del socio (precio venta × %)"
                        : "Costo de la venta";
                      const mesesContratoVenta = Math.max(
                        1,
                        Number(v.mesesRenta ?? 1) || 1,
                      );
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
                                  <span className="modal-venta-titulo-cliente">Cliente:</span>{" "}
                                  {v.vendidoA || "—"}
                                </span>
                                <div className="modal-venta-meta">
                                  <div className="modal-venta-meta-row">
                                    <span className="modal-venta-meta-k">Producto</span>
                                    <span className="modal-venta-meta-v">{productoLabel}</span>
                                  </div>
                                  <div className="modal-venta-meta-row">
                                    <span className="modal-venta-meta-k">Pantallas del contrato</span>
                                    <span className="modal-venta-meta-v">
                                      {nombresPantallas(pids, pantallas, v) || "—"}
                                    </span>
                                  </div>
                                </div>
                                <p className="modal-venta-resumen">
                                  Incluye en esta orden: <strong>{resumenSeleccion}</strong>
                                </p>
                              </label>
                              {tieneProducto && productoIdsVenta.length > 0 ? (
                                <div className="modal-venta-section">
                                  <div className="modal-venta-section-title">
                                    Productos en esta orden
                                  </div>
                                  <div className="modal-venta-checklist" role="group">
                                    {productoIdsVenta.map((pid) => {
                                      const marcado = (
                                        productosIncluidosPorVenta[id] ?? []
                                      ).includes(String(pid));
                                      const nombreProd = nombreProductoEnVenta(
                                        pid,
                                        v,
                                        productosCatalogo,
                                      );
                                      const subProd = `modal-venta-prod-${id}-${pid}`;
                                      return (
                                        <label
                                          key={subProd}
                                          className="modal-venta-check-row"
                                        >
                                          <input
                                            id={subProd}
                                            type="checkbox"
                                            checked={marcado}
                                            onChange={() =>
                                              toggleProductoEnOrden(id, pid)
                                            }
                                          />
                                          <span className="modal-venta-check-label">
                                            {nombreProd}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : null}
                              {pantallasDeVenta.length > 0 ? (
                                <div className="modal-venta-section">
                                  <div className="modal-venta-section-title">
                                    Pantallas en esta orden
                                  </div>
                                  <div className="modal-venta-checklist" role="group">
                                    {pantallasDeVenta.map((pid) => {
                                      const marcada = pantallasSeleccionadasLocal.includes(pid);
                                      const snap = v.pantallasDetalle?.find(
                                        (d) =>
                                          detallePantallaId(d) === String(pid),
                                      );
                                      const nombre =
                                        String(snap?.nombre ?? "").trim() ||
                                        pantallas.find((p) => String(p.id) === String(pid))
                                          ?.nombre ||
                                        "Pantalla";
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
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : null}
                      {esColaboradorPorcentaje ? (
                                <div className="modal-venta-section modal-venta-section--gastos-last">
                                  <div className="modal-venta-section-title">
                                    Porcentaje del socio en esta venta
                                  </div>
                                  <div className="modal-venta-gastos-estado">
                                    <span className="modal-venta-gastos-estado-txt">
                                      Aplicado en la orden:{" "}
                                      <strong>
                                        {porcentajeSocioEfectivoVentaEnOrden(
                                          v,
                                          typeof colaboradorSeleccionado?.porcentajeSocio ===
                                            "number"
                                            ? colaboradorSeleccionado.porcentajeSocio
                                            : null,
                                        )}
                                        %
                                      </strong>
                                      .
                                    </span>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                            <label htmlFor={mainChkId} className="modal-venta-importe">
                              <span className="modal-venta-importe-k">
                                {etiquetaColumnaReferencia}
                              </span>
                              {columnaReferenciaVenta.total > 0 ? (
                                <>
                                  <span className="modal-venta-importe-v">
                                    $
                                    {fmtMoney(
                                      checked ? columnaReferenciaVenta.mensual : 0,
                                    )}
                                    {esColaboradorPorcentaje && cuotaSocioDesglose
                                      ? porDias
                                        ? " (período)"
                                        : " /mes"
                                      : porDias
                                        ? " /día"
                                        : " /mes"}
                                  </span>
                                  {!porDias && mesesContratoVenta > 1 ? (
                                    <span className="modal-venta-importe-sub">
                                      {esColaboradorPorcentaje
                                        ? "Total cuota del contrato:"
                                        : "Total contrato:"}{" "}
                                      <strong>
                                        $
                                        {fmtMoney(columnaReferenciaVenta.total)}
                                      </strong>
                                    </span>
                                  ) : porDias ? (
                                    <span className="modal-venta-importe-sub">
                                      {esColaboradorPorcentaje
                                        ? "Total cuota del período:"
                                        : "Total período:"}{" "}
                                      <strong>
                                        $
                                        {fmtMoney(columnaReferenciaVenta.total)}
                                      </strong>
                                    </span>
                                  ) : null}
                                </>
                              ) : (
                                <span className="modal-venta-importe-v">—</span>
                              )}
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
