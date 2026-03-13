// import React, { useState } from "react";
// import {
//   RegistroVenta,
//   Pantalla,
//   AsignacionPantalla,
//   Colaborador,
//   Usuario,
// } from "../../../types";

// interface RegistroVentaFormProps {
//   pantallas: Pantalla[];
//   asignaciones: AsignacionPantalla[];
//   clientes: Colaborador[];
//   usuarios: Usuario[]; // ← agregar para el selector de vendedor
//   usuarioActual: Usuario;
//   onRegistrarVenta: (venta: RegistroVenta) => void;
// }

// export const RegistroVentaForm: React.FC<RegistroVentaFormProps> = ({
//   asignaciones,
//   clientes,
//   usuarios,
//   usuarioActual,
//   onRegistrarVenta,
// }) => {
//   const [clienteSeleccionado, setClienteSeleccionado] = useState("");
//   const [pantallaSeleccionada, setPantallaSeleccionada] = useState("");
//   const [vendidoA, setVendidoA] = useState("");
//   const [fechaInicio, setFechaInicio] = useState("");
//   const [diasRenta, setDiasRenta] = useState(1);
//   const [vendedorId, setVendedorId] = useState("");
//   const [costos, setCostos] = useState(0);
//   const [error, setError] = useState("");

//   // ── Derivados ─────────────────────────────────────────────────────────
//   const pantallasDelCliente = asignaciones.filter(
//     (a) => a.clienteId === clienteSeleccionado && a.activa,
//   );

//   const asignacionActual = pantallasDelCliente.find(
//     (a) => a.pantallaId === pantallaSeleccionada,
//   );
//   const precioGeneral = asignacionActual?.precioUnitario ?? 0;

//   const calcularFechaFin = (): string => {
//     if (!fechaInicio) return "";
//     const fin = new Date(fechaInicio);
//     fin.setDate(fin.getDate() + diasRenta);
//     return fin.toISOString().split("T")[0];
//   };

//   const fechaFin = calcularFechaFin();
//   const importeTotal = precioGeneral * diasRenta;
//   const utilidad = importeTotal - costos;

//   const clientesConAsignaciones = clientes.filter((c) =>
//     asignaciones.some((a) => a.clienteId === c.id && a.activa),
//   );

//   // ── Registro ──────────────────────────────────────────────────────────
//   const handleRegistrarVenta = () => {
//     if (!clienteSeleccionado) {
//       setError("Selecciona un cliente");
//       return;
//     }
//     if (!pantallaSeleccionada) {
//       setError("Selecciona una pantalla");
//       return;
//     }
//     if (!vendidoA.trim()) {
//       setError("Especifica a quién se vendió");
//       return;
//     }
//     if (!fechaInicio) {
//       setError("Selecciona una fecha de inicio");
//       return;
//     }
//     if (diasRenta < 1) {
//       setError("Los días de renta deben ser al menos 1");
//       return;
//     }
//     if (precioGeneral <= 0) {
//       setError("El precio unitario debe ser mayor a 0");
//       return;
//     }

//     const venta: RegistroVenta = {
//       id: Math.random().toString(36).substr(2, 9),
//       pantallasIds: [pantallaSeleccionada], // ← string[] correcto
//       itemsVenta: [],
//       clienteId: clienteSeleccionado,
//       vendidoA: vendidoA.trim(),
//       precioGeneral, // ← nombre correcto
//       cantidad: diasRenta,
//       precioTotal: importeTotal,
//       fechaRegistro: new Date(),
//       fechaInicio: new Date(fechaInicio),
//       fechaFin: new Date(fechaFin),
//       mesesRenta: Math.ceil(diasRenta / 30),
//       importeTotal,
//       activo: true,
//       usuarioRegistroId: usuarioActual.id,
//       // ── Campos nuevos ──
//       vendedorId: vendedorId,
//       costos: costos || 0,
//     };

//     onRegistrarVenta(venta);

//     // Reset
//     setClienteSeleccionado("");
//     setPantallaSeleccionada("");
//     setVendidoA("");
//     setFechaInicio("");
//     setDiasRenta(1);
//     setVendedorId("");
//     setCostos(0);
//     setError("");
//   };

//   return (
//     <div className="form-section">
//       <h2>Registrar Nueva Venta/Renta</h2>

