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
  const regs = orden.registrosVenta ?? [];
  if (regs.length === 0) {
    return orden.mes === mes && orden.año === año;
  }
  for (const v of regs) {
    if (registroSolapaMesCalendario(v.fechaInicio, v.fechaFin, mes, año))
      return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/*  1️⃣  Asignación de mes (misma lógica que ya tenías)               */
/* ------------------------------------------------------------------ */
export type AsignacionOrden = "actual" | "siguiente" | "otro_mes";

export function asignarOrdenMes(
  venta: RegistroVenta,
  mesOrden: number,
  añoOrden: number,
  diaCorte: number = 5,
): AsignacionOrden {
  // Aseguramos que trabajemos con objetos Date (las APIs a veces devuelven strings)
  const fechaInicio = new Date(venta.fechaInicio);
  const fechaRegistro = new Date(venta.fechaRegistro);
  const fechaFin = new Date(venta.fechaFin);

  const fechaCorte = new Date(añoOrden, mesOrden, diaCorte, 0, 0, 0);

  const iniciaEnMes =
    fechaInicio.getMonth() === mesOrden &&
    fechaInicio.getFullYear() === añoOrden;

  const mesSig = new Date(añoOrden, mesOrden + 1, 1);
  const iniciaEnMesSiguiente =
    fechaInicio.getMonth() === mesSig.getMonth() &&
    fechaInicio.getFullYear() === mesSig.getFullYear();

  if (iniciaEnMes) return fechaRegistro < fechaCorte ? "actual" : "siguiente";
  if (iniciaEnMesSiguiente)
    return fechaRegistro < fechaCorte ? "actual" : "otro_mes";

  return "otro_mes";
}

/* ------------------------------------------------------------------ */
/*  2️⃣  Obtener las ventas que pertenecen a un mes (con corte)       */
/* ------------------------------------------------------------------ */
export function obtenerRegistrosDelMes(
  ventas: RegistroVenta[],
  mes: number, // 0‑11
  año: number,
  diaCorte: number = 5,
): RegistroVenta[] {
  return ventas.filter((v) => {
    const fechaInicio = new Date(v.fechaInicio);
    const fechaRegistro = new Date(v.fechaRegistro);
    const fechaFin = new Date(v.fechaFin);

    const inicioEnMes =
      fechaInicio.getMonth() === mes && fechaInicio.getFullYear() === año;
    const mesSig = new Date(año, mes + 1, 1);
    const iniciaEnMesSiguiente =
      fechaInicio.getMonth() === mesSig.getMonth() &&
      fechaInicio.getFullYear() === mesSig.getFullYear();

    const fechaCorte = new Date(año, mes, diaCorte, 0, 0, 0);

    if (inicioEnMes) return fechaRegistro < fechaCorte;
    if (iniciaEnMesSiguiente) return fechaRegistro < fechaCorte;
    return false;
  });
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
