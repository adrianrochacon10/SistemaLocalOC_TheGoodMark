// src/components/ventas/components/RegistroVentaModal.tsx
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
import {
  calcularFechaFinDuracion,
  fechaParaInputDateLocal,
  stringAFecha,
} from "../../../utils/formateoFecha";
import { parseIndiceGastoAdicionalDesdeNotas } from "../../../utils/utilidadVenta";
import { PREFIJO_LINEA_PRODUCTO } from "../../../utils/ordenApiMapper";
import { SelectField } from "../../ui/SelectField";
import { SelectorPantallas } from "./SelectorPantallas";
import { InputField } from "../../ui/InputField";
import { ResumenVenta } from "./ResumenVenta";
import { BotonAccion } from "../../ui/BotonAccion";
import { inferirDuracionUnidadVenta } from "../../../utils/duracionVenta";

/** Costo total bruto en BD (o reconstruido si quedó neto de consideración). */
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
  if (!venta) return "meses";
  return inferirDuracionUnidadVenta(venta as any);
}

/** Costo por mes en el formulario: el total en BD se reparte entre la duración en meses. */
function costoPorMesParaFormulario(venta: RegistroVenta | null): number {
  if (!venta) return 0;
  const brutoTotal = costoBrutoParaFormulario(venta);
  const u = inferirDuracionUnidad(venta);
  const mr = Math.max(1, Number(venta.mesesRenta) || 1);
  if (u === "dias") return Math.round(brutoTotal * 100) / 100;
  return Math.round((brutoTotal / mr) * 100) / 100;
}

