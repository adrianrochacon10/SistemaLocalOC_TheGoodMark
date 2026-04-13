/**
 * Indica si el contrato de la venta solapa un mes calendario dado (duración del contrato,
 * no solo la fecha de inicio).
 *
 * @param mes - 0=Ene … 11=Dic, o -1 = cualquier mes
 * @param anio - año completo, o -1 = cualquier año
 */
export function ventaSolapaMesCalendario(
  fechaInicio: Date,
  fechaFin: Date,
  mes: number,
  anio: number,
): boolean {
  const s = new Date(
    fechaInicio.getFullYear(),
    fechaInicio.getMonth(),
    fechaInicio.getDate(),
  );
  const e = new Date(fechaFin.getFullYear(), fechaFin.getMonth(), fechaFin.getDate());
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || s > e) return false;

  if (mes >= 0 && mes <= 11 && anio >= 0) {
    const first = new Date(anio, mes, 1);
    const last = new Date(anio, mes + 1, 0, 23, 59, 59, 999);
    return s <= last && e >= first;
  }

  if (mes >= 0 && mes <= 11 && anio < 0) {
    let d = new Date(s.getFullYear(), s.getMonth(), 1);
    const endM = new Date(e.getFullYear(), e.getMonth(), 1);
    while (d <= endM) {
      if (d.getMonth() === mes) return true;
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }
    return false;
  }

  if (mes < 0 && anio >= 0) {
    const first = new Date(anio, 0, 1);
    const last = new Date(anio, 11, 31, 23, 59, 59, 999);
    return s <= last && e >= first;
  }

  return true;
}
