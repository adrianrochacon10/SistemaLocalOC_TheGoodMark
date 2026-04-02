// src/components/ventas/RegistroVentaModal.tsx
import React, { useState, useEffect, useMemo } from "react";
import { backendApi } from "../../../lib/backendApi";
import {
  RegistroVenta,
  Pantalla,
  AsignacionPantalla,
  Colaborador,
  Usuario,
  ItemVenta,
  Producto,
  AsignacionProductoExtra,
} from "../../../types";
import { calcularFechaFinDuracion, stringAFecha } from "../../../utils/formateoFecha";
import { parseIndiceGastoAdicionalDesdeNotas } from "../../../utils/utilidadVenta";
import {
  PREFIJO_LINEA_PRODUCTO,
  detallePantallaId,
  detallePrecioMensual,
  esLineaPrecioProductoEnDetalle,
} from "../../../utils/ordenApiMapper";
import { SelectField } from "../../ui/SelectField";
import { SelectorPantallas } from "./SelectorPantallas";
import { InputField } from "../../ui/InputField";
import { ResumenVenta } from "./ResumenVenta";
import { BotonAccion } from "../../ui/BotonAccion";

/** Costo tal como lo debe ver el usuario: si en BD quedó neto de consideración, se reconstruye el bruto. */
function costoBrutoParaFormulario(venta: RegistroVenta | null): number {
  if (!venta) return 0;
  const neto = Number(venta.costoVenta ?? venta.costos ?? 0) || 0;
  const cons =
    Number(venta.consideracionMonto ?? venta.pagoConsiderar ?? 0) || 0;
  if (cons > 0 && neto >= 0) {
    return Math.round((neto + cons) * 100) / 100;
  }
  return neto;
}

function inferirDuracionUnidad(venta: RegistroVenta | null): "meses" | "dias" {
  if (!venta?.fechaInicio || !venta?.fechaFin) return "meses";
  const fi = new Date(venta.fechaInicio);
  const ff = new Date(venta.fechaFin);
  if (Number.isNaN(fi.getTime()) || Number.isNaN(ff.getTime())) return "meses";
  const dias = Math.max(
    1,
    Math.round((ff.getTime() - fi.getTime()) / 86400000) + 1,
  );
  const mr = Math.max(1, Number(venta.mesesRenta) || 1);
  const tarifasDias = [1, 3, 7, 15];
  if (tarifasDias.includes(mr) && dias === mr) return "dias";
  return "meses";
}

