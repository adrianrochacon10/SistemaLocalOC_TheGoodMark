// src/utils/ordenUtils.ts
import { RegistroVenta } from "../types";
import { OrdenDeCompra } from "../types";

/** Inicio del día en horario local (evita desfaces por UTC). */
function inicioDiaLocal(d: Date): Date {
  const x = d instanceof Date ? d : new Date(d);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate());
}

/** Contrato [fechaInicio, fechaFin] toca el mes calendario indicado (mes 0–11). */
export function registroSolapaMesCalendario(
  fechaInicio: Date,
  fechaFin: Date,
  mes: number,
  año: number,
): boolean {
  const monthStart = inicioDiaLocal(new Date(año, mes, 1));
  const monthEnd = inicioDiaLocal(new Date(año, mes + 1, 0));
  const fi = inicioDiaLocal(fechaInicio);
  const ff = inicioDiaLocal(fechaFin);
  return fi <= monthEnd && ff >= monthStart;
}

/**
 * La orden debe listarse al elegir un mes/año si **alguna** venta solapa ese mes calendario
 * (p. ej. contrato 20 mar–abr aparece en marzo y en abril).
 * Sin líneas cargadas, se mantiene el criterio anterior: mes/año de la orden en BD.
 */
export function ordenApareceEnMesVista(
  orden: OrdenDeCompra,
  mes: number,
  año: number,
): boolean {
  return orden.mes === mes && orden.año === año;
}

/* ------------------------------------------------------------------ */
/*  1️⃣  Asignación de mes (corte sobre día de fechaInicio, = backend) */
/* ------------------------------------------------------------------ */
export type AsignacionOrden = "actual" | "siguiente" | "otro_mes";

export function asignarOrdenMes(
  venta: RegistroVenta,
  mesOrden: number,
  añoOrden: number,
  diaCorte: number = 5,
): AsignacionOrden {
  if (ventaIncluidaEnMesOrdenConCorte(venta, mesOrden, añoOrden, diaCorte)) {
    return "actual";
  }
  const mesSig0 = mesOrden === 11 ? 0 : mesOrden + 1;
  const añoSig = mesOrden === 11 ? añoOrden + 1 : añoOrden;
  if (ventaIncluidaEnMesOrdenConCorte(venta, mesSig0, añoSig, diaCorte)) {
    return "siguiente";
  }
  return "otro_mes";
}

/* ------------------------------------------------------------------ */
/*  2️⃣  Ventas que entran en OC del mes (misma regla que backend)     */
/* ------------------------------------------------------------------ */
export function obtenerRegistrosDelMes(
  ventas: RegistroVenta[],
  mes: number, // 0‑11
  año: number,
  diaCorte: number = 5,
): RegistroVenta[] {
  return ventas.filter((v) =>
    ventaIncluidaEnMesOrdenConCorte(v, mes, año, diaCorte),
  );
}

/* ------------------------------------------------------------------ */
/*  3️⃣  Buscar si ya existe una orden para el mes/año indicado       */
/* ------------------------------------------------------------------ */
export function obtenerOrdenDelMes(
  ordenes: OrdenDeCompra[],
  mes: number,
  año: number,
): OrdenDeCompra | undefined {
  return ordenes.find((o) => o.mes === mes && o.año === año);
}

