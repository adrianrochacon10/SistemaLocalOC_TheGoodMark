import type { Pantalla, RegistroVenta } from "../types";
import {
  detallePantallaId,
  detallePrecioMensual,
  esLineaPrecioProductoEnDetalle,
} from "./ordenApiMapper";
import {
  colaboradorUsaCostoComoBaseOrden,
  colaboradorEsTipoPorcentajeOrden,
  costoLineaOrdenConsideracionPrecioFijo,
  costoVentaProporcionalImporte,
  importeLineaOrdenTrasPorcentajeSocio,
  importeVentaEnMesOrden,
  porcentajeSocioEfectivoVentaEnOrden,
} from "./ordenUtils";

/** Nombre legible para una pantalla: snapshot de la venta primero, luego catálogo. */
export function nombrePantallaDesdeVentaYCatalogo(
  id: string,
  pantallas: Pantalla[],
  detalle: RegistroVenta["pantallasDetalle"],
): string {
  const key = String(id);
  const snap = Array.isArray(detalle)
    ? detalle.find((d) => detallePantallaId(d) === key)
    : undefined;
  const deSnap = String(snap?.nombre ?? "").trim();
  if (deSnap) return deSnap;
  const cat = pantallas.find((p) => String(p.id) === key);
  return cat?.nombre?.trim() || "Pantalla";
}

/**
 * Varios `producto_ids` en la venta; el API suele devolver solo `producto.nombre` (primer FK).
 * Reconstruye `productoNombre` como "A, B" usando el catálogo.
 */
export function enriquecerProductoNombreMultiplesIds(
  ventas: RegistroVenta[],
  productos: Array<{ id: string; nombre?: string }>,
): RegistroVenta[] {
  if (!productos.length) return ventas;
  const map = new Map(
    productos.map((p) => [String(p.id), String(p.nombre ?? "").trim()]),
  );
  return ventas.map((v) => {
    const ids = v.productoIds?.length
      ? v.productoIds.map(String)
      : v.productoId
        ? [String(v.productoId)]
        : [];
    if (ids.length < 2) return v;
    const nombres = ids
      .map((id) => map.get(id))
      .filter((n): n is string => Boolean(n));
    if (nombres.length === 0) return v;
    return { ...v, productoNombre: nombres.join(", ") };
  });
}

