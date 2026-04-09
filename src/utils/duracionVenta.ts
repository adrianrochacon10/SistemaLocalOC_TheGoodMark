import { RegistroVenta } from "../types";

export function inferirDuracionUnidadVenta(
  venta: Pick<RegistroVenta, "fechaInicio" | "fechaFin" | "mesesRenta"> & {
    duracionUnidad?: string;
    gastoAdicionalEnDias?: boolean;
    notas?: string;
  },
): "meses" | "dias" {
  const unidadGuardada = String(venta.duracionUnidad ?? "").toLowerCase().trim();
  if (unidadGuardada === "dias" || unidadGuardada === "meses") {
    return unidadGuardada as "dias" | "meses";
  }
  const notas = String(venta.notas ?? "").toLowerCase();
  if (/\[unidad\s*:\s*dias\]/i.test(notas)) return "dias";
  if (/\[unidad\s*:\s*meses\]/i.test(notas)) return "meses";
  if (venta.gastoAdicionalEnDias === true) return "dias";
  return "meses";
}
