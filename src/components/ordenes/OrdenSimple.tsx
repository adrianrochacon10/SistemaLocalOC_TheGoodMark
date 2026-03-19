// import React, { useState } from "react";
// import { ConceptoSimple, OrdenDeCompra } from "../../types";
// import "./OrdenSimple.css";

// interface OrdenSimpleProps {
//   empresaId: string;
//   contratoId: string;
//   empresaNombre: string;
//   onGuardar: (orden: OrdenDeCompra) => void;
//   onCancel: () => void;
// }

// export const OrdenSimple: React.FC<OrdenSimpleProps> = ({
//   empresaId,
//   contratoId,
//   empresaNombre,
//   onGuardar,
//   onCancel,
// }) => {
//   const [conceptos, setConceptos] = useState<ConceptoSimple[]>([]);
//   const [formData, setFormData] = useState({
//     cliente: "",
//     precioUnitario: "",
//     cantidad: "",
//     concepto: "",
//     fechaInicio: "",
//     fechaFin: "",
//   });

//   const handleInputChange = (
//     e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
//   ) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({
//       ...prev,
//       [name]: value,
//     }));
//   };

//   const calcularImporte = (precioUnitario: number, cantidad: number) => {
//     return precioUnitario * cantidad;
//   };

//   const agregarConcepto = () => {
//     if (
//       !formData.cliente ||
//       !formData.concepto ||
//       !formData.precioUnitario ||
//       !formData.cantidad ||
//       !formData.fechaInicio ||
//       !formData.fechaFin
//     ) {
//       alert("Por favor completa todos los campos");
//       return;
//     }

//     const precioUnitario = parseFloat(formData.precioUnitario);
//     const cantidad = parseFloat(formData.cantidad);

//     if (precioUnitario <= 0 || cantidad <= 0) {
//       alert("El precio y cantidad deben ser mayores a 0");
//       return;
//     }

//     const nuevoConcepto: ConceptoSimple = {
//       id: Date.now().toString(),
//       ordenId: "",
//       concepto: `${formData.cliente} - ${formData.concepto}`,
//       precioUnitario,
//       cantidad,
//       importeTotal: calcularImporte(precioUnitario, cantidad),
//       fechaInicio: new Date(formData.fechaInicio),
//       fechaFin: new Date(formData.fechaFin),
//     };

//     setConceptos((prev) => [...prev, nuevoConcepto]);
//     setFormData({
//       cliente: "",
//       precioUnitario: "",
//       cantidad: "",
//       concepto: "",
//       fechaInicio: "",
//       fechaFin: "",
//     });
//   };

//   const eliminarConcepto = (id: string) => {
//     setConceptos((prev) => prev.filter((c) => c.id !== id));
//   };

//   const montoTotal = conceptos.reduce((total, c) => total + c.importeTotal, 0);

//   const handleGuardar = () => {
//     if (conceptos.length === 0) {
//       alert("Debes agregar al menos un concepto");
//       return;
//     }

//     const orden: OrdenDeCompra = {
//       id: Date.now().toString(),
//       empresaId,
//       contratoId,
//       tipoCliente: "simple",
//       numeroOrden: `OC-${Date.now()}`,
//       fecha: new Date(),
//       conceptos,
//       montoTotal,
//       estado: "enviada",
//     };

//     onGuardar(orden);
//     setConceptos([]);
//   };

//   return (
//     <div className="orden-simple-overlay">
//       <div className="orden-simple-container">
//         <h2>Orden de Compra Simple - {empresaNombre}</h2>

//         <div className="orden-section">
//           <h3>Agregar Cliente y Concepto</h3>

//           <div className="form-row">
//             <div className="form-group">
//               <label htmlFor="cliente">
//                 Cliente <span className="required">*</span>
//               </label>
//               <input
//                 type="text"
//                 id="cliente"
//                 name="cliente"
//                 value={formData.cliente}
//                 onChange={handleInputChange}
//                 placeholder="Nombre del cliente"
//               />
//             </div>

//             <div className="form-group">
//               <label htmlFor="concepto">
//                 Concepto <span className="required">*</span>
//               </label>
//               <input
//                 type="text"
//                 id="concepto"
//                 name="concepto"
//                 value={formData.concepto}
//                 onChange={handleInputChange}
//                 placeholder="Descripción del servicio"
//               />
//             </div>
//           </div>

//           <div className="form-row">
//             <div className="form-group">
//               <label htmlFor="precioUnitario">
//                 Precio Unitario <span className="required">*</span>
//               </label>
//               <input
//                 type="number"
//                 id="precioUnitario"
//                 name="precioUnitario"
//                 value={formData.precioUnitario}
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
//             + Agregar Concepto
//           </button>
//         </div>

//         {conceptos.length > 0 && (
//           <div className="orden-section">
//             <h3>Conceptos Agregados</h3>
//             <div className="conceptos-table">
//               <table>
//                 <thead>
//                   <tr>
//                     <th>Concepto</th>
//                     <th>Precio Unitario</th>
//                     <th>Cantidad</th>
//                     <th>Importe Total</th>
//                     <th>Período</th>
//                     <th>Acción</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {conceptos.map((concepto) => (
//                     <tr key={concepto.id}>
//                       <td>{concepto.concepto}</td>
//                       <td>${concepto.precioUnitario.toFixed(2)}</td>
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
