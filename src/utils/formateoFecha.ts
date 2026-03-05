//Archivo para formateos de fechas y calculo de fecha fin

export const stringAFecha = (fechaString: string): Date => {
  const [año, mes, día] = fechaString.split("-").map(Number);
  return new Date(año, mes - 1, día);
};

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
  return fin.toISOString().split("T")[0];
};
