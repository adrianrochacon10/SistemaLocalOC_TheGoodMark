import { RegistroVenta, OrdenDeCompra, ConfiguracionEmpresa } from "../types";

/**
 * Obtiene los registros de venta activos en un mes específico
 * Recalcula el importe basado en los días activos en ese mes
 */
export const obtenerRegistrosDelMes = (
  ventasRegistradas: RegistroVenta[],
  mes: number,
  año: number
): RegistroVenta[] => {
  return ventasRegistradas.filter((v) => {
    if (!v.activo) return false;

    const fechaInicio = new Date(v.fechaInicio);
    const fechaFin = new Date(v.fechaFin);

    // Verificar si hay overlap con el mes especificado
    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);

    return fechaInicio <= ultimoDia && fechaFin >= primerDia;
  });
};

/**
 * Genera una orden de compra automáticamente para el mes actual
 * Filtra los registros de venta que sean activos en el mes
 */
export const generarOrdenDelMes = (
  ventasRegistradas: RegistroVenta[],
  config: ConfiguracionEmpresa,
  usuarioExportoId: string,
  mes?: number,
  año?: number
): OrdenDeCompra => {
  // Si no se especifican mes/año, usar el actual
  const hoy = new Date();
  const mesTarget = mes !== undefined ? mes : hoy.getMonth();
  const añoTarget = año !== undefined ? año : hoy.getFullYear();

  // Obtener registros del mes
  const registrosDelMes = obtenerRegistrosDelMes(ventasRegistradas, mesTarget, añoTarget);

  // Calcular subtotal - ahora es la suma directa de precios generales
  // (el precio ya estaba establecido para todo el período de renta)
  const subtotal = registrosDelMes.reduce((total, v) => {
    return total + v.precioGeneral;
  }, 0);

  // Calcular IVA
  const ivaPercentaje = config.ivaPercentaje || 16;
  const ivaTotal = subtotal * (ivaPercentaje / 100);

  // Calcular total
  const total = subtotal + ivaTotal;

  // Generar número de orden único
  const numeroOrden = `OC-${añoTarget}${String(mesTarget + 1).padStart(2, "0")}-${Date.now().toString(36).toUpperCase()}`;

  const orden: OrdenDeCompra = {
    id: "o" + Date.now(),
    numeroOrden,
    mes: mesTarget,
    año: añoTarget,
    fecha: new Date(),
    registrosVenta: registrosDelMes,
    subtotal: Math.round(subtotal * 100) / 100,
    ivaPercentaje,
    ivaTotal: Math.round(ivaTotal * 100) / 100,
    total: Math.round(total * 100) / 100,
    estado: "generada",
    usuarioExportoId,
    fechaExportacion: new Date(),
  };

  return orden;
};

/**
 * Verifica si hoy es el primer día del mes
 */
export const esPrimerDiaDelMes = (): boolean => {
  return new Date().getDate() === 1;
};

/**
 * Verifica si ya existe una orden generada para un mes específico
 */
export const existeOrdenParaMes = (
  ordenes: OrdenDeCompra[],
  mes: number,
  año: number
): boolean => {
  return ordenes.some((o) => o.mes === mes && o.año === año);
};

/**
 * Obtiene la orden generada para un mes específico si existe
 */
export const obtenerOrdenDelMes = (
  ordenes: OrdenDeCompra[],
  mes: number,
  año: number
): OrdenDeCompra | undefined => {
  return ordenes.find((o) => o.mes === mes && o.año === año);
};

/**
 * Obtiene todas las órdenes de un año
 */
export const obtenerOrdenesDelAño = (
  ordenes: OrdenDeCompra[],
  año: number
): OrdenDeCompra[] => {
  return ordenes.filter((o) => o.año === año).sort((a, b) => a.mes - b.mes);
};

/**
 * Calcula si una venta está activa en un mes específico
 */
export const calcularMesesActivosEnMes = (
  venta: RegistroVenta,
  mes: number,
  año: number
): number => {
  const fechaInicio = new Date(venta.fechaInicio);
  const fechaFin = new Date(venta.fechaFin);

  const primerDia = new Date(año, mes, 1);
  const ultimoDia = new Date(año, mes + 1, 0);

  // Verificar si hay overlap
  if (fechaInicio > ultimoDia || fechaFin < primerDia) {
    return 0; // No hay overlap
  }

  // Si la venta cubre todo el mes
  if (fechaInicio <= primerDia && fechaFin >= ultimoDia) {
    return 1; // 1 mes completo
  }

  // Overlap parcial (simplificar a proporción de mes)
  return 0.5; // Media proporción de mes
};

/**
 * Recalcula el importe de una venta basado en los meses activos (para referencia histórica)
 */
export const recalcularImportePorMes = (
  venta: RegistroVenta,
  mes: number,
  año: number
): number => {
  // Con el nuevo modelo, el precio es general, pero si es necesario calcular
  // qué proporción del precio corresponde a este mes:
  const mesesActivos = calcularMesesActivosEnMes(venta, mes, año);
  if (mesesActivos === 0) return 0;
  if (mesesActivos === 1) return venta.precioGeneral;

  // Para rentals parciales, distribuir proporcionalmente
  return venta.precioGeneral * mesesActivos;
};
