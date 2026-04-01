/**
 * Utilidad neta alineada con backend: tipo "porcentaje" → precio total − monto %;
 * otros → precio total − costo de venta (ya neto de consideración en BD).
 */
export function utilidadNetaDesdeFilaApi(row: any): number {
  const u = row?.utilidad_neta;
  if (u != null && u !== "" && Number.isFinite(Number(u))) {
    return Number(u);
  }
  const pt = Number(row?.precio_total ?? row?.importe_total ?? 0) || 0;
  const cv = Number(row?.costo_venta ?? row?.costos ?? 0) || 0;
  const ps = Number(row?.porcentaje_socio ?? 0) || 0;
  const nombre = String(
    row?.tipo_pago?.nombre ?? row?.colaborador?.tipo_pago?.nombre ?? "",
  ).toLowerCase();
  const esPct = nombre.includes("porcentaje");
  if (esPct) {
    const m = ps > 0 ? Math.round((pt * ps) / 100 * 100) / 100 : 0;
    return Math.max(0, Math.round((pt - m) * 100) / 100);
  }
  return Math.max(0, Math.round((pt - cv) * 100) / 100);
}
