//Archivo para formateos de fechas y calculo de fecha fin

export const stringAFecha = (fechaString: string): Date => {
  const [año, mes, día] = fechaString.split("-").map(Number);
  return new Date(año, mes - 1, día);
};

/**
 * Fecha de calendario local desde API/BD (`date` como "YYYY-MM-DD").
 * `new Date("YYYY-MM-DD")` es medianoche UTC y en zonas como México muestra el día anterior.
 */
export function parseFechaLocalOnly(input: unknown): Date {
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

/** Valor para `<input type="date">` sin desfase UTC (p. ej. 10 feb no debe verse como 9 feb). */
export function fechaParaInputDateLocal(src: Date | string): string {
  let d: Date;
  if (typeof src === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(src.trim())) {
      return src.trim();
    }
    d = new Date(src);
  } else {
    d = src;
  }
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fechaFinAStringLocal(fin: Date): string {
  const y = fin.getFullYear();
  const m = String(fin.getMonth() + 1).padStart(2, "0");
  const day = String(fin.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const formatearFecha = (fecha: Date | string): string => {
  if (!fecha) return "-";
  let d: Date;
  if (typeof fecha === "string") {
    // Si tiene formato "YYYY-MM-DD" usa stringAFecha
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      d = stringAFecha(fecha);
    } else {
      d = new Date(fecha);
    }
  } else {
    d = fecha;
  }
  if (isNaN(d.getTime())) return String(fecha); // fallback si ya es texto legible
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const calcularFechaFin = (fechaInicio: string, mesesRenta: number): string => {
  if (!fechaInicio || !mesesRenta) return "";
  const inicio = stringAFecha(fechaInicio);
  const fin = new Date(inicio);
  fin.setMonth(fin.getMonth() + mesesRenta);
  // Período inclusive: mismo día del mes N, menos un día (ej. 20 feb → 19 mar en 1 mes).
  fin.setDate(fin.getDate() - 1);
  return fechaFinAStringLocal(fin);
};

/** Días calendario entre inicio y fin (excluye el día final tipo “checkout” si coincide con calcularFechaFinDuracion en días). */
export const diasEntreFechasInicioFin = (inicio: Date, fin: Date): number => {
  const a = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const b = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate());
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
  return Math.max(1, diff);
};

export const calcularFechaFinDuracion = (
  fechaInicio: string,
  duracion: number,
  unidad: "meses" | "dias",
): string => {
  if (!fechaInicio || !duracion) return "";
  const inicio = stringAFecha(fechaInicio);
  const fin = new Date(inicio);
  if (unidad === "dias") {
    fin.setDate(fin.getDate() + duracion);
  } else {
    fin.setMonth(fin.getMonth() + duracion);
    fin.setDate(fin.getDate() - 1);
  }
  return fechaFinAStringLocal(fin);
};