function limpiarLineaGastoEnNotas(s: string): string {
  return String(s)
    .replace(/\(\s*Gasto adicional aplicado al mes \d+:\s*[\d.]+\s*\)/gi, "")
    .replace(/\(\s*Gasto adicional aplicado al día \d+:\s*[\d.]+\s*\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

interface RegistroVentaModalProps {
  pantallas: Pantalla[];
  productos: Producto[];
  asignaciones: AsignacionPantalla[];
  asignacionesProductos: AsignacionProductoExtra[];
  clientes: Colaborador[];
  usuarios: Usuario[];
  usuarioActual: Usuario;
  onRegistrarVenta: (venta: RegistroVenta) => Promise<void> | void;
  onActualizarVenta: (venta: RegistroVenta) => Promise<void> | void;
  onCerrar: () => void;
  ventaInicial: RegistroVenta | null;
}

export const RegistroVentaModal: React.FC<RegistroVentaModalProps> = ({
  pantallas,
  productos,
  asignaciones,
  asignacionesProductos,
  clientes,
  usuarios = [],
  usuarioActual,
  onRegistrarVenta,
  onActualizarVenta,
  onCerrar,
  ventaInicial,
}) => {
  const TARIFAS_DIAS: Record<number, number> = {
    1: 500,
    3: 1200,
    7: 4300,
    15: 6000,
  };
  // ── Estados ───────────────────────────────────────────────────────────
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>(
    ventaInicial?.colaboradorId ?? "",
  );
  const [itemsVenta, setItemsVenta] = useState<ItemVenta[]>(
    ventaInicial?.itemsVenta ?? [],
  );
  const [fechaInicio, setFechaInicio] = useState<string>(() => {
    if (!ventaInicial?.fechaInicio) return "";
    const fecha = new Date(ventaInicial.fechaInicio); // acepta Date o string
    return isNaN(fecha.getTime()) ? "" : fecha.toISOString().slice(0, 10);
  });
  const [mesesRenta, setMesesRenta] = useState<number>(
    ventaInicial?.mesesRenta ?? 1,
  );
  const [duracionUnidad, setDuracionUnidad] = useState<"meses" | "dias">(() =>
    inferirDuracionUnidad(ventaInicial),
  );
  const [vendidoA, setVendidoA] = useState<string>(
    ventaInicial?.vendidoA ?? "",
  );
  const [productosSeleccionados, setProductosSeleccionados] = useState<string[]>(
    ventaInicial?.productoIds ??
      (ventaInicial?.productoId ? [String(ventaInicial.productoId)] : []),
  );
  const [precioVentaProductoMap, setPrecioVentaProductoMap] = useState<
    Record<string, number>
  >(() => {
    if (!ventaInicial) return {};
    const ids = Array.isArray(ventaInicial.productoIds)
      ? ventaInicial.productoIds.map((x) => String(x))
      : ventaInicial.productoId
        ? [String(ventaInicial.productoId)]
        : [];
    if (ids.length === 0) return {};
    const detalle = ventaInicial.pantallasDetalle ?? [];
    const map: Record<string, number> = {};
    let desdeLineas = false;
    for (const id of ids) {
      const lineKey = `${PREFIJO_LINEA_PRODUCTO}${id}`;
      const row = detalle.find((p) => detallePantallaId(p) === lineKey);
      if (row) {
        map[String(id)] = detallePrecioMensual(row);
        desdeLineas = true;
      }
    }
    if (desdeLineas) return map;
    const totalProductoInicial = Number(ventaInicial.productoPrecioMensual ?? 0) || 0;
    const unit = totalProductoInicial / ids.length;
    for (const id of ids) map[String(id)] = unit;
    return map;
  });
  const [precioVentaPantallaMap, setPrecioVentaPantallaMap] = useState<
    Record<string, number>
  >(() => {
    if (!ventaInicial || !Array.isArray(ventaInicial.pantallasDetalle)) return {};
    const map: Record<string, number> = {};
    for (const p of ventaInicial.pantallasDetalle) {
      const id = String(p?.pantallaId ?? "");
      if (!id || id === "__producto_total__" || esLineaPrecioProductoEnDetalle(id)) {
        continue;
      }
      map[id] = Number(p?.precioMensual ?? 0) || 0;
    }
    return map;
  });
  const [porcentajeSocio, setPorcentajeSocio] = useState<number>(() => {
    if (
      ventaInicial?.porcentajeSocio != null &&
      Number.isFinite(Number(ventaInicial.porcentajeSocio))
    ) {
      return Number(ventaInicial.porcentajeSocio);
    }
    const c = clientes.find((x) => x.id === (ventaInicial?.colaboradorId ?? ""));
    if (c?.tipoComision === "porcentaje" && typeof c.porcentajeSocio === "number") {
      return c.porcentajeSocio;
    }
    return 30;
  });
  const [aplicarDescuento, setAplicarDescuento] = useState<boolean>(() =>
    ventaInicial?.id ? Number(ventaInicial.porcentajeSocio ?? 0) > 0 : false,
  );
  const [estadoVenta, setEstadoVenta] = useState<
    "Aceptado" | "Rechazado" | "Prospecto"
  >(ventaInicial?.estadoVenta ?? "Prospecto");
  const mesesIniciales = ventaInicial?.mesesRenta ?? 1;

  const [costos, setCostos] = useState<number>(() =>
    costoBrutoParaFormulario(ventaInicial),
  );
  const [precioMensualManual, setPrecioMensualManual] = useState<number | null>(null);
  const [precioTotalManual, setPrecioTotalManual] = useState<number | null>(null);
  const [comision, setComision] = useState<number>(
    ventaInicial?.comisionPorcentaje ??
      (ventaInicial && ventaInicial.precioGeneral > 0
        ? (((ventaInicial.comision ?? 0) / mesesIniciales) / ventaInicial.precioGeneral) *
          100
        : 0),
  );
  const [gastosAdicionales, setGastosAdicionales] = useState<number>(
    ventaInicial?.gastosAdicionales ?? 0,
  );
  const [mesGastoAdicional, setMesGastoAdicional] = useState<number>(() => {
    const p = parseIndiceGastoAdicionalDesdeNotas(ventaInicial?.notas);
    const contratoEnDias = inferirDuracionUnidad(ventaInicial) === "dias";
    if (p && p.enDias === contratoEnDias) return p.indice;
    return 1;
  });
  const [pagoConsiderar, setPagoConsiderar] = useState<number>(() =>
    Number(ventaInicial?.consideracionMonto ?? ventaInicial?.pagoConsiderar ?? 0) ||
      0,
  );
  const [notas, setNotas] = useState<string>(ventaInicial?.notas ?? "");
  const [fuenteOrigen, setFuenteOrigen] = useState<string>(
    ventaInicial?.fuenteOrigen ?? "",
  );
  const [identificadorVenta, setIdentificadorVenta] = useState<string>(
    ventaInicial?.identificadorVenta ?? "",
  );
  const [vendedorSeleccionadoId, setVendedorSeleccionadoId] = useState<string>(
    ventaInicial?.vendedorId ?? usuarioActual.id,
  );
  const [codigoEdicion, setCodigoEdicion] = useState<string>("");
  const [codigoValidado, setCodigoValidado] = useState(false);
  const [mostrarModalCodigo, setMostrarModalCodigo] = useState(false);
  const [mensajeCodigo, setMensajeCodigo] = useState("");
  const [errorCodigoModal, setErrorCodigoModal] = useState("");
  const [tiposPagoCatalogo, setTiposPagoCatalogo] = useState<
    Array<{ id: string; nombre: string }>
  >([]);

  const [error, setError] = useState<string>("");
  const [exito, setExito] = useState<string>("");

  useEffect(() => {
    setCodigoEdicion("");
    setCodigoValidado(false);
    setMostrarModalCodigo(false);
    setMensajeCodigo("");
    setErrorCodigoModal("");
  }, [ventaInicial?.id]);

  useEffect(() => {
    if (!ventaInicial?.id) return;
    setCostos(costoBrutoParaFormulario(ventaInicial));
  }, [ventaInicial?.id]);

  useEffect(() => {
    const cargarTiposPago = async () => {
      try {
        const data = (await backendApi.get("/api/tipo-pago")) as Array<{
          id: string;
          nombre: string;
        }>;
        if (Array.isArray(data)) {
          setTiposPagoCatalogo(
            data
              .filter((x) => x && x.id != null)
              .map((x) => ({ id: String(x.id), nombre: String(x.nombre ?? "").trim() }))
              .filter((x) => x.nombre),
          );
        }
      } catch {
        setTiposPagoCatalogo([]);
      }
    };
    void cargarTiposPago();
  }, []);

  useEffect(() => {
    if (!ventaInicial?.id) return;
    if (
      ventaInicial.porcentajeSocio != null &&
      Number.isFinite(Number(ventaInicial.porcentajeSocio))
    ) {
      setPorcentajeSocio(Number(ventaInicial.porcentajeSocio));
      return;
    }
    const c = clientes.find((x) => x.id === ventaInicial.colaboradorId);
    if (c?.tipoComision === "porcentaje" && typeof c.porcentajeSocio === "number") {
      setPorcentajeSocio(c.porcentajeSocio);
    }
  }, [ventaInicial?.id, ventaInicial?.porcentajeSocio, ventaInicial?.colaboradorId, clientes]);

  const toNumberSafe = (value: string, fallback = 0): number => {
    if (value === "") return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };
  const generarIdentificador = (): string => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let out = "";
    for (let i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  };

  // ── Derivados ─────────────────────────────────────────────────────────
  const pantallasSeleccionadas = itemsVenta.map((i) => i.pantallaId);
  /** Clave estable para detectar cambios de líneas (pantallas / productos) sin re-render espurio. */
  const lineasPrecioKey = `${[...pantallasSeleccionadas].sort().join("\0")}\0${[...productosSeleccionados].sort().join("\0")}`;

  const opcionesClientes = clientes
    .map((c) => ({
      value: c.id,
      label: c.nombre,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const opcionesVendedores = useMemo(
    () =>
      (usuarios ?? []).map((u) => ({
        value: u.id,
        label: u.nombre || u.email || "Sin nombre",
      })),
    [usuarios],
  );
  const nombreVendedorActual = useMemo(() => {
    const elegido = (usuarios ?? []).find(
      (u) => String(u.id) === String(vendedorSeleccionadoId || usuarioActual.id),
    );
    if (elegido) return elegido.nombre || elegido.email || "Sin nombre";
    if (!usuarioActual?.id) return "Sin usuario";
    return usuarioActual.nombre || "Sin nombre";
  }, [usuarios, usuarioActual, vendedorSeleccionadoId]);

  const productosDelCliente = useMemo(() => {
    const c = clientes.find((x) => x.id === clienteSeleccionado) as
      | (Colaborador & {
          producto_ids?: string[];
          productos?: Array<{ id: string; nombre: string }>;
        })
      | undefined;
    if (!c) return [];

    const directos = Array.isArray((c as any).productos)
      ? ((c as any).productos as Array<{
          id: string;
          nombre?: string;
          precio?: number;
          precio_unitario?: number;
          precio_por_mes?: number;
        }>)
          .filter((p) => p?.id)
          .map((p) => ({
            id: String(p.id),
            nombre: String(p.nombre ?? "").trim() || "Producto",
            precio:
              Number(p.precio ?? p.precio_unitario ?? p.precio_por_mes ?? 0) || 0,
          }))
      : [];

    let ids: string[] = [];
    if (Array.isArray(c.producto_ids) && c.producto_ids.length > 0) {
      ids = c.producto_ids.filter(Boolean) as string[];
    } else if (Array.isArray(c.productos) && c.productos.length > 0) {
      ids = c.productos.map((p) => p.id).filter(Boolean);
    } else if (c.productoId) {
      ids = [String(c.productoId)];
    }
    const porIds = [...new Set(ids)]
      .map((id) => productos.find((p) => String(p.id) === String(id)))
      .filter(Boolean)
      .map((p) => ({
        id: String((p as Producto).id),
        nombre: String((p as Producto).nombre ?? "").trim() || "Producto",
        precio: Number((p as Producto).precio ?? 0) || 0,
      }));

    const map = new Map<string, { id: string; nombre: string; precio: number }>();
    for (const p of [...directos, ...porIds]) map.set(p.id, p);
    return Array.from(map.values());
  }, [clienteSeleccionado, clientes, productos]);

  const precioProductoFallbackMap = useMemo(() => {
    const m = new Map<string, number>();
    if (!ventaInicial) return m;
    const ids = Array.isArray(ventaInicial.productoIds)
      ? ventaInicial.productoIds.map((x) => String(x))
      : ventaInicial.productoId
        ? [String(ventaInicial.productoId)]
        : [];
    if (ids.length === 0) return m;
    const total = Number(ventaInicial.productoPrecioMensual ?? 0) || 0;
    const unit = ids.length > 0 ? total / ids.length : 0;
    for (const id of ids) m.set(id, unit);
    return m;
  }, [ventaInicial]);

  const pantallasCatalogo = useMemo(() => {
    const c = clientes.find((x) => x.id === clienteSeleccionado) as
      | (Colaborador & {
          pantallas?: Array<{ id: string; nombre?: string; ubicacion?: string }>;
        })
      | undefined;

    const directas = Array.isArray(c?.pantallas)
      ? c!.pantallas
          .filter((p) => p?.id)
          .map((p) => ({
            id: String(p.id),
            nombre: String(p.nombre ?? "").trim() || "Pantalla",
            ubicacion: p.ubicacion,
            precio: Number((p as any).precio ?? 0) || 0,
            activa: true,
            fechaCreacion: new Date(),
          }))
      : [];

    const map = new Map<string, Pantalla>();
    for (const p of pantallas) map.set(String(p.id), p);
    for (const p of directas) {
      const id = String(p.id);
      const prev = map.get(id);
      // Prioriza precio que viene del colaborador para registro de venta.
      map.set(id, {
        ...(prev ?? ({} as Pantalla)),
        ...p,
        precio:
          Number((p as any).precio ?? prev?.precio ?? 0) || 0,
      } as Pantalla);
    }
    return Array.from(map.values());
  }, [clienteSeleccionado, clientes, pantallas]);

  /** Asignaciones en BD + pantallas del colaborador vía API (pantalla_ids / pantallas) */
  const pantallasDelCliente = useMemo((): AsignacionPantalla[] => {
    const fromAsignaciones = asignaciones.filter(
      (a) => a.clienteId === clienteSeleccionado && a.activa,
    );
    if (fromAsignaciones.length > 0) return fromAsignaciones;

    const c = clientes.find((x) => x.id === clienteSeleccionado) as
      | (Colaborador & {
          pantalla_ids?: string[];
          pantallas?: Array<{ id: string }>;
        })
      | undefined;
    if (!c) return [];

    let ids: string[] = [];
    if (Array.isArray(c.pantalla_ids) && c.pantalla_ids.length > 0) {
      ids = c.pantalla_ids.filter(Boolean) as string[];
    } else if (Array.isArray(c.pantallas) && c.pantallas.length > 0) {
      ids = c.pantallas.map((p) => p.id).filter(Boolean);
    }
    if (ids.length === 0) return [];

    const now = new Date();
    return ids.map((pantallaId, i) => ({
      id: `colab-${clienteSeleccionado}-${pantallaId}-${i}`,
      pantallaId,
      clienteId: clienteSeleccionado,
      activa: true,
      fechaAsignacion: now,
    }));
  }, [clienteSeleccionado, asignaciones, clientes]);

  const clienteActual = clientes.find((c) => c.id === clienteSeleccionado);
  const tipoPagoNombreCliente = useMemo(() => {
    const idTipo = String(
      (clienteActual as any)?.tipoPagoId ??
        clienteActual?.tipoPagoId ??
        (clienteActual as any)?.tipo_pago_id ??
        "",
    );
    const desdeCatalogo =
      idTipo &&
      tiposPagoCatalogo.find((t) => String(t.id) === idTipo)?.nombre;
    const nombre = String(
      desdeCatalogo ??
      (clienteActual as any)?.tipoPago?.nombre ??
        (clienteActual as any)?.tipo_pago?.nombre ??
        (clienteActual as any)?.tipoPagoNombre ??
        "",
    ).trim();
    return nombre || "Sin tipo de pago";
  }, [clienteActual, tiposPagoCatalogo]);
  const productosActuales = productosSeleccionados.map((id) => {
    const p = productosDelCliente.find((x) => String(x.id) === String(id));
    if (p) return p;
    return {
      id: String(id),
      nombre: "Producto",
      precio: Number(precioProductoFallbackMap.get(String(id)) ?? 0) || 0,
    };
  });
  const precioProductosSeleccionados = productosSeleccionados.reduce((sum, id) => {
    const sid = String(id);
    const desdeMapa = precioVentaProductoMap[sid];
    if (Number.isFinite(Number(desdeMapa))) return sum + (Number(desdeMapa) || 0);
    const prod = productosDelCliente.find((p) => String(p.id) === sid);
    if (prod) return sum + (Number(prod.precio ?? 0) || 0);
    return sum + (Number(precioProductoFallbackMap.get(sid) ?? 0) || 0);
  }, 0);
  const pantallasActuales = pantallasSeleccionadas
    .map((id) => pantallasCatalogo.find((p) => String(p.id) === String(id)))
    .filter(Boolean) as Pantalla[];
  const precioPantallasSeleccionadas = pantallasActuales.reduce(
    (sum, p) =>
      sum +
      (Number(precioVentaPantallaMap[String(p.id)] ?? p.precio ?? 0) || 0),
    0,
  );
  /** Precio mensual automático = Σ precios pantallas seleccionadas + Σ precios productos seleccionados. */
  const precioMensualSumaItems = Math.round(
    (Number(precioPantallasSeleccionadas || 0) +
      Number(precioProductosSeleccionados || 0)) *
      100,
  ) / 100;
  const precioMensualFinal =
    precioMensualManual != null
      ? Math.max(0, Number(precioMensualManual || 0))
      : precioMensualSumaItems;
  /** `??` no sustituye el 0: si el manual queda en 0 (p. ej. campo vacío), el auto dejaba de aplicarse. */
  const tarifaDiasCatalogo = Number(
    TARIFAS_DIAS[Number(mesesRenta)] ?? TARIFAS_DIAS[1] ?? 0,
  );
  const precioBasePorDuracion =
    duracionUnidad === "dias"
      ? precioTotalManual != null
        ? Number(precioTotalManual)
        : Number(
            precioMensualFinal > 0 ? precioMensualFinal : tarifaDiasCatalogo,
          )
      : precioTotalManual != null
        ? Number(precioTotalManual)
        : // Contrato por meses: total = precio mensual (ítems o manual) × meses
          Math.round(
            Number(precioMensualFinal) * Math.max(1, mesesRenta) * 100,
          ) / 100;
  // Gastos adicionales son informativos/aparte: NO se integran al total de venta.
  const precioTotalCalculado = Math.round(precioBasePorDuracion * 100) / 100;
  const tieneComisionPorcentaje = clienteActual?.tipoComision === "porcentaje";
  const tieneConsideracion =
    clienteActual?.tipoComision === "consideracion" ||
    clienteActual?.tipoComision === "precio_fijo" ||
    String(tipoPagoNombreCliente ?? "").toLowerCase().includes("consider");
  const fechaFin = calcularFechaFinDuracion(fechaInicio, mesesRenta, duracionUnidad);
  const totalVenta = precioTotalCalculado;
  const totalComision =
    Math.round((totalVenta * (Number(comision || 0) / 100)) * 100) / 100;
  const costosTotales = Number(costos || 0);
  const factorDuracion = duracionUnidad === "dias" ? 1 : Math.max(1, mesesRenta);
  /** Regla solicitada: porcentaje se calcula sobre precio de venta. */
  const basePorcentajeSocio = Math.max(0, totalVenta);
  const montoSocio = Math.round(
    ((Math.max(0, Number(basePorcentajeSocio || 0)) *
      Math.max(0, Number(porcentajeSocio || 0))) /
      100) *
      100,
  ) / 100;
  const consideracionTotal = Math.max(0, Number(pagoConsiderar || 0)) * factorDuracion;
  /** El % del socio es sobre precio de venta; consideración/precio fijo sí pueden ajustar costo. */
  const costoVentaFinal = Math.round(
    Math.max(
      0,
      costosTotales - (tieneConsideracion ? consideracionTotal : 0),
    ) * 100,
  ) / 100;

  /** Al cambiar pantallas o productos, volver al precio calculado desde ítems (no dejar bloqueado un manual viejo). */
  useEffect(() => {
    setPrecioTotalManual(null);
    setPrecioMensualManual(null);
  }, [lineasPrecioKey]);

  /** Si el usuario fijó el precio por mes, al cambiar la duración en meses se actualiza el total (mes × meses). */
  useEffect(() => {
    if (duracionUnidad !== "meses") return;
    if (precioMensualManual == null) return;
    const next =
      Math.round(precioMensualManual * Math.max(1, mesesRenta) * 100) / 100;
    setPrecioTotalManual(next);
  }, [mesesRenta, duracionUnidad, precioMensualManual]);

  // Al editar: si guardó porcentaje_socio > 0, el toggle «aplicar socio» queda activo (solo afecta utilidad / monto mostrado).
  useEffect(() => {
    if (!ventaInicial?.id) return;
    setAplicarDescuento(Number(ventaInicial.porcentajeSocio ?? 0) > 0);
  }, [ventaInicial?.id, ventaInicial?.porcentajeSocio]);

  useEffect(() => {
    if (!clienteSeleccionado) {
      setProductosSeleccionados([]);
      return;
    }
    setProductosSeleccionados((prev) =>
      prev.filter((pid) => productosDelCliente.some((p) => String(p.id) === String(pid))),
    );
  }, [clienteSeleccionado, productosDelCliente]);

  useEffect(() => {
    setPrecioVentaPantallaMap((prev) => {
      const next: Record<string, number> = { ...prev };
      for (const p of pantallasCatalogo) {
        const id = String(p.id);
        if (next[id] == null || Number.isNaN(Number(next[id]))) {
          next[id] = Number(p.precio ?? 0) || 0;
        }
      }
      return next;
    });
  }, [pantallasCatalogo]);

  useEffect(() => {
    setPrecioVentaProductoMap((prev) => {
      const next: Record<string, number> = { ...prev };
      for (const p of productosDelCliente) {
        const id = String(p.id);
        if (next[id] == null || Number.isNaN(Number(next[id]))) {
          next[id] = Number(p.precio ?? 0) || 0;
        }
      }
      return next;
    });
  }, [productosDelCliente]);

  const toggleProducto = (productoId: string) => {
    setProductosSeleccionados((prev) =>
      prev.includes(productoId)
        ? prev.filter((id) => id !== productoId)
        : [...prev, productoId],
    );
  };

  const setPrecioProductoVenta = (productoId: string, value: number) => {
    setPrecioVentaProductoMap((prev) => ({
      ...prev,
      [productoId]: value >= 0 ? value : 0,
    }));
  };

  const setPrecioPantallaVenta = (pantallaId: string, value: number) => {
    setPrecioVentaPantallaMap((prev) => ({
      ...prev,
      [pantallaId]: value >= 0 ? value : 0,
    }));
  };

  const togglePantalla = (pantallaId: string) => {
    const yaSeleccionada = itemsVenta.some((i) => i.pantallaId === pantallaId);
    setItemsVenta((prev) =>
      yaSeleccionada
        ? prev.filter((i) => i.pantallaId !== pantallaId)
        : [...prev, { pantallaId, sinDescuento: false }],
    );
  };

  const resetFormularioVenta = () => {
    setClienteSeleccionado("");
    setItemsVenta([]);
    setVendidoA("");
    setFechaInicio("");
    setMesesRenta(1);
    setDuracionUnidad("meses");
    setProductosSeleccionados([]);
    setPrecioVentaProductoMap({});
    setPrecioVentaPantallaMap({});
    setPrecioMensualManual(null);
    setPrecioTotalManual(null);
    setEstadoVenta("Prospecto");
    setAplicarDescuento(false);
    setPorcentajeSocio(30);
    setCostos(0);
    setError("");
    setExito("");
    setComision(0);
    setGastosAdicionales(0);
    setMesGastoAdicional(1);
    setPagoConsiderar(0);
    setNotas("");
    setCodigoEdicion("");
    setCodigoValidado(false);
    setMostrarModalCodigo(false);
    setMensajeCodigo("");
    setErrorCodigoModal("");
    setFuenteOrigen("");
    setIdentificadorVenta("");
    setVendedorSeleccionadoId(usuarioActual.id);
  };

  // ── Registrar ─────────────────────────────────────────────────────────
  const handleRegistrarVenta = async () => {
    setError("");
    setExito("");
    if (!clienteSeleccionado) {
      setError("Selecciona un cliente");
      return;
    }
    if (itemsVenta.length === 0 && productosSeleccionados.length === 0) {
      setError("Selecciona al menos una pantalla o un producto");
      return;
    }
    if (!vendidoA.trim()) {
      setError("Especifica a quién se vendió/rentó");
      return;
    }
    if (
      identificadorVenta.trim() &&
      !/^[A-Za-z0-9]{4}$/.test(identificadorVenta.trim())
    ) {
      setError("El identificador debe tener 4 letras o números");
      return;
    }
    if (identificadorVenta.trim()) {
      try {
        const all = (await backendApi.get("/api/ventas")) as any[];
        const dup = (Array.isArray(all) ? all : []).some((r: any) => {
          const same =
            String(r?.identificador_venta ?? r?.identificadorVenta ?? "")
              .trim()
              .toUpperCase() === identificadorVenta.trim().toUpperCase();
          if (!same) return false;
          if (!ventaInicial?.id) return true;
          return String(r?.id ?? "") !== String(ventaInicial.id);
        });
        if (dup) {
          setError("Ese identificador ya existe. Usa uno diferente.");
          return;
        }
      } catch {
        // Si falla la validación previa, el backend mantiene la validación final.
      }
    }
    if (!fechaInicio) {
      setError("Selecciona una fecha de inicio");
      return;
    }
    if (mesesRenta < 1) {
      setError(
        `La duración debe ser al menos 1 ${duracionUnidad === "dias" ? "día" : "mes"}`,
      );
      return;
    }
    if (
      duracionUnidad === "dias" &&
      ![1, 3, 7, 15].includes(Number(mesesRenta))
    ) {
      setError("Para días, solo se permite: 1, 3, 7 o 15");
      return;
    }
    if (duracionUnidad === "dias" && productosSeleccionados.length > 0) {
      setError("Para duración en días solo se permite venta con pantallas (sin productos)");
      return;
    }
    if (precioMensualFinal < 0) {
      setError("El costo de la venta no puede ser negativo");
      return;
    }
    if (!Number.isFinite(costosTotales) || costosTotales <= 0) {
      setError("Sin costo de la venta no se puede registrar");
      return;
    }
    if (ventaInicial && usuarioActual.rol === "vendedor" && !codigoValidado) {
      setMensajeCodigo(
        "Para guardar los cambios, solicita e ingresa tu código de autorización.",
      );
      setErrorCodigoModal("");
      setMostrarModalCodigo(true);
      return;
    }

    const nuevaVenta: RegistroVenta = {
      id: ventaInicial?.id ?? "v" + Date.now(),
      pantallasIds: itemsVenta.map((i) => i.pantallaId),
      itemsVenta,
      colaboradorId: clienteSeleccionado,
      productoId: productosSeleccionados[0] || undefined,
      productoIds: productosSeleccionados,
      productoNombre:
        productosActuales.map((p) => p.nombre).join(", ").trim() || undefined,
      productoPrecioMensual: precioProductosSeleccionados || 0,
      precioPantallasMensual: Number(precioPantallasSeleccionadas || 0),
      pantallasDetalle: [
        ...pantallasActuales.map((p) => ({
          pantallaId: String(p.id),
          nombre: p.nombre,
          precioMensual:
            Number(precioVentaPantallaMap[String(p.id)] ?? p.precio ?? 0) || 0,
        })),
        ...productosSeleccionados.map((id) => {
          const sid = String(id);
          const prod = productosActuales.find((x) => String(x.id) === sid);
          const nombre = String(prod?.nombre ?? "").trim() || "Producto";
          let precio = Number(precioVentaProductoMap[sid]);
          if (!Number.isFinite(precio)) {
            const pcat = productosDelCliente.find((p) => String(p.id) === sid);
            precio =
              Number(pcat?.precio ?? precioProductoFallbackMap.get(sid) ?? 0) || 0;
          }
          return {
            pantallaId: `${PREFIJO_LINEA_PRODUCTO}${sid}`,
            nombre,
            precioMensual: precio,
          };
        }),
        // Meta interna para conservar precio de producto de la venta (no catálogo).
        {
          pantallaId: "__producto_total__",
          nombre: "META_PRODUCTO",
          precioMensual: Number(precioProductosSeleccionados || 0),
        },
      ],
      fuenteOrigen: fuenteOrigen.trim() || undefined,
      identificadorVenta: identificadorVenta.trim() || undefined,
      vendidoA: vendidoA.trim(),
      precioGeneral:
        duracionUnidad === "dias"
          ? Number(precioTotalCalculado || 0)
          : precioMensualFinal,
      cantidad: 1,
      precioTotal: totalVenta,
      // La comisión/porcentaje del socio se reporta aparte; no descuenta el importe de venta.
      importeTotal: totalVenta,
      fechaRegistro: ventaInicial?.fechaRegistro ?? new Date(),
      fechaInicio: stringAFecha(fechaInicio),
      fechaFin: stringAFecha(fechaFin),
      mesesRenta,
      activo: true,
      usuarioRegistroId: usuarioActual.id,
      estadoVenta,
      vendedorId:
        usuarioActual.rol === "admin"
          ? vendedorSeleccionadoId || usuarioActual.id
          : usuarioActual.id,
      // Bruto capturado: el backend aplica el % del socio sobre precio_total (si porcentaje_socio > 0).
      costos: costosTotales,
      costoVenta: costosTotales,
      comision: totalComision,
      comisionPorcentaje: Number(comision || 0),
      porcentajeSocio:
        tieneComisionPorcentaje && aplicarDescuento
          ? Number(porcentajeSocio || 0)
          : 0,
      gastosAdicionales: Number(gastosAdicionales || 0),
      ...(Number(gastosAdicionales || 0) > 0
        ? {
            gastoAdicionalMesIndice: mesGastoAdicional,
            gastoAdicionalEnDias: duracionUnidad === "dias",
          }
        : {
            gastoAdicionalMesIndice: undefined,
            gastoAdicionalEnDias: undefined,
          }),
      pagoConsiderar: tieneConsideracion
        ? 0
        : undefined,
      consideracionMonto: 0,
      notas: (() => {
        const base = limpiarLineaGastoEnNotas(notas);
        if (Number(gastosAdicionales || 0) <= 0) return base || undefined;
        const frag = `(${
          duracionUnidad === "dias"
            ? `Gasto adicional aplicado al día ${mesGastoAdicional}`
            : `Gasto adicional aplicado al mes ${mesGastoAdicional}`
        }: ${Number(gastosAdicionales || 0).toFixed(2)})`;
        return [base, frag].filter(Boolean).join(" ").trim() || undefined;
      })(),
      codigoEdicion: codigoEdicion.trim() || undefined,
    };
    try {
      if (ventaInicial) {
        await onActualizarVenta(nuevaVenta);
        setExito("Venta actualizada correctamente");
      } else {
        await onRegistrarVenta(nuevaVenta);
        setExito("Venta registrada correctamente");
      }
      resetFormularioVenta();
      setTimeout(() => setExito(""), 2000);
      onCerrar();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudieron guardar los cambios de la venta",
      );
    }
  };

  const solicitarCodigoVenta = async () => {
    if (!ventaInicial?.id) return;
    setErrorCodigoModal("");
    try {
      const data = await backendApi.post<{
        mensaje?: string;
      }>("/api/codigos/solicitar", {
        entidad: "orden",
        entidad_id: ventaInicial.id,
      });
      setMensajeCodigo(data?.mensaje ?? "Código solicitado. Revisa tu correo.");
    } catch (e) {
      setErrorCodigoModal(
        e instanceof Error ? e.message : "No se pudo solicitar el código",
      );
    }
  };

  const validarCodigoYGuardarVenta = () => {
    if (!codigoEdicion.trim()) {
      setErrorCodigoModal("Ingresa un código");
      return;
    }
    setErrorCodigoModal("");
    setCodigoValidado(true);
    setMostrarModalCodigo(false);
    void handleRegistrarVenta();
  };

  const cerrarModalCodigoVenta = () => {
    setMostrarModalCodigo(false);
    setErrorCodigoModal("");
  };

  // ── JSX ───────────────────────────────────────────────────────────────
  return (
    <>
    <div className="modal-overlay">
      <div className="modal-contenido">
        <h3
          style={{
            margin: "0 0 20px 0",
            paddingBottom: "12px",
            borderBottom: "2px solid #e2e8f0",
          }}
        >
          Registrar Venta
        </h3>

        <div className="formulario-section">
          <SelectField
            label="Colaborador *"
            value={clienteSeleccionado}
            onChange={(v: any) => {
              setClienteSeleccionado(v);
              setItemsVenta([]);
              const colaborador = clientes.find((c) => c.id === v);
              setAplicarDescuento(colaborador?.tipoComision === "porcentaje");
              if (
                colaborador?.tipoComision === "porcentaje" &&
                typeof colaborador.porcentajeSocio === "number"
              ) {
                setPorcentajeSocio(colaborador.porcentajeSocio);
              }
            }}
            placeholder="-- Seleccionar colaborador --"
            className="select-lg"
            options={opcionesClientes}
          />

          {clienteSeleccionado && (
            <>
              {pantallasDelCliente.length > 0 ? (
                <SelectorPantallas
                  pantallasDelCliente={pantallasDelCliente}
                  pantallasSeleccionadas={pantallasSeleccionadas}
                  pantallas={pantallasCatalogo}
                  onToggle={togglePantalla}
                  precioPantallaMap={precioVentaPantallaMap}
                  onCambiarPrecioPantalla={setPrecioPantallaVenta}
                />
              ) : null}
              <div className="form-group">
                <label className="label-pantallas">
                  Productos seleccionados:{" "}
                  <span className="badge-cantidad">{productosSeleccionados.length}</span>
                </label>
                <div className="pantallas-checkbox-group">
                  {productosDelCliente.map((p) => {
                    const selected = productosSeleccionados.includes(String(p.id));
                    return (
                      <label
                        key={p.id}
                        className={`checkbox-item ${selected ? "selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={duracionUnidad === "dias"}
                          onChange={() => toggleProducto(String(p.id))}
                        />
                        <span className="checkbox-visual"></span>
                        <span className="checkbox-label">
                          <span className="pantalla-nombre">{p.nombre}</span>
                          {!ventaInicial ? (
                            <span className="pantalla-mini-ubicacion">
                              Catálogo: ${Number(p.precio ?? 0).toLocaleString("es-MX", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          ) : null}
                          {selected ? (
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              disabled={duracionUnidad === "dias"}
                              value={Number(precioVentaProductoMap[String(p.id)] ?? p.precio ?? 0)}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                setPrecioProductoVenta(
                                  String(p.id),
                                  toNumberSafe(e.target.value, Number(p.precio ?? 0) || 0),
                                )
                              }
                              className="form-input"
                              style={{ marginTop: 6 }}
                              placeholder="Precio de venta"
                            />
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <InputField
                label="Vendido a (Nombre del receptor) *"
                value={vendidoA}
                onChange={setVendidoA}
                placeholder="Ej: ABC Company, Juan Pérez, Empresa XYZ"
              />
              {null}
              {usuarioActual.rol === "admin" ? (
                <SelectField
                  label="Vendedor"
                  value={vendedorSeleccionadoId}
                  onChange={(v: any) =>
                    setVendedorSeleccionadoId(String(v ?? usuarioActual.id))
                  }
                  className="select-lg"
                  options={opcionesVendedores}
                />
              ) : (
                <InputField
                  label="Vendedor"
                  value={nombreVendedorActual}
                  onChange={() => {}}
                  readOnly
                />
              )}
              <SelectField
                label="Fuente / Origen"
                value={fuenteOrigen}
                onChange={(v: any) => setFuenteOrigen(String(v ?? ""))}
                className="select-lg"
                options={[
                  { value: "", label: "-- Seleccionar --" },
                  { value: "Redes Sociales", label: "Redes Sociales" },
                  { value: "Propia", label: "Propia" },
                  { value: "BNI", label: "BNI" },
                  { value: "Referencia", label: "Referencia" },
                  { value: "Otro", label: "Otro" },
                ]}
              />
              <InputField
                label="Tipo de pago"
                value={tipoPagoNombreCliente}
                onChange={() => {}}
                readOnly
              />
              <InputField
                label="Identificador"
                value={identificadorVenta}
                onChange={(v: any) =>
                  setIdentificadorVenta(
                    String(v ?? "")
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "")
                      .slice(0, 4),
                  )
                }
                placeholder="Ej: A1B2"
              />
              <div className="hint-text" style={{ marginTop: "-8px" }}>
                Sugerencias:{" "}
                {[generarIdentificador(), generarIdentificador(), generarIdentificador()].map(
                  (s) => (
                    <button
                      key={s}
                      type="button"
                      className="btn btn-sm btn-outline"
                      style={{ marginRight: 8 }}
                      onClick={() => setIdentificadorVenta(s)}
                    >
                      {s}
                    </button>
                  ),
                )}
              </div>
              <SelectField
                label="Estado de la venta *"
                value={estadoVenta}
                onChange={(v: any) =>
                  setEstadoVenta(v as "Aceptado" | "Rechazado" | "Prospecto")
                }
                className="select-lg"
                options={[
                  { value: "Prospecto", label: "Prospecto" },
                  { value: "Aceptado", label: "Aceptado" },
                  { value: "Rechazado", label: "Rechazado" },
                ]}
              />
              <div className="form-row">
                <InputField
                  label="Fecha de Inicio *"
                  value={fechaInicio}
                  onChange={setFechaInicio}
                  type="date"
                />
                {duracionUnidad === "dias" ? (
                  <SelectField
                    label="Duración (días) *"
                    value={String(mesesRenta)}
                    onChange={(v: any) => setMesesRenta(Number(v) || 1)}
                    className="select-lg"
                    options={[
                      { value: "1", label: "1 día — $500" },
                      { value: "3", label: "3 días — $1,200" },
                      { value: "7", label: "7 días — $4,300" },
                      { value: "15", label: "15 días — $6,000" },
                    ]}
                  />
                ) : (
                  <InputField
                    label="Duración (meses) *"
                    value={mesesRenta || ""}
                    onChange={(v: any) =>
                      setMesesRenta(Math.max(0, parseInt(v, 10) || 0))
                    }
                    type="number"
                    min={1}
                  />
                )}
              </div>
              <div className="form-group">
                <label>Unidad de duración</label>
                <select
                  value={duracionUnidad}
                  onChange={(e) => {
                    const next = e.target.value as "meses" | "dias";
                    setDuracionUnidad(next);
                    if (next === "dias") setMesesRenta(1);
                  }}
                  className="form-select"
                >
                  <option value="meses">Meses</option>
                  <option value="dias">Días</option>
                </select>
              </div>
              <InputField
                label="Precio de la venta (total)"
                value={precioTotalCalculado}
                onChange={(v: any) => {
                  if (String(v).trim() === "") {
                    setPrecioTotalManual(null);
                    setPrecioMensualManual(null);
                    return;
                  }
                  const n = Math.max(0, toNumberSafe(v, Number(precioTotalCalculado || 0)));
                  setPrecioTotalManual(n);
                  if (duracionUnidad === "dias") {
                    setPrecioMensualManual(n);
                  } else {
                    setPrecioMensualManual(
                      Math.round((n / Math.max(1, mesesRenta)) * 100) / 100,
                    );
                  }
                }}
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
              />
              <InputField
                label={
                  duracionUnidad === "dias"
                    ? "Tarifa por duración (días)"
                    : "Precio de la venta (por mes)"
                }
                value={
                  duracionUnidad === "dias"
                    ? Number(precioTotalCalculado || 0)
                    : precioMensualFinal
                }
                onChange={(v: any) => {
                  if (String(v).trim() === "") {
                    setPrecioMensualManual(null);
                    setPrecioTotalManual(null);
                    return;
                  }
                  const n = Math.max(0, toNumberSafe(v, Number(precioMensualFinal || 0)));
                  setPrecioMensualManual(n);
                  if (duracionUnidad === "dias") {
                    setPrecioTotalManual(n);
                  } else {
                    setPrecioTotalManual(
                      Math.round(n * Math.max(1, mesesRenta) * 100) / 100,
                    );
                  }
                }}
                type="number"
                min={0}
                step={0.01}
              />
              {!tieneConsideracion ? (
                <InputField
                  label="Costo de la venta"
                  value={costos}
                  onChange={(v: any) => setCostos((prev) => toNumberSafe(v, prev))}
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                />
              ) : null}
              {tieneConsideracion ? (
                <div className="form-row">
                  <InputField
                    label="Costo de la venta (total)"
                    value={costos}
                    onChange={(v: any) => {
                      const n = Math.max(0, toNumberSafe(v, Number(costos || 0)));
                      setCostos(n);
                    }}
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                  />
                  <InputField
                    label={
                      duracionUnidad === "dias"
                        ? "Costo por duración (días)"
                        : "Costo de la venta (por mes)"
                    }
                    value={
                      duracionUnidad === "dias"
                        ? Number(costos || 0)
                        : Math.round((Number(costos || 0) / Math.max(1, mesesRenta)) * 100) / 100
                    }
                    onChange={(v: any) => {
                      const n = Math.max(
                        0,
                        toNumberSafe(
                          v,
                          duracionUnidad === "dias"
                            ? Number(costos || 0)
                            : Number(costos || 0) / Math.max(1, mesesRenta),
                        ),
                      );
                      if (duracionUnidad === "dias") {
                        setCostos(n);
                      } else {
                        setCostos(Math.round(n * Math.max(1, mesesRenta) * 100) / 100);
                      }
                    }}
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                  />
                </div>
              ) : null}
              {tieneConsideracion && consideracionTotal > 0 && (
                <div className="hint-text">
                  Costo final (descontando consideración):{" "}
                  {costoVentaFinal.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              )}
              <div className="form-row">
                <InputField
                  label="Gastos adicionales"
                  value={gastosAdicionales}
                  onChange={(v: any) =>
                    setGastosAdicionales((prev) => toNumberSafe(v, prev))
                  }
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                />
                <SelectField
                  label={duracionUnidad === "dias" ? "Día del gasto" : "Mes del gasto"}
                  value={String(mesGastoAdicional)}
                  onChange={(v: any) => setMesGastoAdicional(Number(v) || 1)}
                  className="select-lg"
                  options={Array.from(
                    { length: Math.max(1, Number(mesesRenta || 1)) },
                    (_, i) => ({
                      value: String(i + 1),
                      label:
                        duracionUnidad === "dias"
                          ? `Día ${i + 1}`
                          : `Mes ${i + 1}`,
                    }),
                  )}
                />
              </div>

              {/* ── COMISIÓN (venta) ≠ porcentaje del socio ── */}
              <InputField
                label="Comisión (%)"
                value={comision || ""}
                onChange={(v: any) =>
                  setComision((prev) => toNumberSafe(v, prev))
                }
                type="number"
                min={0}
                step={0.01}
                placeholder="%"
              />
              {comision > 0 && (
                <div className="hint-text">
                  Comisión total automática: {totalComision.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
              {tieneComisionPorcentaje && (
                <InputField
                  label="Porcentaje del socio (%)"
                  value={porcentajeSocio || ""}
                  onChange={(v: any) =>
                    setPorcentajeSocio((prev) => toNumberSafe(v, prev))
                  }
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="%"
                />
              )}
              {tieneComisionPorcentaje && (
                <div className="hint-text">
                  Monto del socio ({Number(porcentajeSocio || 0)}% sobre precio total de la venta):{" "}
                  {montoSocio.toLocaleString("es-MX", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  {duracionUnidad === "meses" &&
                  mesesRenta > 1 &&
                  aplicarDescuento &&
                  totalVenta > 0 ? (
                    <>
                      {" "}
                      · Precio por mes con porcentaje:{" "}
                      {(
                        Math.max(0, totalVenta - montoSocio) / Math.max(1, mesesRenta)
                      ).toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </>
                  ) : null}
                </div>
              )}
              <div className="form-group">
                <label>Notas</label>
                <input
                  type="text"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas internas (opcional)"
                  className="form-input"
                  maxLength={300}
                />
              </div>
              {tieneComisionPorcentaje && (
                <div className="registro-venta-porc-toolbar">
                  <button
                    type="button"
                    className={`btn btn-sm registro-venta-porc-btn ${aplicarDescuento ? "btn-primary" : "btn-outline"}`}
                    onClick={() => setAplicarDescuento((prev) => !prev)}
                  >
                    {aplicarDescuento
                      ? `Quitar porcentaje del socio en esta venta (${Number(porcentajeSocio || 0)}%)`
                      : `Aplicar porcentaje del socio en esta venta (${Number(porcentajeSocio || 0)}%)`}
                  </button>
                </div>
              )}
              {fechaInicio &&
                mesesRenta > 0 &&
                (pantallasSeleccionadas.length > 0 || productosSeleccionados.length > 0) && (
                  <ResumenVenta
                    pantallasActuales={pantallasActuales}
                    estadoVenta={estadoVenta}
                    pantallasSeleccionadas={pantallasSeleccionadas}
                    vendidoA={vendidoA}
                    fechaInicio={fechaInicio}
                    fechaFin={fechaFin}
                    mesesRenta={mesesRenta}
                    duracionUnidad={duracionUnidad}
                    precioGeneral={
                      duracionUnidad === "dias"
                        ? precioTotalCalculado
                        : precioMensualFinal
                    }
                    porcentajeSocio={porcentajeSocio}
                    montoSocio={montoSocio}
                    aplicarDescuento={
                      tieneComisionPorcentaje && aplicarDescuento
                    }
                    costos={costoVentaFinal}
                    comisionPorcentaje={comision}
                    gastosAdicionales={gastosAdicionales}
                    precioPantallas={precioPantallasSeleccionadas}
                    productoNombre={productosActuales.map((p) => p.nombre).join(", ")}
                    nombresProductos={productosActuales.map((p) => p.nombre)}
                    precioProductos={precioProductosSeleccionados}
                    pagoConsiderar={pagoConsiderar}
                    tipoComision={clienteActual?.tipoComision ?? ""}
                  />
                )}
            </>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}
        {exito && <div className="success-message">{exito}</div>}

        <BotonAccion
          onClick={() => void handleRegistrarVenta()}
          variante="primario"
          fullWidth
        >
          {ventaInicial ? "Guardar cambios" : "Registrar Venta"}
        </BotonAccion>

        <BotonAccion
          onClick={() => {
            resetFormularioVenta();
            onCerrar();
          }}
          variante="secundario"
          fullWidth
        >
          Cancelar
        </BotonAccion>
      </div>
    </div>

    {mostrarModalCodigo && (
      <div
        className="modal-overlay"
        style={{ zIndex: 11000 }}
        onClick={cerrarModalCodigoVenta}
      >
        <div className="modal-contenido" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Código requerido para editar</h3>
            <button
              type="button"
              className="modal-close"
              onClick={cerrarModalCodigoVenta}
            >
              ✕
            </button>
          </div>
          <div className="modal-body">
            <p>{mensajeCodigo}</p>
            <div className="form-group">
              <label>Código de edición</label>
              <input
                type="text"
                value={codigoEdicion}
                onChange={(e) => setCodigoEdicion(e.target.value)}
                placeholder="Ingresa el código"
              />
            </div>
            {errorCodigoModal && (
              <div className="error-message">{errorCodigoModal}</div>
            )}
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => void solicitarCodigoVenta()}
            >
              Solicitar código
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={validarCodigoYGuardarVenta}
            >
              Validar código
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};