/* ------------------------------------------------------------------ */
/*  4️⃣  Generar una OrdenDeCompra a partir de las ventas del mes    */
/* ------------------------------------------------------------------ */
export function generarOrdenDelMes(
  ventas: RegistroVenta[],
  config: { ivaPercentaje: number },
  usuarioId: string,
  mes: number,
  año: number,
  diaCorte: number = 5,
): OrdenDeCompra {
  const registrosDelMes = obtenerRegistrosDelMes(ventas, mes, año, diaCorte);

  // Subtotal = suma de precioGeneral (igual que tenías en el componente)
  const subtotal = registrosDelMes.reduce(
    (total: number, v: RegistroVenta) => total + v.precioGeneral,
    0,
  );
  const ivaTotal = subtotal * (config.ivaPercentaje / 100);
  const total = subtotal + ivaTotal;

  const orden: OrdenDeCompra = {
    id: `oc${Date.now()}`,
    numeroOrden: `OC-${año}${String(mes + 1).padStart(2, "0")}-${Date.now()}`,
    fecha: new Date(),
    estado: "descargada",
    mes,
    año,
    fechaCorte: new Date(año, mes, diaCorte),
    subtotal,
    ivaTotal,
    ivaPercentaje: config.ivaPercentaje,
    total,
    usuarioExportoId: usuarioId,
    fechaExportacion: new Date(),

    // Campos del modelo anterior (no se usan aquí)
    empresaId: undefined,
    contratoId: undefined,
    tipoCliente: undefined,
    conceptos: undefined,
    montoTotal: undefined,

    // Nuevo modelo: registrosVenta (mapeo 1‑a‑1)
    registrosVenta: registrosDelMes.map((v) => ({
      id: v.id,
      pantallasIds: v.pantallasIds,
      itemsVenta: v.itemsVenta,
      clienteId: v.clienteId,
      productoId: v.productoId ?? null,
      vendidoA: v.vendidoA,
      precioGeneral: v.precioGeneral,
      cantidad: v.cantidad,
      precioTotal: v.precioTotal,
      fechaRegistro: new Date(v.fechaRegistro),
      fechaInicio: new Date(v.fechaInicio),
      fechaFin: new Date(v.fechaFin),
      mesesRenta: v.mesesRenta,
      importeTotal: v.importeTotal,
      activo: v.activo,
      usuarioRegistroId: v.usuarioRegistroId,
      estadoVenta: v.estadoVenta,
      tipoPagoId: v.tipoPagoId,
    })),
  };

  return orden;
}

/* ------------------------------------------------------------------ */
/*  5️⃣  Etiqueta legible para mes/año                                */
/* ------------------------------------------------------------------ */
export function etiquetaMes(mes: number, año: number): string {
  return new Date(año, mes, 1).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });
}

/** Misma regla que el backend: la venta se solapa con el mes calendario (mes 0–11). */
export function ventaSolapaMesCalendario(
  v: RegistroVenta,
  mes0: number,
  año: number,
): boolean {
  return registroSolapaMesCalendario(
    new Date(v.fechaInicio),
    new Date(v.fechaFin),
    mes0,
    año,
  );
}

/**
 * Incluir venta en OC del mes (mes 0–11) si el contrato cruza ese mes **después** de aplicar corte:
 * si día(fecha_inicio) > dia_corte, la venta solo cuenta desde el 1 del mes siguiente
 * (ej. corte 29, inicio 30-mar → entra desde abril; contrato largo sigue en may, jun, …).
 */
export function ventaIncluidaEnMesOrdenConCorte(
  v: RegistroVenta,
  mes0: number,
  año: number,
  diaCorte: number,
): boolean {
  const fi = inicioDiaLocal(new Date(v.fechaInicio));
  const ff = inicioDiaLocal(new Date(v.fechaFin));
  if (Number.isNaN(fi.getTime()) || Number.isNaN(ff.getTime())) return false;
  const dc = Math.min(31, Math.max(1, Math.floor(Number(diaCorte) || 20)));
  const eff =
    fi.getDate() > dc
      ? inicioDiaLocal(new Date(fi.getFullYear(), fi.getMonth() + 1, 1))
      : inicioDiaLocal(new Date(fi.getFullYear(), fi.getMonth(), 1));
  const monthStart = inicioDiaLocal(new Date(año, mes0, 1));
  const monthEnd = inicioDiaLocal(new Date(año, mes0 + 1, 0));
  return eff <= monthEnd && ff >= monthStart;
}

function round2Orden(n: number): number {
  return Math.round(Number(n) * 100) / 100;
}

const DIA_CORTE_ORDEN = 20;
const EPS_IMP_ORDEN = 0.05;

function ymdVenta(d: Date): string {
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Importe del contrato que corresponde al mes de la orden (misma lógica que backend `importeVentaEnMes`).
 */
export function importeVentaEnMesOrden(
  v: RegistroVenta,
  mes0: number,
  año: number,
  precioContrato?: number,
): number {
  const pt = round2Orden(
    precioContrato != null && precioContrato > 0
      ? precioContrato
      : Number(v.precioTotalContrato ?? v.precioTotal ?? v.importeTotal ?? 0) ||
          0,
  );
  const s = ymdVenta(v.fechaInicio);
  const e = ymdVenta(v.fechaFin);
  if (!s || !e || pt <= 0) return pt;
  const mesDb = mes0 + 1;
  const inicio = `${año}-${String(mesDb).padStart(2, "0")}-01`;
  const ultimo = new Date(año, mesDb, 0);
  const finStr = ultimo.toISOString().slice(0, 10);
  const vi = new Date(`${s}T12:00:00`);
  const vf = new Date(`${e}T12:00:00`);
  const ms = new Date(`${inicio}T12:00:00`);
  const me = new Date(`${finStr}T12:00:00`);
  const start = vi > ms ? vi : ms;
  const end = vf < me ? vf : me;
  if (start > end) return 0;
  const dayMs = 86400000;
  const diasTotal = Math.max(
    1,
    Math.round((vf.getTime() - vi.getTime()) / dayMs) + 1,
  );
  const diasOverlap = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / dayMs) + 1,
  );
  return round2Orden((pt * diasOverlap) / diasTotal);
}

/** Meses de duración del contrato (`mesesRenta` o diferencia inicio–fin). */
export function mesesContratoVentaOrden(v: RegistroVenta): number {
  const mr = Number(v.mesesRenta);
  if (Number.isFinite(mr) && mr > 0) return Math.max(1, Math.floor(mr));
  const fi = new Date(v.fechaInicio);
  const ff = new Date(v.fechaFin);
  if (Number.isNaN(fi.getTime()) || Number.isNaN(ff.getTime())) return 1;
  const n =
    (ff.getFullYear() - fi.getFullYear()) * 12 +
    (ff.getMonth() - fi.getMonth());
  return Math.max(1, n);
}

/**
 * Consideración / precio fijo: cuota mensual de costo = costo total ÷ meses de contrato,
 * solo si la venta cuenta en el mes de la OC (corte sobre día de `fechaInicio`).
 */
export function costoVentaCuotaMensualConsideracionPrecioFijo(
  v: RegistroVenta,
  mes0: number,
  año: number,
  diaCorte: number = DIA_CORTE_ORDEN,
): number {
  const cv = round2Orden(Number(v.costoVenta ?? v.costos ?? 0) || 0);
  if (!(cv > 0)) return 0;
  if (!ventaIncluidaEnMesOrdenConCorte(v, mes0, año, diaCorte)) return 0;
  const meses = mesesContratoVentaOrden(v);
  return round2Orden(cv / meses);
}

/**
 * Costo de la línea en OC: cuota mensual × (importe línea / importe de la venta en ese mes),
 * para subselección de pantallas o producto.
 */
export function costoLineaOrdenConsideracionPrecioFijo(
  v: RegistroVenta,
  mes0: number,
  año: number,
  importeLineaVentaMes: number,
  diaCorte: number = DIA_CORTE_ORDEN,
): number {
  const cuota = costoVentaCuotaMensualConsideracionPrecioFijo(
    v,
    mes0,
    año,
    diaCorte,
  );
  if (!(cuota > 0)) return 0;
  const imp = round2Orden(Number(importeLineaVentaMes) || 0);
  if (!(imp > 0)) return 0;
  const contrato = round2Orden(
    Number(v.precioTotalContrato ?? 0) > 0
      ? Number(v.precioTotalContrato)
      : Number(v.precioTotal ?? v.importeTotal ?? 0) || 0,
  );
  const ventaMesFull = importeVentaEnMesOrden(
    v,
    mes0,
    año,
    contrato > 0 ? contrato : undefined,
  );
  if (!(ventaMesFull > 0.01)) {
    return cuota;
  }
  if (Math.abs(imp - ventaMesFull) < EPS_IMP_ORDEN) {
    return cuota;
  }
  return round2Orden((cuota * imp) / ventaMesFull);
}

/**
 * Importe de línea en OC/PDF: **mes de la orden** (prorrateo por días en ese mes).
 * Si el registro trae un importe menor (subselección de pantallas/producto en detalle), se respeta.
 */
export function importeLineaRespectoOrden(
  v: RegistroVenta,
  orden: OrdenDeCompra,
  _numLineas: number,
): number {
  const mes0 = orden.mes ?? 0;
  const año = orden.año ?? new Date().getFullYear();
  const contrato = round2Orden(
    Number(v.precioTotalContrato ?? 0) > 0
      ? Number(v.precioTotalContrato)
      : Number(v.precioTotal ?? v.importeTotal ?? 0) || 0,
  );
  const imp = round2Orden(Number(v.importeTotal ?? v.precioTotal ?? 0) || 0);
  const sub = round2Orden(Number(orden.subtotal ?? 0) || 0);

  if (contrato > 0) {
    const mesCompleto = importeVentaEnMesOrden(v, mes0, año, contrato);
    if (Math.abs(imp - mesCompleto) < EPS_IMP_ORDEN) {
      return mesCompleto;
    }
    if (imp > mesCompleto + EPS_IMP_ORDEN) {
      return mesCompleto;
    }
    if (imp > 0) {
      return imp;
    }
    return mesCompleto;
  }

  if (_numLineas === 1 && sub > 0) return sub;
  if (imp > 0) return imp;
  return importeVentaEnMesOrden(v, mes0, año, undefined);
}

/**
 * Consideración / precio fijo: OC sobre costo de venta.
 * Por porcentaje: sobre precio de venta (neto tras %).
 * Si `tipoComision` no viene, se infiere por nombre de `tipo_pago` (como en backend).
 */
export function colaboradorUsaCostoComoBaseOrden(
  tipoComision?: string,
  tipoPagoNombre?: string,
): boolean {
  const t = String(tipoComision ?? "").toLowerCase();
  if (t === "porcentaje") return false;
  if (t === "consideracion" || t === "precio_fijo") return true;
  const nom = String(tipoPagoNombre ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!nom) return false;
  if (nom.includes("porcentaje")) return false;
  if (
    nom.includes("consideracion") ||
    nom.includes("consideración")
  )
    return true;
  if (
    nom.includes("precio fijo") ||
    nom.includes("precio_fijo") ||
    nom.includes("pago fijo")
  )
    return true;
  return false;
}

/**
 * Colaborador por %: el subtotal de la OC es el importe de venta **menos** ese % (lo que no es comisión del socio).
 * Si `aplicarPorcentajeSocioEnOrden === false`, no se resta.
 * `porcentajeColaboradorActual`: % vigente del colaborador (prioridad sobre `venta.porcentajeSocio`).
 */
export function importeLineaOrdenTrasPorcentajeSocio(
  importeBruto: number,
  venta: Pick<
    RegistroVenta,
    "porcentajeSocio" | "aplicarPorcentajeSocioEnOrden"
  > | undefined,
  tipoComisionColaborador?: string,
  porcentajeColaboradorActual?: number | null,
): number {
  const bruto = round2Orden(Number(importeBruto) || 0);
  if (bruto <= 0) return bruto;
  if (colaboradorUsaCostoComoBaseOrden(tipoComisionColaborador)) return bruto;
  const tc = String(tipoComisionColaborador ?? "").toLowerCase();
  if (tc !== "porcentaje") return bruto;
  if (venta?.aplicarPorcentajeSocioEnOrden === false) return bruto;
  let pct: number;
  if (
    porcentajeColaboradorActual != null &&
    Number.isFinite(Number(porcentajeColaboradorActual))
  ) {
    pct = Math.max(0, Math.min(100, Number(porcentajeColaboradorActual)));
  } else {
    pct = Math.max(0, Math.min(100, Number(venta?.porcentajeSocio ?? 0) || 0));
  }
  if (pct <= 0) return bruto;
  return round2Orden(bruto * (1 - pct / 100));
}

/** Costo de venta proporcional al importe de la línea (vs total del contrato en BD). */
export function costoVentaProporcionalImporte(
  v: RegistroVenta,
  importeLinea: number,
): number {
  const cv = round2Orden(Number(v.costoVenta ?? v.costos ?? 0) || 0);
  if (cv <= 0 || importeLinea <= 0) return 0;
  const ref = round2Orden(Number(v.precioTotalContrato ?? 0) || 0);
  if (ref <= 0) return cv;
  return round2Orden((cv * importeLinea) / ref);
}

function fechaValidaOr(v: any, fallback: Date): Date {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? fallback : d;
}

/**
 * @deprecated Usaba `fecha_registro` + corte. Las OC usan `ventaIncluidaEnMesOrdenConCorte`
 * (corte sobre **día de fecha_inicio** y solape por mes).
 */
export function periodoContableVentaConCorte(
  v: RegistroVenta,
  diaCorte: number = DIA_CORTE_ORDEN,
): { mes0: number; año: number } {
  const fi = fechaValidaOr(v.fechaInicio, new Date());
  const fr = fechaValidaOr((v as any).fechaRegistro, fi);
  const base = new Date(fi.getFullYear(), fi.getMonth(), 1);
  const p = fr.getDate() >= diaCorte
    ? new Date(base.getFullYear(), base.getMonth() + 1, 1)
    : base;
  return { mes0: p.getMonth(), año: p.getFullYear() };
}

/** @deprecated Ver `ventaIncluidaEnMesOrdenConCorte`. */
export function ventaPertenecePeriodoConCorte(
  v: RegistroVenta,
  mes0: number,
  año: number,
  diaCorte: number = DIA_CORTE_ORDEN,
): boolean {
  const p = periodoContableVentaConCorte(v, diaCorte);
  return p.mes0 === mes0 && p.año === año;
}
