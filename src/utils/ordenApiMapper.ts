import type { OrdenDeCompra, RegistroVenta } from "../types";

/** `pantallas_detalle` JSON puede venir en camelCase o snake_case (API/BD). */
export function detallePantallaId(p: any): string {
  return String(p?.pantallaId ?? p?.pantalla_id ?? "");
}

export function detallePrecioMensual(p: any): number {
  return Number(p?.precioMensual ?? p?.precio_mensual ?? 0) || 0;
}

/** Línea de precio por producto guardada en `pantallas_detalle` (no es pantalla física). */
export const PREFIJO_LINEA_PRODUCTO = "__producto_linea__";

export function esLineaPrecioProductoEnDetalle(pantallaId: string): boolean {
  return String(pantallaId).startsWith(PREFIJO_LINEA_PRODUCTO);
}

/** Fila de `ventas` desde el API (p. ej. GET /api/ordenes/ventas). */
export function mapVentaFromApi(row: any): RegistroVenta {
  const pantallasIds: string[] =
    row.pantallas_ids ?? (row.pantalla_id ? [row.pantalla_id] : []);
  const pantallasDetalleRaw = Array.isArray(row.pantallas_detalle)
    ? row.pantallas_detalle
    : [];
  const metaProducto = pantallasDetalleRaw.find(
    (p: any) => detallePantallaId(p) === "__producto_total__",
  );
  const pantallasDetalleFiltrado = pantallasDetalleRaw.filter(
    (p: any) => detallePantallaId(p) !== "__producto_total__",
  );
  const precioPantallasDesdeDetalle = pantallasDetalleFiltrado
    .filter((p: any) => !esLineaPrecioProductoEnDetalle(detallePantallaId(p)))
    .reduce((sum: number, p: any) => sum + detallePrecioMensual(p), 0);
  const precioPantallasMensual =
    Number(row.precio_pantallas_mensual ?? precioPantallasDesdeDetalle ?? 0) || 0;
  const precioMensualVenta =
    Number(row.precio_por_mes ?? row.precio_general ?? row.precio_total ?? 0) || 0;
  const productoDesdeVenta = Math.max(
    0,
    Number((precioMensualVenta - precioPantallasMensual).toFixed(2)),
  );
  const productoDesdeMeta = Number(
    metaProducto?.precioMensual ?? metaProducto?.precio_mensual ?? NaN,
  );
  const pantallasDetalle = pantallasDetalleFiltrado.map((p: any) => ({
    pantallaId: detallePantallaId(p),
    nombre: p?.nombre,
    precioMensual: detallePrecioMensual(p),
  }));

  return {
    id: row.id,
    pantallasIds,
    itemsVenta: pantallasIds.map((pantallaId) => ({
      pantallaId,
      sinDescuento: false,
    })),
    colaboradorId: row.colaborador_id ?? "",
    productoId: row.producto_id ?? undefined,
    productoIds: Array.isArray(row.producto_ids)
      ? row.producto_ids.map((x: any) => String(x))
      : row.producto_id
        ? [String(row.producto_id)]
        : [],
    productoNombre:
      row.producto?.nombre ??
      row.colaborador?.producto?.nombre ??
      undefined,
    productoPrecioMensual:
      Number.isFinite(productoDesdeMeta) && productoDesdeMeta >= 0
        ? productoDesdeMeta
        : productoDesdeVenta,
    precioPantallasMensual,
    pantallasDetalle,
    vendidoA:
      row.vendido_a ?? row.client_name ?? row.colaborador?.nombre ?? "-",
    precioGeneral: precioMensualVenta,
    cantidad: row.cantidad ?? 1,
    precioTotal: row.precio_total ?? row.importe_total ?? 0,
    fechaRegistro: row.created_at
      ? new Date(row.created_at)
      : new Date(),
    fechaInicio: parseFechaLocalOnly(row.fecha_inicio),
    fechaFin: parseFechaLocalOnly(row.fecha_fin),
    mesesRenta: row.duracion_meses ?? row.meses_renta ?? 1,
    importeTotal: row.importe_total ?? row.precio_total ?? 0,
    activo: row.activo ?? true,
    usuarioRegistroId: row.usuario_registro_id ?? row.vendedor_id ?? "",
    estadoVenta: "Aceptado",
    tipoPagoId: row.tipo_pago_id ?? row.tipo_pago?.id,
    fuenteOrigen: row.fuente_origen ?? undefined,
    comisionPorcentaje: Number(row.comision_porcentaje ?? 0) || 0,
    gastosAdicionales: Number(row.gastos_adicionales ?? 0) || 0,
  };
}

/** mes en BD 1–12 → índice 0–11 para la UI */
function mesFrontend(mesDb: unknown): number {
  const m = Number(mesDb);
  if (m >= 1 && m <= 12) return m - 1;
  return 0;
}

/**
 * Convierte strings tipo 'YYYY-MM-DD' a Date local SIN offset de timezone.
 * (new Date('YYYY-MM-DD') se trata como UTC y puede mostrar el día anterior/siguiente)
 */
