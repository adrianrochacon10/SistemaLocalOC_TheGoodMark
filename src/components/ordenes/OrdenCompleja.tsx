// import React, { useState } from "react";
// import { ConceptoComplejo, OrdenDeCompra } from "../../types";
// import "./OrdenCompleja.css";

// interface OrdenComplejaProps {
//   empresaId: string;
//   contratoId: string;
//   empresaNombre: string;
//   onGuardar: (orden: OrdenDeCompra) => void;
//   onCancel: () => void;
// }

// type TipoServicio = "pantalla" | "publicidad" | "exhibicion";

// export const OrdenCompleja: React.FC<OrdenComplejaProps> = ({
//   empresaId,
//   contratoId,
//   empresaNombre,
//   onGuardar,
//   onCancel,
// }) => {
//   const [conceptos, setConceptos] = useState<ConceptoComplejo[]>([]);
//   const [formData, setFormData] = useState({
//     tipoServicio: "pantalla" as TipoServicio,
//     descripcion: "",
//     pantallas: "",
//     montoProporcional: "",
//     cantidad: "",
//     fechaInicio: "",
//     fechaFin: "",
//   });

//   const handleInputChange = (
//     e: React.ChangeEvent<
//       HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
//     >
//   ) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({
//       ...prev,
//       [name]: value,
//     }));
//   };

//   const calcularImporte = (monto: number, cantidad: number) => {
//     return monto * cantidad;
//   };

//   const agregarConcepto = () => {
//     if (
//       !formData.descripcion ||
//       !formData.montoProporcional ||
//       !formData.cantidad ||
//       !formData.fechaInicio ||
//       !formData.fechaFin
//     ) {
//       alert("Por favor completa todos los campos obligatorios");
//       return;
//     }

//     if (
//       formData.tipoServicio === "pantalla" &&
//       !formData.pantallas.trim()
//     ) {
//       alert(
//         "Debes especificar las pantallas para este concepto"
//       );
//       return;
//     }

//     const montoProporcional = parseFloat(formData.montoProporcional);
//     const cantidad = parseFloat(formData.cantidad);

//     if (montoProporcional <= 0 || cantidad <= 0) {
//       alert("El monto y cantidad deben ser mayores a 0");
//       return;
//     }

//     const nuevoConcepto: ConceptoComplejo = {
//       id: Date.now().toString(),
//       ordenId: "",
//       tipoServicio: formData.tipoServicio,
//       descripcion: formData.descripcion,
//       pantallas: formData.pantallas
//         ? formData.pantallas
//             .split(",")
//             .map((p) => p.trim())
//             .filter((p) => p)
//         : undefined,
//       montoProporcional,
//       cantidad,
//       importeTotal: calcularImporte(montoProporcional, cantidad),
//       fechaInicio: new Date(formData.fechaInicio),
//       fechaFin: new Date(formData.fechaFin),
//     };

//     setConceptos((prev) => [...prev, nuevoConcepto]);
//     setFormData({
//       tipoServicio: "pantalla",
//       descripcion: "",
//       pantallas: "",
//       montoProporcional: "",
//       cantidad: "",
//       fechaInicio: "",
//       fechaFin: "",
//     });
//   };

//   const eliminarConcepto = (id: string) => {
//     setConceptos((prev) => prev.filter((c) => c.id !== id));
//   };

//   const montoTotal = conceptos.reduce((total, c) => total + c.importeTotal, 0);

//   const getEtiquetaTipo = (tipo: TipoServicio) => {
//     const etiquetas = {
//       pantalla: "Pantalla(s)",
//       publicidad: "Publicidad",
//       exhibicion: "Exhibición",
//     };
//     return etiquetas[tipo];
//   };

//   const handleGuardar = () => {
//     if (conceptos.length === 0) {
//       alert("Debes agregar al menos un concepto");
//       return;
//     }

//     const orden: OrdenDeCompra = {
//       id: Date.now().toString(),
//       empresaId,
//       contratoId,
//       tipoCliente: "complejo",
//       numeroOrden: `OC-${Date.now()}`,
//       fecha: new Date(),
//       conceptos,
//       montoTotal,
//       estado: "borrador",
//     };

//     onGuardar(orden);
//     setConceptos([]);
//   };

//   return (
//     <div className="orden-compleja-overlay">
//       <div className="orden-compleja-container">
//         <h2>Orden de Compra Compleja - {empresaNombre}</h2>

//         <div className="orden-section">
//           <h3>Agregar Servicio</h3>

//           <div className="form-row">
//             <div className="form-group">
//               <label htmlFor="tipoServicio">
//                 Tipo de Servicio <span className="required">*</span>
//               </label>
//               <select
//                 id="tipoServicio"
//                 name="tipoServicio"
//                 value={formData.tipoServicio}
//                 onChange={handleInputChange}
//               >
//                 <option value="pantalla">Pantalla(s)</option>
//                 <option value="publicidad">Publicidad</option>
//                 <option value="exhibicion">Punto de Exhibición</option>
//               </select>
//             </div>