//       <div className="form-grid-venta">
//         {/* Cliente */}
//         <div className="form-group">
//           <label>Cliente *</label>
//           <select
//             value={clienteSeleccionado}
//             onChange={(e) => {
//               setClienteSeleccionado(e.target.value);
//               setPantallaSeleccionada("");
//               setError("");
//             }}
//             className="form-select"
//           >
//             <option value="">-- Seleccionar cliente --</option>
//             {clientesConAsignaciones.map((c) => (
//               <option key={c.id} value={c.id}>
//                 {c.nombre}
//               </option>
//             ))}
//           </select>
//         </div>

//         {/* Pantalla (solo si hay cliente) */}
//         {clienteSeleccionado && (
//           <div className="form-group">
//             <label>Pantalla *</label>
//             <select
//               value={pantallaSeleccionada}
//               onChange={(e) => {
//                 setPantallaSeleccionada(e.target.value);
//                 setError("");
//               }}
//               className="form-select"
//             >
//               <option value="">-- Seleccionar pantalla --</option>
//               {pantallasDelCliente.map((a) => (
//                 <option key={a.id} value={a.pantallaId}>
//                   Pantalla {a.pantallaId.substring(0, 8)} — $
//                   {a.precioUnitario.toFixed(2)}/día
//                 </option>
//               ))}
//             </select>
//           </div>
//         )}

//         {/* Vendido a */}
//         <div className="form-group">
//           <label>Vendido a *</label>
//           <input
//             type="text"
//             value={vendidoA}
//             onChange={(e) => setVendidoA(e.target.value)}
//             placeholder="Nombre de la empresa o persona"
//             className="form-input"
//           />
//         </div>

//         {/* Vendedor */}
//         <div className="form-group">
//           <label>Vendedor</label>
//           <select
//             value={vendedorId}
//             onChange={(e) => setVendedorId(e.target.value)}
//             className="form-select"
//           >
//             <option value="">— Sin asignar —</option>
//             {usuarios
//               .filter((u) => u.rol === "usuario")
//               .map((u) => (
//                 <option key={u.id} value={u.id}>
//                   {u.nombre}
//                 </option>
//               ))}
//           </select>
//         </div>

//         {/* Fecha inicio */}
//         <div className="form-group">
//           <label>Fecha de Inicio *</label>
//           <input
//             type="date"
//             value={fechaInicio}
//             onChange={(e) => setFechaInicio(e.target.value)}
//             className="form-input"
//           />
//         </div>

//         {/* Días de renta */}
//         <div className="form-group">
//           <label>Días de Renta *</label>
//           <input
//             type="number"
//             value={diasRenta}
//             onChange={(e) => setDiasRenta(parseInt(e.target.value) || 1)}
//             min="1"
//             className="form-input"
//           />
//         </div>

//         {/* Precio unitario (solo lectura) */}
//         <div className="form-group">
//           <label>Precio Unitario</label>
//           <input
//             type="text"
//             value={`$${precioGeneral.toFixed(2)}/día`}
//             readOnly
//             className="form-input read-only"
//           />
//         </div>

//         {/* Fecha fin (solo lectura) */}
//         <div className="form-group">
//           <label>Fecha de Fin</label>
//           <input
//             type="text"
//             value={fechaFin}
//             readOnly
//             className="form-input read-only"
//           />
//         </div>

//         {/* Costos */}
//         <div className="form-group">
//           <label>Costos de la venta</label>
//           <div className="input-prefix">
//             <span className="prefix">$</span>
//             <input
//               type="number"
//               min="0"
//               step="0.01"
//               value={costos === 0 ? "" : costos}
//               onChange={(e) => setCostos(parseFloat(e.target.value) || 0)}
//               placeholder="0.00"
//             />
//           </div>
//           {costos > 0 && (
//             <small
//               className={`campo-hint ${utilidad < 0 ? "hint-negativo" : ""}`}
//             >
//               Utilidad estimada: $
//               {utilidad.toLocaleString("es-MX", {
//                 minimumFractionDigits: 2,
//               })}
//             </small>
//           )}
//         </div>

//         {/* Importe total (solo lectura) */}
//         <div className="form-group">
//           <label>Importe Total</label>
//           <input
//             type="text"
//             value={`$${importeTotal.toFixed(2)}`}
//             readOnly
//             className="form-input read-only total"
//           />
//         </div>
//       </div>

//       {error && <div className="error-message">{error}</div>}

//       <button className="btn btn-primary btn-lg" onClick={handleRegistrarVenta}>
//         ✔️ Registrar Venta
//       </button>
//     </div>
//   );
// };
