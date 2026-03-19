import { backendApi } from "./backendApi";

/**
 * Payload para registrar una venta.
 * Coincide con el formato esperado por el backend /api/ventas.
 */
export interface RegistroVentaPayload {
  colaborador_id: string;
  /** prospecto | aceptado | rechazado */
  estado_venta: string;
  /** alias que el backend aún acepta */
  estado?: string;
  fecha_inicio: string;
  fecha_fin: string;
  duracion_meses: number;
  tipo_pago_id?: string | null;
  client_name?: string | null;
  precio_por_mes?: number | null;
  costos?: number | null;
  utilidad_neta?: number | null;
  comisiones?: number | null;
}

/**
 * Registra una venta vía `/api/ventas` (precio_total desde producto del colaborador).
 */
export async function registrarVenta(payload: RegistroVentaPayload) {
  try {
    const data = await backendApi.post("/api/ventas", payload);
    return { data, error: null as Error | null };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e : new Error("Error al registrar la venta"),
    };
  }
}