export type DetalleLineaOrden = {
  venta_id: string;
  pantallas_seleccionadas: string[];
  nombres_pantallas: string;
  pantallas_detalle?: Array<{
    pantalla_id: string;
    nombre: string;
    precio_mensual: number;
  }>;
  producto_nombre?: string;
  producto_precio_mensual?: number;
  producto_incluido?: boolean;
  aplicar_porcentaje_socio?: boolean;
  precio_base_mensual?: number;
  importe: number;
  vendido_a: string;
  fecha_inicio: string;
  fecha_fin: string;
  /** Duración en meses (contrato); se persiste para PDF y vistas. */
  meses_renta?: number;
  /** % aplicado al crear la orden (congela si luego cambia la venta o el colaborador). */
  porcentaje_socio_aplicado?: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function esVentaPorDiasOrden(v: RegistroVenta): boolean {
  const unidad = String((v as { duracionUnidad?: string }).duracionUnidad ?? "")
    .toLowerCase()
    .trim();
  if (["dias", "días", "dia", "día"].includes(unidad)) return true;
  if ((v as { gastoAdicionalEnDias?: boolean }).gastoAdicionalEnDias === true) return true;
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

/** Meses de renta desde la venta o, si falta, diferencia de meses entre inicio y fin. */
export function mesesRentaDesdeVenta(v: RegistroVenta): number {
  const mr = Number(v.mesesRenta);
  if (Number.isFinite(mr) && mr > 0) return Math.floor(mr);
  const fi = new Date(v.fechaInicio);
  const ff = new Date(v.fechaFin);
  const n =
    (ff.getFullYear() - fi.getFullYear()) * 12 +
    (ff.getMonth() - fi.getMonth());
  return Math.max(1, n);
}

/** Mapa id pantalla → precio mensual de catálogo (si existe). */
export function preciosPantallasMap(pantallas: Pantalla[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of pantallas) {
    const pr = p.precio;
    if (pr != null && !Number.isNaN(Number(pr)) && Number(pr) > 0) {
      m.set(p.id, Number(pr));
    }
  }
  return m;
}

export type PartesImporteOrden = {
  importe: number;
  /** Cuota proporcional del producto dentro del importe total (según peso en la venta). */
  productoPart: number;
  /** Resto del importe atribuible a pantallas. */
  basePantallasPart: number;
  /** Denominador usado (pantallas + producto). */
  denom: number;
  /** Total de venta usado como base (importeTotal / precioTotal). */
  totalContrato: number;
};

/**
 * Reparte el **importe total de la venta** (precioTotal / importeTotal del contrato) según lo
 * seleccionado: suma de precios de pantallas + producto como pesos.
 * No usa solo precios “por mes” aislados: el total del contrato es la base y los pesos salen
 * del desglose (pantallas + producto).
 */
export function partesImporteOrdenVenta(
  venta: RegistroVenta,
  pantallasSeleccionadas: string[],
  precios: Map<string, number>,
): PartesImporteOrden {
  const ids = [...new Set((venta.pantallasIds ?? []).map(String))];
  const sel = [
    ...new Set(
      pantallasSeleccionadas
        .map(String)
        .filter((id) => ids.includes(id)),
    ),
  ];
  const productoIncluido = Boolean(venta.productoIncluidoEnOrden);
  /** Mensual de producto incluido en esta orden (subconjunto). */
  const precioProductoSeleccion = Math.max(
    0,
    Number(venta.productoPrecioMensual ?? 0) || 0,
  );
  /** Mensual de producto del contrato completo (peso en el denominador). */
  const precioProductoContrato =
    typeof venta.productoPrecioMensualContrato === "number"
      ? Math.max(0, venta.productoPrecioMensualContrato)
      : precioProductoSeleccion;
  const T_raw = Math.max(
    0,
    Number(venta.importeTotal ?? venta.precioTotal ?? 0) || 0,
  );
  const precioPantallasMensualStore = Math.max(
    0,
    Number(venta.precioPantallasMensual ?? 0) || 0,
  );

  const ventaDetalle = Array.isArray(venta.pantallasDetalle)
    ? venta.pantallasDetalle.filter(
        (d) =>
          detallePantallaId(d) !== "__producto_total__" &&
          !esLineaPrecioProductoEnDetalle(detallePantallaId(d)),
      )
    : [];
  const preciosVenta = new Map<string, number>(
    ventaDetalle.map((d) => [
      detallePantallaId(d),
      detallePrecioMensual(d),
    ]),
  );
  const precioPantalla = (id: string): number => {
    const key = String(id);
    const snap = preciosVenta.get(key);
    if (snap != null && snap > 0) return snap;
    return precios.get(key) ?? 0;
  };

  let sumAllPant = ids.reduce((s, id) => s + precioPantalla(id), 0);
  if (sumAllPant <= 0 && precioPantallasMensualStore > 0) {
    sumAllPant = precioPantallasMensualStore;
  }

  let sumSel = sel.reduce((s, id) => s + precioPantalla(id), 0);
  if (sumSel <= 0 && sel.length > 0 && sumAllPant > 0 && ids.length > 0) {
    sumSel = (sel.length / ids.length) * sumAllPant;
  }
  if (
    sel.length === ids.length &&
    ids.length > 0 &&
    sumSel <= 0 &&
    sumAllPant > 0
  ) {
    sumSel = sumAllPant;
  }

  const denom = sumAllPant + precioProductoContrato;
  const mesesContrato = mesesRentaDesdeVenta(venta);
  /**
   * Si `importeTotal` difiere en centavos de (pesos mensuales del contrato × meses),
   * el reparto T×(num/denom) desincroniza el subtotal respecto a los precios mostrados
   * (p. ej. pantalla 8000/mes pero línea 7999.99). Solo alineamos cuando no hay gastos
   * en el peso o el desvío es claramente redondeo (< 5 centavos).
   */
  let T = T_raw;
  if (denom > 0 && mesesContrato >= 1) {
    const refTotal = round2(denom * mesesContrato);
    if (Math.abs(T_raw - refTotal) < 0.05) {
      T = refTotal;
    }
  }

  const sinSeleccion = sel.length === 0 && !productoIncluido;
  if (sinSeleccion) {
    return {
      importe: 0,
      productoPart: 0,
      basePantallasPart: 0,
      denom,
      totalContrato: T,
    };
  }

  const num =
    sumSel +
    (productoIncluido ? precioProductoSeleccion : 0);

  let importe: number;
  let productoPart: number;

  if (denom <= 0) {
    importe = round2(num);
    productoPart = productoIncluido ? precioProductoSeleccion : 0;
  } else if (T <= 0) {
    importe = round2(num);
    productoPart = productoIncluido ? precioProductoSeleccion : 0;
  } else {
    importe = round2(T * (num / denom));
    productoPart =
      productoIncluido && precioProductoSeleccion > 0
        ? round2(T * (precioProductoSeleccion / denom))
        : 0;
  }

  const basePantallasPart = round2(importe - productoPart);

  return {
    importe,
    productoPart,
    basePantallasPart,
    denom,
    totalContrato: T,
  };
}

export function importeVentaSeleccion(
  venta: RegistroVenta,
  pantallasSeleccionadas: string[],
  precios: Map<string, number>,
): number {
  return partesImporteOrdenVenta(venta, pantallasSeleccionadas, precios).importe;
}

export function nombresPantallas(
  ids: string[],
  pantallas: Pantalla[],
  venta?: RegistroVenta,
): string {
  const detalle = venta?.pantallasDetalle;
  return ids
    .map((id) => nombrePantallaDesdeVentaYCatalogo(String(id), pantallas, detalle))
    .join(", ");
}

export function construirDetalleLineas(
  ventas: RegistroVenta[],
  seleccion: Map<string, string[]>,
  pantallas: Pantalla[],
  mesOrden0: number,
  añoOrden: number,
  opts?: {
    /** Si true, prorratea el importe seleccionado al tramo del mes; si false usa base mensual. */
    prorratearEnMes?: boolean;
    tipoComision?: string;
    tipoPagoNombre?: string;
    porcentajeColaboradorActual?: number | null;
  },
): DetalleLineaOrden[] {
  const precios = preciosPantallasMap(pantallas);
  const lineas: DetalleLineaOrden[] = [];
  const prorratearEnMes = opts?.prorratearEnMes !== false;

  for (const v of ventas) {
    const sel = seleccion.get(String(v.id)) ?? [];
    const productoIncluido = Boolean(v.productoIncluidoEnOrden);
    if (sel.length === 0 && !productoIncluido) continue;

    const partes = partesImporteOrdenVenta(v, sel, precios);
    const T = round2(Math.max(0, partes.totalContrato));
    let imp = Math.max(0, partes.importe);
    if (T > 0 && prorratearEnMes && !esVentaPorDiasOrden(v)) {
      const mesCompleto = importeVentaEnMesOrden(v, mesOrden0, añoOrden, T);
      imp = round2((imp / T) * mesCompleto);
    } else {
      imp = round2(imp);
    }
    const productoMensual = Number(v.productoPrecioMensual ?? 0) || 0;
    const baseMensual = Math.max(0, partes.basePantallasPart);
    const fi = new Date(v.fechaInicio);
    const ff = new Date(v.fechaFin);
    const pantallasDetalleVenta = Array.isArray(v.pantallasDetalle)
      ? v.pantallasDetalle.filter(
          (d) =>
            detallePantallaId(d) !== "__producto_total__" &&
            !esLineaPrecioProductoEnDetalle(detallePantallaId(d)),
        )
      : [];
    const detallePantallasSeleccionadas = sel.map((pid) => {
      const snap = pantallasDetalleVenta.find(
        (p) => detallePantallaId(p) === String(pid),
      );
      const nombre = nombrePantallaDesdeVentaYCatalogo(
        String(pid),
        pantallas,
        v.pantallasDetalle,
      );
      const precioSnap = detallePrecioMensual(snap);
      const precioCat = precios.get(String(pid)) ?? 0;
      const precio = precioSnap > 0 ? precioSnap : precioCat;
      return {
        pantalla_id: String(pid),
        nombre,
        precio_mensual: precio,
      };
    });
    const pctSnap =
      colaboradorEsTipoPorcentajeOrden(
        opts?.tipoComision,
        opts?.tipoPagoNombre,
      )
        ? porcentajeSocioEfectivoVentaEnOrden(
            v,
            opts?.porcentajeColaboradorActual ?? null,
          )
        : undefined;
    lineas.push({
      venta_id: v.id,
      pantallas_seleccionadas: sel.filter((id) =>
        (v.pantallasIds ?? []).map(String).includes(String(id)),
      ),
      nombres_pantallas: nombresPantallas(sel, pantallas, v),
      pantallas_detalle: detallePantallasSeleccionadas,
      producto_nombre: v.productoNombre ?? undefined,
      producto_precio_mensual: productoMensual,
      producto_incluido: productoIncluido,
      ...(typeof v.aplicarPorcentajeSocioEnOrden === "boolean"
        ? { aplicar_porcentaje_socio: v.aplicarPorcentajeSocioEnOrden }
        : {}),
      ...(pctSnap != null && Number.isFinite(pctSnap)
        ? { porcentaje_socio_aplicado: pctSnap }
        : {}),
      precio_base_mensual: baseMensual,
      importe: imp,
      vendido_a: v.vendidoA ?? "",
      fecha_inicio: fi.toISOString().slice(0, 10),
      fecha_fin: ff.toISOString().slice(0, 10),
      meses_renta: mesesRentaDesdeVenta(v),
    });
  }
  return lineas;
}

export function totalesDesdeLineas(
  lineas: DetalleLineaOrden[],
  ivaPercentaje: number,
  opts?: {
    tipoComision?: string;
    tipoPagoNombre?: string;
    /** % del socio vigente del colaborador (tabla porcentajes / estado clientes). */
    porcentajeColaboradorActual?: number | null;
    /** Mes de la orden 0–11 (requerido con año y corte para costo consideración/precio fijo). */
    mesOrden0?: number;
    añoOrden?: number;
    diaCorteOrdenes?: number;
    ventasPorId?: Map<string, RegistroVenta>;
  },
): { subtotal: number; iva: number; total: number } {
  const usarCosto = colaboradorUsaCostoComoBaseOrden(
    opts?.tipoComision,
    opts?.tipoPagoNombre,
  );
  const map = opts?.ventasPorId;
  const mes0 = opts?.mesOrden0;
  const añoOrd = opts?.añoOrden;
  const diaCorte = Number(opts?.diaCorteOrdenes ?? 20) || 20;
  const subtotalRaw = lineas.reduce((s, l) => {
      const imp = Number(l.importe) || 0;
      if (!map) return s + imp;
      const v = map.get(String(l.venta_id));
      if (usarCosto) {
        if (!v) return s + imp;
        if (esVentaPorDiasOrden(v)) {
          // Regla negocio: venta por días usa costo fijo completo (sin prorrateo/división).
          return s + Math.max(0, Number(v.costoVenta ?? v.costos ?? 0) || 0);
        }
        if (mes0 != null && añoOrd != null) {
          return (
            s +
            costoLineaOrdenConsideracionPrecioFijo(
              v,
              mes0,
              añoOrd,
              imp,
              diaCorte,
            )
          );
        }
        return s + costoVentaProporcionalImporte(v, imp);
      }
      const bruto = imp;
      const facturable = v
        ? importeLineaOrdenTrasPorcentajeSocio(
            bruto,
            v,
            opts?.tipoComision,
            opts?.porcentajeColaboradorActual,
            opts?.tipoPagoNombre,
          )
        : imp;
      return s + facturable;
    }, 0);
  const subtotal = round2(subtotalRaw);
  const baseIva = round2(
    lineas.reduce((s, l) => {
      if (!map) return s + (Number(l.importe) || 0);
      const v = map.get(String(l.venta_id));
      if (v && esVentaPorDiasOrden(v)) return s;
      const imp = Number(l.importe) || 0;
      if (usarCosto) {
        if (!v) return s + imp;
        if (mes0 != null && añoOrd != null) {
          return (
            s +
            costoLineaOrdenConsideracionPrecioFijo(
              v,
              mes0,
              añoOrd,
              imp,
              diaCorte,
            )
          );
        }
        return s + costoVentaProporcionalImporte(v, imp);
      }
      const bruto = imp;
      const facturable = v
        ? importeLineaOrdenTrasPorcentajeSocio(
            bruto,
            v,
            opts?.tipoComision,
            opts?.porcentajeColaboradorActual,
            opts?.tipoPagoNombre,
          )
        : imp;
      return s + facturable;
    }, 0),
  );
  const iva = round2(baseIva * (ivaPercentaje / 100));
  return { subtotal, iva, total: round2(subtotal + iva) };
}

export function ventasIdsDesdeSeleccion(seleccion: Map<string, string[]>): string[] {
  return [...seleccion.keys()].filter(Boolean);
}

export type CrearOrdenPayload = {
  colaboradorId: string;
  mes: number;
  año: number;
  ventasIds: string[];
  detalleLineas: DetalleLineaOrden[];
  subtotal: number;
  iva: number;
  total: number;
  ivaPercentaje: number;
};
