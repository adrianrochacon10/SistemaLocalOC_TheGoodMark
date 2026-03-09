import { backendApi } from "./backendApi";

/**
 * Payload para registrar una venta.
 * Ajusta los nombres de columnas según tu tabla `ventas` en Supabase.
 */
export interface RegistroVentaPayload {
  pantallas_ids: string[];
  colaborador_id: string;
  producto_id?: string | null;
  vendido_a: string;
  precio_general: number;
  fecha_inicio: string;
  fecha_fin: string;
  meses_renta: number;
  importe_total: number;
  usuario_registro_id?: string;
}

/**
 * Registra una venta a través del backend Express (`/api/ventas`),
 * que a su vez guarda en Supabase.
 */
export async function registrarVenta(payload: RegistroVentaPayload) {
  try {
    const data = await backendApi.post("/api/ventas", {
      ...payload,
      activo: true,
    });
    return { data, error: null as Error | null };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e : new Error("Error al registrar la venta"),
    };
  }
}