function limpiarLineaGastoEnNotas(s: string): string {
  return String(s)
    .replace(/\(\s*Gasto adicional aplicado al mes \d+:\s*[\d.]+\s*\)/gi, "")
    .replace(/\(\s*Gasto adicional aplicado al día \d+:\s*[\d.]+\s*\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function limpiarUnidadEnNotas(s: string): string {
  return String(s).replace(/\[\s*UNIDAD\s*:\s*(DIAS|MESES)\s*\]/gi, "").trim();
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
  permitePrecioPorDia?: boolean;
  tarifasDiasConfig?: Array<{ dias: number; precio: number }>;
}

export const RegistroVentaModal: React.FC<RegistroVentaModalProps> = ({
  pantallas,
  productos,
  asignaciones,
  asignacionesProductos: _asignacionesProductos,
  clientes,
  usuarios = [],
  usuarioActual,
  onRegistrarVenta,
  onActualizarVenta,
  onCerrar,
  ventaInicial,
  permitePrecioPorDia = false,
  tarifasDiasConfig = [],
}) => {
  // ── Estados ───────────────────────────────────────────────────────────
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>(
    ventaInicial?.colaboradorId ?? "",
  );
  const [itemsVenta, setItemsVenta] = useState<ItemVenta[]>(
    ventaInicial?.itemsVenta ?? [],
  );
  const [fechaInicio, setFechaInicio] = useState<string>(() =>
    ventaInicial?.fechaInicio
      ? fechaParaInputDateLocal(ventaInicial.fechaInicio)
      : "",
  );
  const [mesesRenta, setMesesRenta] = useState<number>(
    ventaInicial?.mesesRenta ?? 1,
  );
  const [duracionUnidad, setDuracionUnidad] = useState<"meses" | "dias">(() =>
    permitePrecioPorDia ? inferirDuracionUnidad(ventaInicial) : "meses",
  );
  type FilaClient = {
    id: string;
    nombre: string;
    telefono?: string | null;
    correo?: string | null;
  };
  const [catalogoClientesComprador, setCatalogoClientesComprador] = useState<FilaClient[]>(
    [],
  );
  const [clienteCompradorId, setClienteCompradorId] = useState<string>(() =>
    ventaInicial?.clientId ? String(ventaInicial.clientId) : "",
  );

  useEffect(() => {
    let cancel = false;
    void (async () => {
      try {
        const rows = (await backendApi.get("/api/clients")) as FilaClient[];
        if (!cancel && Array.isArray(rows)) setCatalogoClientesComprador(rows);
      } catch {
        if (!cancel) setCatalogoClientesComprador([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (!ventaInicial) return;
    if (ventaInicial.clientId) {
      setClienteCompradorId(String(ventaInicial.clientId));
      return;
    }
    const nombreV = String(ventaInicial.vendidoA ?? "").trim();
    if (nombreV && catalogoClientesComprador.length > 0) {
      const m = catalogoClientesComprador.find(
        (c) => String(c.nombre).trim().toLowerCase() === nombreV.toLowerCase(),
      );
      setClienteCompradorId(m?.id ?? "");
    } else {
      setClienteCompradorId("");
    }
  }, [
    ventaInicial?.id,
    ventaInicial?.clientId,
    ventaInicial?.vendidoA,
    catalogoClientesComprador,
  ]);

  const nombreClienteComprador = useMemo(() => {
    const c = catalogoClientesComprador.find(
      (x) => String(x.id) === String(clienteCompradorId),
    );
    return c ? String(c.nombre).trim() : "";
  }, [catalogoClientesComprador, clienteCompradorId]);

  const opcionesClientesComprador = useMemo(
    () =>
      catalogoClientesComprador.map((c) => ({
        value: c.id,
        label: [c.nombre, c.telefono?.trim() || null, c.correo?.trim() || null]
          .filter(Boolean)
          .join(" · "),
      })),
    [catalogoClientesComprador],
  );
  const [productosSeleccionados, setProductosSeleccionados] = useState<string[]>(
    ventaInicial?.productoIds ??
      (ventaInicial?.productoId ? [String(ventaInicial.productoId)] : []),
  );
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
    costoPorMesParaFormulario(ventaInicial),
  );
  const [precioMensualManual, setPrecioMensualManual] = useState<number | null>(() => {
    if (!ventaInicial) return null;
    if (inferirDuracionUnidad(ventaInicial) === "dias") return null;
    return Number(ventaInicial.precioGeneral) || 0;
  });
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
    setCostos(costoPorMesParaFormulario(ventaInicial));
  }, [ventaInicial?.id]);

  useEffect(() => {
    if (permitePrecioPorDia) return;
    if (duracionUnidad === "dias") {
      setDuracionUnidad("meses");
    }
  }, [permitePrecioPorDia, duracionUnidad]);

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
      precio: 0,
    };
  });
  const pantallasActuales = pantallasSeleccionadas
    .map((id) => pantallasCatalogo.find((p) => String(p.id) === String(id)))
    .filter(Boolean) as Pantalla[];
  const tarifasDias = useMemo(() => {
    const src =
      Array.isArray(tarifasDiasConfig) && tarifasDiasConfig.length > 0
        ? tarifasDiasConfig
        : [
            { dias: 1, precio: 0 },
            { dias: 3, precio: 0 },
            { dias: 7, precio: 0 },
            { dias: 15, precio: 0 },
          ];
    return src
      .map((t) => ({
        dias: Math.max(1, Number(t?.dias) || 1),
        precio: Math.max(0, Number(t?.precio) || 0),
      }))
      .filter((t) => Number.isFinite(t.dias) && Number.isFinite(t.precio))
      .sort((a, b) => a.dias - b.dias);
  }, [tarifasDiasConfig]);
  const precioTarifaDiasTotal =
    duracionUnidad === "dias"
      ? (tarifasDias.find((t) => t.dias === Number(mesesRenta))?.precio ?? 0)
      : 0;
  const precioMensualFinal =
    precioMensualManual != null
      ? Math.max(0, Number(precioMensualManual || 0))
      : 0;
  const precioPorDiaFinal =
    duracionUnidad === "dias"
      ? Math.round(
          ((Math.max(0, Number(precioTarifaDiasTotal || 0)) /
            Math.max(1, Number(mesesRenta || 1))) *
            100),
        ) / 100
      : 0;
  /** Meses: total = precio de venta por mes × duración (se actualiza al cambiar meses o el importe mensual). */
  const precioBasePorDuracion =
    duracionUnidad === "dias"
      ? Math.round(Number(precioTarifaDiasTotal || 0) * 100) / 100
      : Math.round(
          Number(precioMensualFinal) * Math.max(1, mesesRenta) * 100,
        ) / 100;
  /** Suma de precios de catálogo (informativo; no entra al precio de la venta). */
  const precioCatalogoPantallasSeleccionadas = pantallasActuales.reduce(
    (s, p) => s + (Number(p.precio) || 0),
    0,
  );
  const precioCatalogoProductosSeleccionados = productosSeleccionados.reduce(
    (s, pid) => {
      const prod = productosDelCliente.find((x) => String(x.id) === String(pid));
      return s + (Number(prod?.precio) || 0);
    },
    0,
  );
  // Gastos adicionales son informativos/aparte: NO se integran al total de venta.
  const precioTotalCalculado = Math.round(precioBasePorDuracion * 100) / 100;
  const tieneComisionPorcentaje = clienteActual?.tipoComision === "porcentaje";
  /** Colaborador con comisión por %: no aplica costo de venta en el formulario ni en BD. */
  const esColaboradorPorcentaje =
    clienteActual?.tipoComision === "porcentaje" ||
    String(tipoPagoNombreCliente ?? "").toLowerCase().includes("porcentaje");
  const tieneConsideracion =
    clienteActual?.tipoComision === "consideracion" ||
    clienteActual?.tipoComision === "precio_fijo" ||
    String(tipoPagoNombreCliente ?? "").toLowerCase().includes("consider");
  const fechaFin = calcularFechaFinDuracion(fechaInicio, mesesRenta, duracionUnidad);
  const totalVenta = precioTotalCalculado;
  const totalComision =
    Math.round((totalVenta * (Number(comision || 0) / 100)) * 100) / 100;
  const costoPorMesCapturado = Math.max(0, Number(costos || 0));
  const factorDuracion = Math.max(1, mesesRenta);
  /** Total de costo de venta del contrato (captura mensual × meses; en días = monto único). */
  const costosBrutoTotales =
    duracionUnidad === "dias"
      ? Math.round(Math.max(0, Number(precioTarifaDiasTotal || 0)) * 100) / 100
      : Math.round(costoPorMesCapturado * factorDuracion * 100) / 100;
  /** % del socio: por meses = (precio venta/mes × %) × meses; por días = % sobre total del período. */
  const pctSoc = Math.max(0, Math.min(100, Number(porcentajeSocio || 0)));
  const montoSocio =
    duracionUnidad === "dias"
      ? Math.round(
          ((Math.max(0, Number(precioTotalCalculado || 0)) * pctSoc) / 100) * 100,
        ) / 100
      : Math.round(
          ((Math.max(0, precioMensualFinal) * pctSoc) / 100) *
            Math.max(1, mesesRenta) *
            100,
        ) / 100;
  const consideracionTotal = Math.max(0, Number(pagoConsiderar || 0)) * factorDuracion;
  /** El % del socio es sobre precio de venta; consideración/precio fijo sí pueden ajustar costo. */
  const costoVentaFinal = Math.round(
    Math.max(
      0,
      costosBrutoTotales - (tieneConsideracion ? consideracionTotal : 0),
    ) * 100,
  ) / 100;

  useEffect(() => {
    if (duracionUnidad !== "dias") return;
    if (!tarifasDias.some((t) => Number(t.dias) === Number(mesesRenta))) {
      setMesesRenta(Number(tarifasDias[0]?.dias ?? 1));
    }
  }, [duracionUnidad, mesesRenta, tarifasDias]);

  /** En contratos por días: costo de venta = suma de pantallas seleccionadas (precio por día). */
  useEffect(() => {
    if (duracionUnidad !== "dias") return;
    if (esColaboradorPorcentaje) return;
    setCostos(Math.max(0, Number(precioTarifaDiasTotal || 0)));
  }, [
    duracionUnidad,
    esColaboradorPorcentaje,
    precioTarifaDiasTotal,
  ]);

  /** Precio por mes y total se pueden capturar manualmente sin auto-sobrescribirse entre sí. */

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

  const toggleProducto = (productoId: string) => {
    setProductosSeleccionados((prev) =>
      prev.includes(productoId)
        ? prev.filter((id) => id !== productoId)
        : [...prev, productoId],
    );
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
    setClienteCompradorId("");
    setFechaInicio("");
    setMesesRenta(1);
    setDuracionUnidad("meses");
    setProductosSeleccionados([]);
    setPrecioMensualManual(null);
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
      setError("Selecciona un colaborador");
      return;
    }
    if (itemsVenta.length === 0 && productosSeleccionados.length === 0) {
      setError("Selecciona al menos una pantalla o un producto");
      return;
    }
    if (!clienteCompradorId.trim() || !nombreClienteComprador) {
      setError("Selecciona el cliente (comprador) del catálogo");
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
    if (duracionUnidad === "dias" && productosSeleccionados.length > 0) {
      setError("Para duración en días solo se permite venta con pantallas (sin productos)");
      return;
    }
    if (precioMensualFinal < 0) {
      setError("El precio de la venta no puede ser negativo");
      return;
    }
    if (
      !esColaboradorPorcentaje &&
      (!Number.isFinite(costoPorMesCapturado) || costoPorMesCapturado <= 0)
    ) {
      setError("Sin costo de la venta no se puede registrar");
      return;
    }
    if (ventaInicial && usuarioActual.rol === "vendedor" && !codigoValidado) {
      setMensajeCodigo(
        "Para guardar los cambios, solicita el código por correo e ingrésalo aquí. El código vence en 30 minutos.",
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
      productoPrecioMensual: 0,
      precioPantallasMensual: 0,
      pantallasDetalle: [
        ...pantallasActuales.map((p) => ({
          pantallaId: String(p.id),
          nombre: p.nombre,
          precioMensual: 0,
        })),
        ...productosSeleccionados.map((id) => {
          const sid = String(id);
          const prod = productosActuales.find((x) => String(x.id) === sid);
          const nombre = String(prod?.nombre ?? "").trim() || "Producto";
          return {
            pantallaId: `${PREFIJO_LINEA_PRODUCTO}${sid}`,
            nombre,
            precioMensual: 0,
          };
        }),
        {
          pantallaId: "__producto_total__",
          nombre: "META_PRODUCTO",
          precioMensual: 0,
        },
      ],
      fuenteOrigen: fuenteOrigen.trim() || undefined,
      identificadorVenta: identificadorVenta.trim() || undefined,
      clientId: clienteCompradorId.trim(),
      vendidoA: nombreClienteComprador,
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
      // Backend: % del socio sobre precio/mes × meses (o sobre total si es venta por días).
      costos: esColaboradorPorcentaje ? 0 : costosBrutoTotales,
      costoVenta: esColaboradorPorcentaje ? 0 : costosBrutoTotales,
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
        const base = limpiarUnidadEnNotas(limpiarLineaGastoEnNotas(notas));
        const tagUnidad = `[UNIDAD:${duracionUnidad === "dias" ? "DIAS" : "MESES"}]`;
        if (Number(gastosAdicionales || 0) <= 0) {
          return [base, tagUnidad].filter(Boolean).join(" ").trim() || undefined;
        }
        const frag = `(${
          duracionUnidad === "dias"
            ? `Gasto adicional aplicado al día ${mesGastoAdicional}`
            : `Gasto adicional aplicado al mes ${mesGastoAdicional}`
        }: ${Number(gastosAdicionales || 0).toFixed(2)})`;
        return [base, frag, tagUnidad]
          .filter(Boolean)
          .join(" ")
          .trim() || undefined;
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
      const data = (await backendApi.post("/api/codigos/solicitar", {
        entidad: "orden",
        entidad_id: ventaInicial.id,
      })) as { mensaje?: string; vigencia_minutos?: number };
      const mins = data.vigencia_minutos ?? 30;
      setMensajeCodigo(
        `${data?.mensaje ?? "Código solicitado. Revisa tu correo."} Válido ${mins} minutos.`,
      );
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
                          <span className="pantalla-mini-ubicacion">
                            Catálogo:{" "}
                            {Number(p.precio ?? 0).toLocaleString("es-MX", {
                              style: "currency",
                              currency: "MXN",
                            })}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <SelectField
                label="Cliente *"
                value={clienteCompradorId}
                onChange={(v: string) => setClienteCompradorId(String(v ?? ""))}
                className="select-lg"
                placeholder="-- Elige un cliente --"
                options={opcionesClientesComprador}
              />
              {catalogoClientesComprador.length === 0 ? (
                <p className="hint-text" style={{ marginTop: 4 }}>
                  No hay <strong>clientes</strong> (compradores) registrados. Agrégalos en la pestaña{" "}
                  <strong>Clientes</strong>.
                </p>
              ) : null}
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
                    onChange={(v: any) =>
                      setMesesRenta(Math.max(1, Number(v) || 1))
                    }
                    className="select-lg"
                    options={tarifasDias.map((t) => ({
                      value: String(t.dias),
                      label: `${t.dias} día${t.dias === 1 ? "" : "s"} · $${t.precio.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    }))}
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
                    if (next === "dias") setMesesRenta(Number(tarifasDias[0]?.dias ?? 1));
                  }}
                  className="form-select"
                >
                  <option value="meses">Meses</option>
                  {permitePrecioPorDia && <option value="dias">Días</option>}
                </select>
              </div>
              <InputField
                label={
                  duracionUnidad === "dias"
                    ? "Precio fijo del paquete (sin IVA adicional)"
                    : "Precio de la venta (por mes)"
                }
                value={
                  duracionUnidad === "dias"
                    ? (Number(precioPorDiaFinal || 0) === 0
                      ? ""
                      : Number(precioPorDiaFinal || 0))
                    : (Number(precioMensualFinal || 0) === 0
                      ? ""
                      : precioMensualFinal)
                }
                onChange={(v: any) => {
                  if (duracionUnidad === "dias") return;
                  if (String(v).trim() === "") {
                    setPrecioMensualManual(0);
                    return;
                  }
                  const n = Math.max(0, toNumberSafe(v, Number(precioMensualFinal || 0)));
                  setPrecioMensualManual(n);
                }}
                type="number"
                min={0}
                step={0.01}
                readOnly={duracionUnidad === "dias"}
              />
              <InputField
                label="Precio de la venta (total)"
                value={Number(precioTotalCalculado) === 0 ? "" : precioTotalCalculado}
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                readOnly
              />
              {duracionUnidad === "meses" ? (
                <div className="hint-text">
                  Total = precio por mes × {mesesRenta} mes{mesesRenta === 1 ? "" : "es"} (se recalcula al
                  cambiar la duración).
                </div>
              ) : null}
              {duracionUnidad === "dias" ? (
                <div className="hint-text">
                  Tarifa fija configurada para {mesesRenta} día{mesesRenta === 1 ? "" : "s"}.
                </div>
              ) : null}
              {!esColaboradorPorcentaje ? (
                <>
                  <InputField
                    label={
                      duracionUnidad === "dias"
                        ? "Costo de la venta (fijo, sin IVA)"
                        : "Costo de la venta (por mes)"
                    }
                    value={costos === 0 ? "" : costos}
                    onChange={(v: any) => {
                      if (duracionUnidad === "dias") return;
                      const n = Math.max(0, toNumberSafe(v, Number(costos || 0)));
                      setCostos(n);
                    }}
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    readOnly={duracionUnidad === "dias"}
                  />
                  {mesesRenta > 1 && costoPorMesCapturado > 0 ? (
                    <div
                      className="registro-venta-costo-total-box"
                      role="status"
                      aria-live="polite"
                    >
                      <span className="registro-venta-costo-total-box-label">
                        {duracionUnidad === "dias"
                          ? "Costo total por todos los días"
                          : "Costo total del contrato"}
                      </span>
                      <span className="registro-venta-costo-total-box-valor">
                        $
                        {costosBrutoTotales.toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  ) : null}
                </>
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
                  value={gastosAdicionales === 0 ? "" : gastosAdicionales}
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
                  Monto del socio ({Number(porcentajeSocio || 0)}% sobre precio de venta por mes
                  {duracionUnidad === "dias" ? " / total del período" : " × meses"}):{" "}
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
                    vendidoA={nombreClienteComprador}
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
                    productoNombre={productosActuales.map((p) => p.nombre).join(", ")}
                    nombresProductos={productosActuales.map((p) => p.nombre)}
                    precioPantallasReferencia={precioCatalogoPantallasSeleccionadas}
                    precioProductosReferencia={precioCatalogoProductosSeleccionados}
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