function parseFechaLocalOnly(input: unknown): Date {
  if (input instanceof Date) return input;
  if (typeof input !== "string") return new Date();
  const s = input.trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const yyyy = Number(m[1]);
    const mm = Number(m[2]);
    const dd = Number(m[3]);
    return new Date(yyyy, mm - 1, dd);
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Convierte fila de /api/ordenes (con ventas y opcional detalle_lineas) a OrdenDeCompra.
 */
export function mapOrdenFromApi(row: any): OrdenDeCompra {
  const colaboradorId = row.colaborador_id ?? row.colaborador?.id ?? "";
  const colaboradorNombre = row.colaborador?.nombre ?? undefined;
  const ivaPct = Number(row.iva_porcentaje ?? 16) || 16;
  const mes = mesFrontend(row.mes);
  const año = Number(row.anio) || new Date().getFullYear();

  let detalle = row.detalle_lineas;
  if (typeof detalle === "string") {
    try {
      detalle = JSON.parse(detalle);
    } catch {
      detalle = null;
    }
  }

  let registrosVenta: RegistroVenta[];
  const ventasRaw = Array.isArray(row.ventas) ? row.ventas : [];
  const ventasById = new Map<string, any>(
    ventasRaw.map((v: any) => [String(v?.id ?? ""), v]),
  );

  if (Array.isArray(detalle) && detalle.length > 0) {
    registrosVenta = detalle.map((line: any) => {
      const pids: string[] = line.pantallas_seleccionadas ?? [];
      const ventaSrc = ventasById.get(String(line.venta_id ?? ""));
      const ventaSrcDetalleRaw = Array.isArray(ventaSrc?.pantallas_detalle)
        ? ventaSrc.pantallas_detalle
        : [];
      const linePantallasDetalle = Array.isArray(line.pantallas_detalle)
        ? line.pantallas_detalle.map((p: any) => ({
            pantallaId: detallePantallaId(p),
            nombre: String(p?.nombre ?? "").trim() || undefined,
            precioMensual: detallePrecioMensual(p),
          }))
        : [];
      const lineasProductoDesdeVenta = ventaSrcDetalleRaw
        .filter((p: any) => esLineaPrecioProductoEnDetalle(detallePantallaId(p)))
        .map((p: any) => ({
          pantallaId: detallePantallaId(p),
          nombre: String(p?.nombre ?? "").trim() || undefined,
          precioMensual: detallePrecioMensual(p),
        }));
      const pantallasDetalleMerge = new Map<string, any>();
      for (const p of [...linePantallasDetalle, ...lineasProductoDesdeVenta]) {
        const pid = detallePantallaId(p);
        if (!pid) continue;
        pantallasDetalleMerge.set(pid, p);
      }
      const fi = line.fecha_inicio
        ? parseFechaLocalOnly(line.fecha_inicio)
        : new Date();
      const ff = line.fecha_fin ? parseFechaLocalOnly(line.fecha_fin) : fi;
      const imp = Number(line.importe) || 0;
      const comisionPct = Number(
        line.comision_porcentaje ??
          line.comisionPorcentaje ??
          ventaSrc?.comision_porcentaje ??
          ventaSrc?.comisionPorcentaje ??
          0,
      ) || 0;
      return {
        id: String(line.venta_id ?? ""),
        pantallasIds: pids,
        itemsVenta: pids.map((pantallaId) => ({
          pantallaId,
          sinDescuento: false,
        })),
        colaboradorId: colaboradorId || "",
        productoId:
          ventaSrc?.producto_id != null
            ? String(ventaSrc.producto_id)
            : undefined,
        productoIds: Array.isArray(ventaSrc?.producto_ids)
          ? ventaSrc.producto_ids.map((x: any) => String(x))
          : ventaSrc?.producto_id != null
            ? [String(ventaSrc.producto_id)]
            : [],
        productoNombre:
          line.producto_incluido === true
            ? line.producto_nombre ?? "Producto seleccionado"
            : undefined,
        productoPrecioMensual: Number(line.producto_precio_mensual ?? 0) || 0,
        productoIncluidoEnOrden:
          line.producto_incluido === true
            ? true
            : line.producto_incluido === false
              ? false
              : undefined,
        precioBaseMensualOrden: Number(line.precio_base_mensual ?? imp) || imp,
        gastosAdicionales: Number(line.gastos_adicionales ?? 0) || 0,
        gastosIncluidosEnOrden:
          line.gastos_incluidos_en_orden === true
            ? true
            : line.gastos_incluidos_en_orden === false
              ? false
              : undefined,
        pantallasDetalle: Array.from(pantallasDetalleMerge.values()),
        vendidoA: line.vendido_a ?? "",
        precioGeneral: imp,
        cantidad: 1,
        precioTotal: imp,
        fechaRegistro: new Date(),
        fechaInicio: fi,
        fechaFin: ff,
        mesesRenta: (() => {
          const fromLine = Number(line.meses_renta ?? line.duracion_meses);
          if (Number.isFinite(fromLine) && fromLine > 0) return Math.floor(fromLine);
          const n =
            (ff.getFullYear() - fi.getFullYear()) * 12 +
            (ff.getMonth() - fi.getMonth());
          return Math.max(1, n);
        })(),
        importeTotal: imp,
        comisionPorcentaje: comisionPct,
        activo: true,
        usuarioRegistroId: "",
        estadoVenta: "Aceptado",
      };
    });
  } else {
    registrosVenta = Array.isArray(ventasRaw)
      ? ventasRaw.map(mapVentaFromApi)
      : [];
  }

  const subtotal = Number(row.subtotal) ?? 0;
  const ivaTotal = Number(row.iva) ?? 0;
  const total = Number(row.total) ?? 0;
  const idStr = String(row.id ?? "");

  return {
    id: idStr,
    numeroOrden: `OC-${row.anio}-${String(row.mes).padStart(2, "0")}-${idStr.slice(0, 8)}`,
    fecha: row.created_at ? new Date(row.created_at) : new Date(),
    estado: "generada",
    mes,
    año,
    registrosVenta,
    subtotal,
    ivaPercentaje: ivaPct,
    ivaTotal,
    total,
    colaboradorId,
    colaboradorNombre,
  };
}