//             <div className="form-group">
//               <label htmlFor="descripcion">
//                 Descripción <span className="required">*</span>
//               </label>
//               <input
//                 type="text"
//                 id="descripcion"
//                 name="descripcion"
//                 value={formData.descripcion}
//                 onChange={handleInputChange}
//                 placeholder="Descripción del servicio"
//               />
//             </div>
//           </div>

//           {formData.tipoServicio === "pantalla" && (
//             <div className="form-group">
//               <label htmlFor="pantallas">
//                 Pantallas <span className="required">*</span>
//               </label>
//               <input
//                 type="text"
//                 id="pantallas"
//                 name="pantallas"
//                 value={formData.pantallas}
//                 onChange={handleInputChange}
//                 placeholder="Nombre de pantalla(s), separadas por comas"
//               />
//               <p className="form-hint">
//                 Ej: Acceso Principal, Acceso Walmart, Cafetería
//               </p>
//             </div>
//           )}

//           <div className="form-row">
//             <div className="form-group">
//               <label htmlFor="montoProporcional">
//                 Monto Proporcional a la Plaza{" "}
//                 <span className="required">*</span>
//               </label>
//               <input
//                 type="number"
//                 id="montoProporcional"
//                 name="montoProporcional"
//                 value={formData.montoProporcional}
//                 onChange={handleInputChange}
//                 placeholder="0.00"
//                 step="0.01"
//                 min="0"
//               />
//             </div>

//             <div className="form-group">
//               <label htmlFor="cantidad">
//                 Cantidad <span className="required">*</span>
//               </label>
//               <input
//                 type="number"
//                 id="cantidad"
//                 name="cantidad"
//                 value={formData.cantidad}
//                 onChange={handleInputChange}
//                 placeholder="0"
//                 step="0.01"
//                 min="0"
//               />
//             </div>
//           </div>

//           <div className="form-row">
//             <div className="form-group">
//               <label htmlFor="fechaInicio">
//                 Fecha de Inicio <span className="required">*</span>
//               </label>
//               <input
//                 type="date"
//                 id="fechaInicio"
//                 name="fechaInicio"
//                 value={formData.fechaInicio}
//                 onChange={handleInputChange}
//               />
//             </div>

//             <div className="form-group">
//               <label htmlFor="fechaFin">
//                 Fecha de Fin <span className="required">*</span>
//               </label>
//               <input
//                 type="date"
//                 id="fechaFin"
//                 name="fechaFin"
//                 value={formData.fechaFin}
//                 onChange={handleInputChange}
//               />
//             </div>
//           </div>

//           <button type="button" className="btn btn-secondary" onClick={agregarConcepto}>
//             + Agregar Servicio
//           </button>
//         </div>

//         {conceptos.length > 0 && (
//           <div className="orden-section">
//             <h3>Servicios Agregados</h3>
//             <div className="conceptos-table">
//               <table>
//                 <thead>
//                   <tr>
//                     <th>Tipo</th>
//                     <th>Descripción</th>
//                     <th>Detalles</th>
//                     <th>Monto</th>
//                     <th>Cantidad</th>
//                     <th>Importe Total</th>
//                     <th>Período</th>
//                     <th>Acción</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {conceptos.map((concepto) => (
//                     <tr key={concepto.id}>
//                       <td className="tipo-badge">
//                         {getEtiquetaTipo(concepto.tipoServicio)}
//                       </td>
//                       <td>{concepto.descripcion}</td>
//                       <td className="detalles">
//                         {concepto.pantallas && concepto.pantallas.length > 0
//                           ? concepto.pantallas.join(", ")
//                           : "-"}
//                       </td>
//                       <td>${concepto.montoProporcional.toFixed(2)}</td>
//                       <td>{concepto.cantidad}</td>
//                       <td className="importe">
//                         ${concepto.importeTotal.toFixed(2)}
//                       </td>
//                       <td className="periodo">
//                         {concepto.fechaInicio.toLocaleDateString()} -{" "}
//                         {concepto.fechaFin.toLocaleDateString()}
//                       </td>
//                       <td>
//                         <button
//                           type="button"
//                           className="btn btn-delete"
//                           onClick={() => eliminarConcepto(concepto.id)}
//                         >
//                           Eliminar
//                         </button>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>

//               <div className="resumen">
//                 <div className="total-row">
//                   <span>Monto Total:</span>
//                   <span className="amount">${montoTotal.toFixed(2)}</span>
//                 </div>
//               </div>
//             </div>
//           </div>
//         )}

//         <div className="form-actions">
//           <button
//             type="button"
//             className="btn btn-primary"
//             onClick={handleGuardar}
//             disabled={conceptos.length === 0}
//           >
//             Guardar Orden
//           </button>
//           <button type="button" className="btn btn-secondary" onClick={onCancel}>
//             Cancelar
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };
