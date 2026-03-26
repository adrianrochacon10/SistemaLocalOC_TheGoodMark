import type { Pantalla, RegistroVenta } from "../types";

export type DetalleLineaOrden = {
  venta_id: string;
  pantallas_seleccionadas: string[];
  nombres_pantallas: string;
  producto_nombre?: string;
  producto_precio_mensual?: number;
  producto_incluido?: boolean;
  precio_base_mensual?: number;
  importe: number;
  vendido_a: string;
  fecha_inicio: string;
  fecha_fin: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

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

/**
 * Importe de una venta según pantallas seleccionadas.
 * Si hay precios de catálogo, prorratea precioGeneral por peso de precios.
 * Si no, prorratea por cantidad de pantallas.
 */
export function importeVentaSeleccion(
  venta: RegistroVenta,
  pantallasSeleccionadas: string[],
  precios: Map<string, number>,
): number {
  const ids = venta.pantallasIds ?? [];
  const sel = pantallasSeleccionadas.filter((id) => ids.includes(id));
  if (sel.length === 0 || ids.length === 0) return 0;

  const sumSel = sel.reduce((s, id) => s + (precios.get(id) ?? 0), 0);
  const sumAll = ids.reduce((s, id) => s + (precios.get(id) ?? 0), 0);
  const pgBase = Number(venta.precioBaseMensualOrden ?? venta.precioGeneral) || 0;
  const pg =
    pgBase > 0
      ? pgBase
      : Number(venta.precioTotal ?? venta.importeTotal ?? 0) /
        Math.max(1, Number(venta.mesesRenta) || 1);

  let mensualBase = 0;
  if (sumAll > 0 && sumSel > 0) {
    mensualBase = round2((pg * sumSel) / sumAll);
  } else {
    mensualBase = round2((pg * sel.length) / ids.length);
  }

  // Si el usuario marcó "sumar producto en esta orden", se agrega su precio mensual
  // en la misma proporción de pantallas seleccionadas de la venta.
  if (venta.productoIncluidoEnOrden) {
    const precioProducto = Number(venta.productoPrecioMensual ?? 0) || 0;
    if (precioProducto > 0) {
      const ratio = sumAll > 0 && sumSel > 0 ? sumSel / sumAll : sel.length / ids.length;
      return round2(mensualBase + precioProducto * ratio);
    }
  }

  return mensualBase;
}

export function nombresPantallas(
  ids: string[],
  pantallas: Pantalla[],
): string {
  return ids
    .map((id) => pantallas.find((p) => p.id === id)?.nombre ?? "Pantalla")
    .join(", ");
}

export function construirDetalleLineas(
  ventas: RegistroVenta[],
  seleccion: Map<string, string[]>,
  pantallas: Pantalla[],
): DetalleLineaOrden[] {
  const precios = preciosPantallasMap(pantallas);
  const lineas: DetalleLineaOrden[] = [];

  for (const v of ventas) {
    const sel = seleccion.get(String(v.id));
    if (!sel || sel.length === 0) continue;
    const imp = Math.max(0, importeVentaSeleccion(v, sel, precios));
    const productoMensual = Number(v.productoPrecioMensual ?? 0) || 0;
    const productoIncluido = Boolean(v.productoIncluidoEnOrden);
    const baseMensual = Math.max(
      0,
      Number(v.precioBaseMensualOrden ?? (v.precioGeneral ?? 0)),
    );
    const fi = new Date(v.fechaInicio);
    const ff = new Date(v.fechaFin);
    lineas.push({
      venta_id: v.id,
      pantallas_seleccionadas: sel.filter((id) =>
        (v.pantallasIds ?? []).includes(id),
      ),
      nombres_pantallas: nombresPantallas(sel, pantallas),
      producto_nombre: v.productoNombre ?? undefined,
      producto_precio_mensual: productoMensual,
      producto_incluido: productoIncluido,
      precio_base_mensual: baseMensual,
      importe: imp,
      vendido_a: v.vendidoA ?? "",
      fecha_inicio: fi.toISOString().slice(0, 10),
      fecha_fin: ff.toISOString().slice(0, 10),
    });
  }
  return lineas;
}

export function totalesDesdeLineas(
  lineas: DetalleLineaOrden[],
  ivaPercentaje: number,
): { subtotal: number; iva: number; total: number } {
  const subtotal = round2(
    lineas.reduce((s, l) => s + (Number(l.importe) || 0), 0),
  );
  const iva = round2(subtotal * (ivaPercentaje / 100));
  return { subtotal, iva, total: round2(subtotal + iva) };
}

export function ventasIdsDesdeSeleccion(seleccion: Map<string, string[]>): string[] {
  return [...seleccion.keys()].filter((vid) => (seleccion.get(vid)?.length ?? 0) > 0);
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
