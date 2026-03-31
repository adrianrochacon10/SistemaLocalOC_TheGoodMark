import { backendApi } from "./backendApi";

export interface RegistroVentaPayload {
  colaborador_id: string;
  pantallas_ids: string[]; // ✅ array de pantallas
  pantalla_id?: string | null; // ✅ opcional, por compatibilidad
  producto_id?: string | null;
  producto_ids?: string[];
  cantidad?: number;
  precio_unitario_manual?: number | null;
  tipo_pago_id?: string | null;
  estado: string;
  fecha_inicio: string;
  fecha_fin: string;
  duracion_meses: number;
  vendido_a?: string;
  vendedor_id?: string | null;
  importe_total?: number;
  pago_considerar?: number;
  costos?: number;
  comision?: number;
  comision_porcentaje?: number;
  porcentaje_socio?: number;
  gastos_adicionales?: number;
  costos_mes?: number;
  comision_mes?: number;
  costos_total?: number;
  comision_total?: number;
  notas?: string | null;
  fuente_origen?: string | null;
}

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
