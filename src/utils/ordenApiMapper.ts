import type { OrdenDeCompra, RegistroVenta } from "../types";

function leerPrecioProducto(producto: any): number {
  const n = Number(
    producto?.precio ?? producto?.precio_unitario ?? producto?.precio_por_mes ?? 0,
  );
  return Number.isFinite(n) ? n : 0;
}

/** Fila de `ventas` desde el API (p. ej. GET /api/ordenes/ventas). */
export function mapVentaFromApi(row: any): RegistroVenta {
  const pantallasIds: string[] =
    row.pantallas_ids ?? (row.pantalla_id ? [row.pantalla_id] : []);

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
    productoPrecioMensual: leerPrecioProducto(
      row.producto ?? row.colaborador?.producto,
    ),
    vendidoA:
      row.vendido_a ?? row.client_name ?? row.colaborador?.nombre ?? "-",
    precioGeneral:
      Number(
        row.precio_por_mes ??
          row.precio_general ??
          row.precio_total ??
          0,
      ) || 0,
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

  if (Array.isArray(detalle) && detalle.length > 0) {
    registrosVenta = detalle.map((line: any) => {
      const pids: string[] = line.pantallas_seleccionadas ?? [];
      const fi = line.fecha_inicio
        ? parseFechaLocalOnly(line.fecha_inicio)
        : new Date();
      const ff = line.fecha_fin ? parseFechaLocalOnly(line.fecha_fin) : fi;
      const imp = Number(line.importe) || 0;
      return {
        id: String(line.venta_id ?? ""),
        pantallasIds: pids,
        itemsVenta: pids.map((pantallaId) => ({
          pantallaId,
          sinDescuento: false,
        })),
        colaboradorId: colaboradorId || "",
        productoNombre: line.producto_nombre ?? undefined,
        productoPrecioMensual: Number(line.producto_precio_mensual ?? 0) || 0,
        productoIncluidoEnOrden:
          line.producto_incluido === true
            ? true
            : line.producto_incluido === false
              ? false
              : undefined,
        precioBaseMensualOrden: Number(line.precio_base_mensual ?? imp) || imp,
        vendidoA: line.vendido_a ?? "",
        precioGeneral: imp,
        cantidad: 1,
        precioTotal: imp,
        fechaRegistro: new Date(),
        fechaInicio: fi,
        fechaFin: ff,
        mesesRenta: 1,
        importeTotal: imp,
        activo: true,
        usuarioRegistroId: "",
        estadoVenta: "Aceptado",
      };
    });
  } else {
    const ventas = row.ventas ?? [];
    registrosVenta = Array.isArray(ventas)
      ? ventas.map(mapVentaFromApi)
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
