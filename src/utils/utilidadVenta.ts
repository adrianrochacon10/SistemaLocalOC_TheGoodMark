import type { Colaborador, RegistroVenta } from "../types";

const round2Util = (n: number) => Math.round(n * 100) / 100;

function esVentaPorDiasUtil(v: RegistroVenta): boolean {
  const unidad = String((v as { duracionUnidad?: string }).duracionUnidad ?? "")
    .toLowerCase()
    .trim();
  if (["dias", "días", "dia", "día"].includes(unidad)) return true;
  if ((v as { gastoAdicionalEnDias?: boolean }).gastoAdicionalEnDias === true) {
    return true;
  }
  const mr = Math.max(1, Number(v.mesesRenta ?? 1) || 1);
  const fi = new Date(v.fechaInicio as Date | string);
  const ff = new Date(v.fechaFin as Date | string);
  if (Number.isNaN(fi.getTime()) || Number.isNaN(ff.getTime())) return false;
  const dias = Math.max(1, Math.round((ff.getTime() - fi.getTime()) / 86400000) + 1);
  if ([1, 3, 7, 15].includes(mr) && dias <= 31) return true;
  if (mr === dias || Math.abs(dias - mr) <= 1) return true;
  return false;
}

function totalContratoVenta(v: RegistroVenta): number {
  const totalPersistido = Math.max(
    0,
    Number(v.precioTotalContrato ?? v.precioTotal ?? v.importeTotal ?? 0) || 0,
  );
  if (totalPersistido > 0) return round2Util(totalPersistido);
  const base = Number(v.precioGeneral ?? 0) || 0;
  if (base <= 0) return 0;
  if (esVentaPorDiasUtil(v)) return round2Util(base);
  const meses = Math.max(1, Number(v.mesesRenta) || 1);
  return round2Util(base * meses);
}

function notasIndicanVentaPorDias(notas: unknown): boolean {
  return /\[UNIDAD\s*:\s*DIAS\]/i.test(String(notas ?? ""));
}

/**
 * Monto del socio (contrato): en meses = (precio de venta por mes × %) × meses;
 * en venta por días = % sobre el total del período.
 */
export function montoSocioPorcentajeColaboradorDesdeVenta(
  v: RegistroVenta,
  pct: number | null | undefined,
): number {
  if (pct == null || !Number.isFinite(Number(pct)) || Number(pct) < 0) return 0;
  const pctN = Math.min(100, Math.max(0, Number(pct)));
  if (!(pctN > 0)) return 0;
  const bruto = totalContratoVenta(v);
  if (esVentaPorDiasUtil(v) || notasIndicanVentaPorDias(v.notas)) {
    return bruto > 0 ? round2Util((bruto * pctN) / 100) : 0;
  }
  const pm = Number(v.precioGeneral ?? 0) || 0;
  const meses = Math.max(1, Math.floor(Number(v.mesesRenta) || 1));
  if (!(pm > 0)) return 0;
  const socioMensual = round2Util((pm * pctN) / 100);
  return round2Util(socioMensual * meses);
}

/**
 * Si `importe_total` < bruto del contrato, no asumir que es la cuota del socio: también puede ser
 * el **neto empresa** bruto × (100−%)/100. En ese caso se usa `socioCalc` (bruto × %/100).
 */
export function montoSocioPorcentajeEvitandoNetoEmpresa(
  totalBruto: number,
  importeGuardado: number,
  pctGuardado: number | null | undefined,
  socioCalc: number,
): number {
  if (!(socioCalc > 0)) return 0;
  if (pctGuardado == null || !Number.isFinite(Number(pctGuardado))) {
    return socioCalc;
  }
  const pct = Math.min(100, Math.max(0, Number(pctGuardado)));
  if (!(pct > 0)) return socioCalc;

  const bruto = round2Util(Number(totalBruto) || 0);
  const imp = round2Util(Number(importeGuardado) || 0);
  if (!(imp > 0) || !(bruto > 0) || !(imp < bruto - 0.01)) {
    return socioCalc;
  }

  const eps = Math.max(0.5, bruto * 0.005);
  const complemento =
    pct < 100 ? round2Util((bruto * (100 - pct)) / 100) : 0;
  const cercaComplemento =
    pct < 100 && complemento > 0 && Math.abs(imp - complemento) <= eps;
  const cercaSocio = Math.abs(imp - socioCalc) <= eps;

  if (cercaComplemento && !cercaSocio) {
    return socioCalc;
  }
  if (cercaSocio) {
    return round2Util(imp);
  }
  return socioCalc;
}

function montoSocioPorcentajeDesdeFilaApi(row: any): number {
  const ps = Number(row?.porcentaje_socio ?? 0) || 0;
  if (!(ps > 0)) return 0;
  const pm =
    Number(
      row?.precio_por_mes ??
        row?.precio_general ??
        row?.precioPorMes ??
        0,
    ) || 0;
  const n = Math.max(
    1,
    Math.floor(
      Number(row?.duracion_meses ?? row?.meses_renta ?? row?.mesesRenta ?? 1) ||
        1,
    ),
  );
  const pt = Number(row?.precio_total ?? row?.importe_total ?? 0) || 0;
  const notas = String(row?.notas ?? "");
  const du = String(row?.duracion_unidad ?? row?.duracionUnidad ?? "").toLowerCase();
  const esDias =
    notasIndicanVentaPorDias(notas) ||
    du === "dias" ||
    du === "días" ||
    du === "dia" ||
    du === "día";
  if (esDias) {
    return pt > 0 ? Math.round((pt * ps) / 100 * 100) / 100 : 0;
  }
  const socioMensual = Math.round((pm * ps) / 100 * 100) / 100;
  return Math.round(socioMensual * n * 100) / 100;
}

/**
 * Utilidad neta: porcentaje → precio total − monto % del socio;
 * precio fijo / consideración → costo de venta;
 * otros → precio total − costo de venta.
 */
export function utilidadNetaDesdeFilaApi(row: any): number {
  const u = row?.utilidad_neta;
  if (u != null && u !== "" && Number.isFinite(Number(u))) {
    return Number(u);
  }
  const pt = Number(row?.precio_total ?? row?.importe_total ?? 0) || 0;
  const cv = Number(row?.costo_venta ?? row?.costos ?? 0) || 0;
  const nombre = String(
    row?.tipo_pago?.nombre ?? row?.colaborador?.tipo_pago?.nombre ?? "",
  ).toLowerCase();
  const esPct = nombre.includes("porcentaje");
  const esFijo =
    nombre.includes("consideracion") ||
    nombre.includes("consideración") ||
    nombre.includes("precio fijo") ||
    nombre.includes("precio_fijo");
  if (esPct) {
    const m = montoSocioPorcentajeDesdeFilaApi(row);
    return Math.max(0, Math.round((pt - m) * 100) / 100);
  }
  if (esFijo) {
    return Math.max(0, Math.round(cv * 100) / 100);
  }
  return Math.max(0, Math.round((pt - cv) * 100) / 100);
}

/** Para KPI / gráficas: prioriza `utilidadNeta` persistida; si falta, recalcula como el API. */
export function utilidadNetaParaAgregados(v: RegistroVenta): number {
  const raw = v.utilidadNeta;
  if (raw != null && Number.isFinite(Number(raw))) {
    return Math.max(0, Math.round(Number(raw) * 100) / 100);
  }
  return utilidadNetaDesdeFilaApi({
    utilidad_neta: v.utilidadNeta,
    precio_total: v.precioTotal,
    importe_total: v.importeTotal,
    costo_venta: v.costoVenta,
    costos: v.costos,
    porcentaje_socio: v.porcentajeSocio,
    precio_por_mes: v.precioGeneral,
    duracion_meses: v.mesesRenta,
    notas: v.notas,
    duracion_unidad: (v as { duracionUnidad?: string }).duracionUnidad,
  });
}

/**
 * Utilidad del **contrato completo**, alineada con `ResumenVenta`:
 * - Porcentaje: precio de venta total − monto del socio (heurística importe/%).
 * - Precio fijo / consideración: costo de venta total.
 * - Otros: bruto − comisión − pago considerar − costo.
 */
export function utilidadNetaContratoParaKpi(
  v: RegistroVenta,
  colaboradores: Colaborador[] | undefined,
): number {
  const cols = Array.isArray(colaboradores) ? colaboradores : [];
  const col = cols.find((c) => String(c.id) === String(v.colaboradorId));
  const tipo = String(col?.tipoComision ?? "").toLowerCase();
  const totalBruto = totalContratoVenta(v);

  const totalComision = Number(v.comision ?? 0) || 0;
  const totalPagoCons =
    Number(v.pagoConsiderar ?? v.consideracionMonto ?? 0) || 0;
  const totalCostos = Math.max(0, Number(v.costoVenta ?? v.costos ?? 0) || 0);
  const esPorcentaje = tipo === "porcentaje";
  const esFijoOConsideracion =
    tipo === "consideracion" || tipo === "precio_fijo";

  const importeGuardado = Number(v.importeTotal ?? 0) || 0;
  const pctGuardado =
    v.porcentajeSocio != null && Number.isFinite(Number(v.porcentajeSocio))
      ? Number(v.porcentajeSocio)
      : typeof col?.porcentajeSocio === "number"
        ? col.porcentajeSocio
        : null;

  let totalMontoSocio = 0;
  if (esPorcentaje) {
    const socioDesdePorcentaje = montoSocioPorcentajeColaboradorDesdeVenta(
      v,
      pctGuardado,
    );
    totalMontoSocio = montoSocioPorcentajeEvitandoNetoEmpresa(
      totalBruto,
      importeGuardado,
      pctGuardado,
      socioDesdePorcentaje,
    );
  }

  let u: number;
  if (esPorcentaje) {
    u = round2Util(totalBruto - totalMontoSocio);
  } else if (esFijoOConsideracion) {
    u = round2Util(totalCostos);
  } else {
    u = round2Util(totalBruto - totalComision - totalPagoCons - totalCostos);
  }

  return Math.max(0, u);
}

/** Bruto del contrato (precio de venta total) para KPI: mismo criterio que el bruto en `utilidadNetaContratoParaKpi`, sin restar costos ni comisiones. */
export function precioVentaTotalContratoParaKpi(v: RegistroVenta): number {
  return totalContratoVenta(v);
}

/**
 * Reparte un monto del contrato entre meses naturales que cubre [fechaInicio, fechaFin], por días de solape.
 * La suma de valores del mapa coincide con `monto` (salvo redondeo).
 */
export function prorratearMontoPorMesesContrato(
  v: RegistroVenta,
  monto: number,
): Map<string, number> {
  const map = new Map<string, number>();
  if (!(monto > 0)) return map;
  const fi = new Date(v.fechaInicio as Date | string);
  const ff = new Date(v.fechaFin as Date | string);
  if (Number.isNaN(fi.getTime()) || Number.isNaN(ff.getTime())) return map;
  const start = fi <= ff ? fi : ff;
  const end = ff >= fi ? ff : fi;
  const dayMs = 86400000;
  const diasTotal = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / dayMs) + 1,
  );
  const d = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  while (d <= endMonth) {
    const y = d.getFullYear();
    const m0 = d.getMonth();
    const inicioMes = new Date(y, m0, 1);
    const finMes = new Date(y, m0 + 1, 0);
    const segStart = start > inicioMes ? start : inicioMes;
    const segEnd = end < finMes ? end : finMes;
    if (segStart <= segEnd) {
      const diasMes = Math.max(
        0,
        Math.round((segEnd.getTime() - segStart.getTime()) / dayMs) + 1,
      );
      const frac = diasMes / diasTotal;
      const key = `${y}-${String(m0 + 1).padStart(2, "0")}`;
      map.set(key, round2Util((map.get(key) ?? 0) + monto * frac));
    }
    d.setMonth(d.getMonth() + 1);
  }
  return map;
}

/** Lee índice de gasto adicional guardado en notas al registrar la venta. */
export function parseIndiceGastoAdicionalDesdeNotas(
  notas: string | undefined | null,
): { indice: number; enDias: boolean } | null {
  if (notas == null || String(notas).trim() === "") return null;
  const s = String(notas);
  const m = s.match(/Gasto adicional aplicado al mes (\d+)/i);
  if (m) return { indice: Math.max(1, parseInt(m[1], 10)), enDias: false };
  const d = s.match(/Gasto adicional aplicado al día (\d+)/i);
  if (d) return { indice: Math.max(1, parseInt(d[1], 10)), enDias: true };
  return null;
}

/**
 * Asigna el monto de gastos adicionales a **un solo** mes natural calendario:
 * el mes (o día) del contrato elegido en el formulario, no prorrateado por duración.
 * Si no hay índice en notas/campos, mantiene el prorrateo por solape del contrato.
 */
export function bucketCalendarioGastoAdicional(
  v: RegistroVenta,
  monto: number,
): Map<string, number> {
  const map = new Map<string, number>();
  if (!(monto > 0)) return map;
  const desdeCampos =
    v.gastoAdicionalMesIndice != null &&
    Number.isFinite(Number(v.gastoAdicionalMesIndice))
      ? {
          indice: Math.max(1, Math.floor(Number(v.gastoAdicionalMesIndice))),
          enDias: !!v.gastoAdicionalEnDias,
        }
      : null;
  const parsed = desdeCampos ?? parseIndiceGastoAdicionalDesdeNotas(v.notas);
  const fi = new Date(v.fechaInicio as Date | string);
  if (Number.isNaN(fi.getTime())) return prorratearMontoPorMesesContrato(v, monto);
  if (parsed) {
    const { indice, enDias } = parsed;
    if (enDias) {
      const d = new Date(fi.getFullYear(), fi.getMonth(), fi.getDate());
      d.setDate(d.getDate() + (indice - 1));
      const y = d.getFullYear();
      const m0 = d.getMonth();
      const key = `${y}-${String(m0 + 1).padStart(2, "0")}`;
      map.set(key, round2Util(monto));
      return map;
    }
    const y0 = fi.getFullYear();
    const m0 = fi.getMonth();
    const target = new Date(y0, m0 + (indice - 1), 1);
    const key = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, round2Util(monto));
    return map;
  }
  return prorratearMontoPorMesesContrato(v, monto);
}

/**
 * Costo de venta total del contrato (mismo valor que en detalle de venta: no es cuota mensual).
 */
export function costoVentaTotalAgregados(v: RegistroVenta): number {
  return Math.round((Number(v.costoVenta ?? v.costos ?? 0) || 0) * 100) / 100;
}
