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
  pantallaId: string;
  /** Color UI (filtros, chips); opcional. */
  color?: string;
  activo?: boolean;
  // tipoPdf?: 1 | 2;
  tipoComision?: "porcentaje" | "ninguno" | "consideracion" | "precio_fijo";
  /** Nombre legible de `tipo_pago` (fallback si `tipoComision` no viene en API). */
  tipoPagoNombre?: string;
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
  productoIds?: string[];
  productoNombre?: string;
  productoPrecioMensual?: number;
  /** Total mensual de producto en el contrato (solo UI orden); el numerador usa `productoPrecioMensual` ajustado por selección. */
  productoPrecioMensualContrato?: number;
  productoIncluidoEnOrden?: boolean;
  precioBaseMensualOrden?: number;
  precioPantallasMensual?: number;
  pantallasDetalle?: Array<{
    pantallaId: string;
    nombre?: string;
    precioMensual?: number;
  }>;
  codigoEdicion?: string;
  fuenteOrigen?: string;
  vendidoA: string;
  precioGeneral: number;
  cantidad: number;
  precioTotal: number;
  fechaRegistro: Date;
  fechaInicio: Date;
  fechaFin: Date;
  mesesRenta: number;
  duracionUnidad?: "meses" | "dias";
  importeTotal: number;
  /** Precio total del contrato en BD; en líneas de orden a veces `precioTotal` es solo la porción del mes. */
  precioTotalContrato?: number;
  activo: boolean;
  usuarioRegistroId: string;
  estadoVenta?: "Aceptado" | "Rechazado" | "Prospecto";
  tipoPagoId?: string;
  vendedorId?: string;
  costos?: number;
  costoVenta?: number;
  /** Persistida en BD; gráficas y KPI usan suma en ventas aceptadas. */
  utilidadNeta?: number;
  comision?: number;
  comisionPorcentaje?: number;
  identificadorVenta?: string;
  /** % del socio (renta); distinto de la comisión de venta. */
  porcentajeSocio?: number;
  gastosAdicionales?: number;
  /** 1-based: mes del contrato o día (tarifa por días) donde aplica el gasto adicional (gráficas). Opcional si ya va en notas. */
  gastoAdicionalMesIndice?: number;
  /** true si `gastoAdicionalMesIndice` es día 1..N desde fecha inicio; false = mes contractual. */
  gastoAdicionalEnDias?: boolean;
  /** En líneas de orden: si los gastos adicionales de la venta entraron en el importe. */
  gastosIncluidosEnOrden?: boolean;
  /** `false`: no descontar el % del socio en importe de OC/PDF. */
  aplicarPorcentajeSocioEnOrden?: boolean;
  pagoConsiderar?: number;
  consideracionMonto?: number;
  notas?: string;
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
  /** Respaldo desde GET /ordenes (`colaborador` embebido) si la lista de clientes no trae aún el socio. */
  colaboradorTipoComision?: Colaborador["tipoComision"];
  colaboradorTipoPagoNombre?: string;
  colaboradorPorcentajeSocio?: number;

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
  /** PDF / pie de página */
  sitioWeb?: string;
  /** Datos bancarios en PDF (opcional; si faltan se muestran guiones) */
  bancoTitular?: string;
  bancoNombre?: string;
  bancoTarjeta?: string;
  bancoCuenta?: string;
  bancoClabe?: string;
  diaCorteOrdenes?: number;
  habilitarPrecioPorDia?: boolean;
  tarifasDias?: Array<{ dias: number; precio: number }>;
}
