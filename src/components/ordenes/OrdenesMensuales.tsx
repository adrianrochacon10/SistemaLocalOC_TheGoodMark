// import React, { useState } from "react";
// import {
//   OrdenDeCompra,
//   ConfiguracionEmpresa,
//   Usuario,
//   RegistroVenta,
// } from "../../types";
// import { generarOrdenDelMes } from "../../utils/ordenUtils";
// import "./OrdenesMensuales.css";

// interface OrdenesMensualesProps {
//   ordenes: OrdenDeCompra[];
//   ventasRegistradas: RegistroVenta[];
//   config: ConfiguracionEmpresa;
//   usuarioActual: Usuario;
//   onGenerarOrden: (orden: OrdenDeCompra) => void;
// }

// export const OrdenesMensuales: React.FC<OrdenesMensualesProps> = ({
//   ordenes,
//   ventasRegistradas,
//   config,
//   usuarioActual,
//   onGenerarOrden,
// }) => {
//   const [ordenSeleccionada, setOrdenSeleccionada] = useState<string>("");
//   const [mostrarDetalles, setMostrarDetalles] = useState<boolean>(false);

//   const handleGenerarOrdenActual = () => {
//     const nuevaOrden = generarOrdenDelMes(
//       ventasRegistradas,
//       config,
//       usuarioActual.id,
//     );
//     onGenerarOrden(nuevaOrden);
//     alert(`Orden generada: ${nuevaOrden.numeroOrden}`);
//   };

//   const orden = ordenes.find((o) => o.id === ordenSeleccionada);

//   const formatearCurrency = (valor: number) => {
//     return new Intl.NumberFormat("es-MX", {
//       style: "currency",
//       currency: "MXN",
//     }).format(valor);
//   };

//   const formatearFecha = (fecha: Date) => {
//     return new Date(fecha).toLocaleDateString("es-MX");
//   };

//   const obtenerNombreMes = (mes: number, año: number) => {
//     return new Date(año, mes).toLocaleDateString("es-MX", {
//       month: "long",
//       year: "numeric",
//     });
//   };

//   const ordenesActivas = ordenes.filter((o) => o.estado === "generada");

//   return (
//     <div className="ordenes-mensuales">
//       <div className="header-section">
//         <h2>📋 Órdenes de Compra Mensuales</h2>
//         <button
//           className="btn btn-primary btn-lg"
//           onClick={handleGenerarOrdenActual}
//         >
//           ➕ Generar Orden del Mes
//         </button>
//       </div>

//       <div className="main-grid">
//         {/* Panel de órdenes */}
//         <div className="ordenes-panel">
//           <h3>Órdenes Generadas ({ordenesActivas.length})</h3>

//           {ordenesActivas.length === 0 ? (
//             <div className="empty-state">
//               <p>No hay órdenes generadas</p>
//               <p className="text-small">
//                 Crea una nueva orden haciendo clic en el botón de arriba
//               </p>
//             </div>
//           ) : (
//             <div className="ordenes-list">
//               {ordenesActivas.map((o) => (
//                 <div
//                   key={o.id}
//                   className={`orden-item ${ordenSeleccionada === o.id ? "active" : ""}`}
//                   onClick={() => {
//                     setOrdenSeleccionada(o.id);
//                     setMostrarDetalles(true);
//                   }}
//                 >
//                   <div className="orden-item-header">
//                     <div>
//                       <h4>{o.numeroOrden}</h4>
//                       <p>
//                         {obtenerNombreMes(
//                           o.mes ?? 0,
//                           o.año ?? new Date().getFullYear(),
//                         )}
//                       </p>
//                     </div>
//                     <div className="orden-total">
//                       {formatearCurrency(o.total ?? 0)}
//                     </div>
//                   </div>
//                   <div className="orden-item-meta">
//                     <span className="badge badge-success">
//                       {(o.registrosVenta ?? []).length} registros
//                     </span>
//                     <span className="badge badge-info">{o.estado}</span>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>

//         {/* Panel de detalles */}
//         {mostrarDetalles && orden && (
//           <div
//             className="modal-overlay"
//             onClick={() => setMostrarDetalles(false)}
//           >
//             <div
//               className="modal-contenido"
//               onClick={(e) => e.stopPropagation()}
//             >
//               <div className="modal-header">
//                 <h3>Detalle de Orden {orden.numeroOrden}</h3>
//                 <button
//                   className="modal-close"
//                   onClick={() => setMostrarDetalles(false)}
//                 >
//                   ✕
//                 </button>
//               </div>
//               <div className="modal-body">
//                 <p>
//                   <strong>Mes:</strong>{" "}
//                   {obtenerNombreMes(
//                     orden.mes ?? 0,
//                     orden.año ?? new Date().getFullYear(),
//                   )}
//                 </p>
//                 <p>
//                   <strong>Subtotal:</strong>{" "}
//                   {formatearCurrency(orden.subtotal ?? 0)}
//                 </p>
//                 <p>
//                   <strong>IVA:</strong> {formatearCurrency(orden.ivaTotal ?? 0)}
//                 </p>
//                 <p>
//                   <strong>Total:</strong> {formatearCurrency(orden.total ?? 0)}
//                 </p>
//                 <ul>
//                   {(orden.registrosVenta ?? []).map((venta) => (
//                     <li key={venta.id}>
//                       {venta.vendidoA} - {formatearCurrency(venta.importeTotal)}
//                     </li>
//                   ))}
//                 </ul>
//               </div>
//               <div className="modal-footer">
//                 <button
//                   className="btn btn-outline"
//                   onClick={() => setMostrarDetalles(false)}
//                 >
//                   Cerrar
//                 </button>
//               </div>
//             </div>
//           </div>
//         )}

//         {!mostrarDetalles && (
//           <div className="placeholder">
//             <p>Selecciona una orden para ver sus detalles</p>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };
