export interface VentaColaborador {
  id: string;
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  pantalla_id?: string | null;
  producto_id?: string | null;
  pantalla?: { id: string; nombre: string } | null;
  producto?: { id: string; nombre: string; precio: number } | null;
}

/** @deprecated usar VentaColaborador */
export type VentaCliente = VentaColaborador;

export interface VentaPantalla {
  id: string;
  nombre: string;
}

export interface VentaProducto {
  id: string;
  nombre: string;
  precio: number;
}

export interface VentaTipoPago {
  id: string;
  nombre: string;
}

export interface Venta {
  id: string;
  colaborador: VentaColaborador;
  /** @deprecated API antigua */
  cliente?: VentaColaborador;
  pantalla?: VentaPantalla | null;
  producto?: VentaProducto | null;
  tipo_pago?: VentaTipoPago | null;
  cantidad: number;
  precio_unitario_manual?: number | null;
  precio_total: number;
  estado: "prospecto" | "aceptado" | "rechazado";
  fecha_inicio: string;
  fecha_fin: string;
  duracion_meses: number;
  comisiones?: number | null;
  precio_base?: number;
  tipo_pago_aplicado?: string;
  fuente_precio?: string | null;
  colaborador_id?: string;
}
