import type { OrdenDeCompra, RegistroVenta } from "../types";

function mapVentaNested(row: any): RegistroVenta {
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
    vendidoA:
      row.vendido_a ?? row.client_name ?? row.colaborador?.nombre ?? "-",
    precioGeneral: Number(row.precio_por_mes ?? row.precio_general ?? 0) || 0,
    cantidad: row.cantidad ?? 1,
    precioTotal: row.precio_total ?? row.importe_total ?? 0,
    fechaRegistro: row.created_at
      ? new Date(row.created_at)
      : new Date(),
    fechaInicio: new Date(row.fecha_inicio),
    fechaFin: new Date(row.fecha_fin),
    mesesRenta: row.duracion_meses ?? row.meses_renta ?? 1,
    importeTotal: row.importe_total ?? row.precio_total ?? 0,
    activo: row.activo ?? true,
    usuarioRegistroId: row.usuario_registro_id ?? row.vendedor_id ?? "",
    estadoVenta: "Aceptado",
    tipoPagoId: row.tipo_pago_id ?? row.tipo_pago?.id,
  };
}

/** mes en BD 1–12 → índice 0–11 para la UI */
function mesFrontend(mesDb: unknown): number {
  const m = Number(mesDb);
  if (m >= 1 && m <= 12) return m - 1;
  return 0;
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
        ? new Date(line.fecha_inicio)
        : new Date();
      const ff = line.fecha_fin ? new Date(line.fecha_fin) : fi;
      const imp = Number(line.importe) || 0;
      return {
        id: String(line.venta_id ?? ""),
        pantallasIds: pids,
        itemsVenta: pids.map((pantallaId) => ({
          pantallaId,
          sinDescuento: false,
        })),
        colaboradorId: colaboradorId || "",
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
      ? ventas.map(mapVentaNested)
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
