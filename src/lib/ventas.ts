import { backendApi } from "./backendApi";

/**
 * Payload para registrar una venta.
 * Coincide con el formato esperado por el backend /api/ventas.
 */
export interface RegistroVentaPayload {
  cliente_id: string;
  pantalla_id: string;
  producto_id?: string | null;
  cantidad?: number;
  precio_unitario_manual?: number | null;
  tipo_pago_id?: string | null;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string;
  duracion_meses: number;
}

/**
 * Registra una venta a través del backend Express (`/api/ventas`),
 * que calcula precio_total según cantidad × precio y tipo de pago.
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
