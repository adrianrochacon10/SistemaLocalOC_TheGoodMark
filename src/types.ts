// types/index.ts - COMPLETO

// Usuarios del sistema
export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: "admin" | "usuario";
  activo: boolean;
}

// Pantallas propiedad de la empresa
export interface Pantalla {
  id: string;
  nombre: string;
  ubicacion?: string;
  plaza?: string;
  precioUnitario: number;
  activa: boolean;
  fechaCreacion: Date;
}

// Clientes (pueden tener 1 o varias pantallas)
export interface Colaborador {
  id: string;
  nombre: string;
  alias?: string;
  telefono?: string;
  email?: string;
  color?: string;
  activo: boolean;
  fechaCreacion: Date;
  tipoComision?: "porcentaje" | "ninguno" | "consideracion" | "precio_fijo";
  porcentajeSocio?: number;
}

// ✅ Empresa (usada en EmpresaForm, OrdenCompleja, OrdenSimple)
export interface Empresa {
  id: string;
  nombre: string;
  rfc?: string;
  direccion?: string;
  telefono?: string;
  contacto?: string;
  fechaCreacion: Date;
}

// Asignación de pantalla a cliente
export interface AsignacionPantalla {
  id: string;
  pantallaId: string;
  clienteId: string;
  precioUnitario: number;
  activa: boolean;
  fechaAsignacion: Date;
}

// ✅ Producto asociado a un colaborador (vallas, otros servicios, etc.)
export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  activo: boolean;
  fechaCreacion: Date;
}

// ✅ Asignación de producto a colaborador
export interface AsignacionProducto {
  id: string;
  productoId: string;
  clienteId: string;
  activa: boolean;
  fechaAsignacion: Date;
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
  clienteId: string;
  vendidoA: string;
  precioGeneral: number;
  fechaRegistro: Date;
  fechaInicio: Date;
  fechaFin: Date;
  mesesRenta: number;
  importeTotal: number;
  activo: boolean;
  usuarioRegistroId: string;
  estadoVenta?: "Aceptado" | "Rechazado" | "Prospecto";
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

  // Modelo nuevo (OrdenesMensualesNuevo)
  mes?: number;
  año?: number;
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
