// types/index.ts - COMPLETO

// Usuarios del sistema
export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: "admin" | "usuario" | "vendedor";
  activo: boolean;
}

// Pantallas propiedad de la empresa
export interface Pantalla {
  id: string;
  nombre: string;
  ubicacion?: string;
  activa: boolean;
  fechaCreacion: Date;
  /** Precio mensual de catálogo (si existe en BD) para prorratear órdenes por pantalla */
  precio?: number;
}

export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  activo: boolean;
  fechaCreacion: Date;
}

// Colaboradores
export interface Colaborador {
  id: string;
  nombre: string;
  alias?: string;
  telefono?: string;
  email?: string;
  productoId: string;
  tipoPagoId?: string;
  fechaCreacion: Date;
  pantallaId: string,
  // color?: string;
  // tipoPdf?: 1 | 2;
  // activo: boolean;
  tipoComision?: "porcentaje" | "ninguno" | "consideracion" | "precio_fijo";
  porcentajeSocio?: number;
}

// Asignación de pantalla a cliente
export interface AsignacionPantalla {
  id: string;
  pantallaId: string;
  clienteId: string;
  activa: boolean;
  fechaAsignacion: Date;
}

export interface AsignacionProductoExtra {
  id: string;
  clienteId: string;
  productoId: string;
  precioUnitario: number;
  activo: boolean;
  fechaAsignacion: Date;
  // opcionalmente precio, notas, etc.
}

export interface ItemVenta {
  pantallaId: string;
  sinDescuento: boolean;
}

// Registro de venta/renta de pantalla
export interface RegistroVenta {
  id: string;
  pantallasIds: string[];
  itemsVenta: ItemVenta[];
  colaboradorId: string;
  productoId?: string | null;
  vendidoA: string;
  precioGeneral: number;
  cantidad: number;
  precioTotal: number;
  fechaRegistro: Date;
  fechaInicio: Date;
  fechaFin: Date;
  mesesRenta: number;
  importeTotal: number;
  activo: boolean;
  usuarioRegistroId: string;
  estadoVenta?: "Aceptado" | "Rechazado" | "Prospecto";
  tipoPagoId?: string;
  vendedorId?: string;
  costos?: number;
  comision?: number;
  pagoConsiderar?: number;
}

// ✅ Concepto para OrdenCompleja
export interface ConceptoComplejo {
  id: string;
  ordenId: string;
  tipoServicio: "pantalla" | "publicidad" | "exhibicion";
  descripcion: string;
  pantallas?: string[];
  montoProporcional: number;
  cantidad: number;
  importeTotal: number;
  fechaInicio: Date;
  fechaFin: Date;
}

// ✅ Concepto para OrdenSimple
export interface ConceptoSimple {
  id: string;
  ordenId: string;
  concepto: string;
  precioUnitario: number;
  cantidad: number;
  importeTotal: number;
  fechaInicio: Date;
  fechaFin: Date;
}

// Orden de Compra (unificada para ambos modelos)
export interface OrdenDeCompra {
  id: string;
  numeroOrden: string;
  fecha: Date;
  estado: "borrador" | "generada" | "descargada" | "enviada";

  /** Colaborador dueño de la orden (órdenes por socio en BD) */
  colaboradorId?: string;
  colaboradorNombre?: string;

  // Modelo nuevo (OrdenesMensualesNuevo)
  mes?: number;
  año?: number;
  fechaCorte?: Date;
  registrosVenta?: RegistroVenta[];
  subtotal?: number;
  ivaPercentaje?: number;
  ivaTotal?: number;
  total?: number;
  usuarioExportoId?: string;
  fechaExportacion?: Date;

  // Modelo anterior (OrdenCompleja / OrdenSimple)
  empresaId?: string;
  contratoId?: string;
  tipoCliente?: "simple" | "complejo";
  conceptos?: ConceptoComplejo[] | ConceptoSimple[];
  montoTotal?: number;
}

// Configuración de empresa
export interface ConfiguracionEmpresa {
  id: string;
  nombreEmpresa: string;
  rfc?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  ivaPercentaje: number;
  logo?: string;
  activo: boolean;
}
