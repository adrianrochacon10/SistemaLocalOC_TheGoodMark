import React, { useState } from "react";
import { RegistroVenta, Pantalla, AsignacionPantalla, Cliente, Usuario } from "../../types";
import "./RegistroVentas.css";

interface RegistroVentasProps {
  pantallas: Pantalla[];
  asignaciones: AsignacionPantalla[];
  clientes: Cliente[];
  ventasRegistradas: RegistroVenta[];
  usuarioActual: Usuario;
  onRegistrarVenta: (venta: RegistroVenta) => void;
}

export const RegistroVentas: React.FC<RegistroVentasProps> = ({
  asignaciones,
  clientes,
  ventasRegistradas,
  usuarioActual,
  onRegistrarVenta,
}) => {
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>("");
  const [pantallaSeleccionada, setPantallaSeleccionada] = useState<string>("");
  const [vendidoA, setVendidoA] = useState<string>("");
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [diasRenta, setDiasRenta] = useState<number>(1);
  const [error, setError] = useState<string>("");

  // Filtrar pantallas asignadas al cliente seleccionado
  const pantallasDelCliente = asignaciones.filter(
    (a) => a.clienteId === clienteSeleccionado && a.activa
  );

  // Obtener precio unitario
  const asignacionActual = pantallasDelCliente.find(
    (a) => a.pantallaId === pantallaSeleccionada
  );
  const precioUnitario = asignacionActual?.precioUnitario || 0;

  // Calcular fecha fin y importe
  const calcularFechaFin = () => {
    if (!fechaInicio) return "";
    const inicio = new Date(fechaInicio);
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + diasRenta);
    return fin.toISOString().split("T")[0];
  };

  const fechaFin = calcularFechaFin();
  const importeTotal = precioUnitario * diasRenta;

  const obtenerNombreCliente = (id: string) => clientes.find((c) => c.id === id)?.nombre || "";
  const obtenerNombrePantalla = (id: string) => {
    const asignacion = asignaciones.find((a) => a.pantallaId === id);
    // Buscar la pantalla en una tabla (no la tenemos aquí, pero podemos usar el id)
    return `Pantalla ${id.substring(0, 8)}`;
  };

  const handleRegistrarVenta = () => {
    // Validaciones
    if (!clienteSeleccionado) {
      setError("Selecciona un cliente");
      return;
    }
    if (!pantallaSeleccionada) {
      setError("Selecciona una pantalla");
      return;
    }
    if (!vendidoA.trim()) {
      setError("Especifica a quién se vendió");
      return;
    }
    if (!fechaInicio) {
      setError("Selecciona una fecha de inicio");
      return;
    }
    if (diasRenta < 1) {
      setError("Los días de renta deben ser al menos 1");
      return;
    }
    if (precioUnitario <= 0) {
      setError("El precio unitario debe ser mayor a 0");
      return;
    }

    const venta: RegistroVenta = {
      id: Math.random().toString(36).substr(2, 9),
      pantallaId: pantallaSeleccionada,
      clienteId: clienteSeleccionado,
      vendidoA: vendidoA.trim(),
      precioUnitario,
      fechaRegistro: new Date(),
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      diasRenta,
      importeTotal,
      activo: true,
      usuarioRegistroId: usuarioActual.id,
    };

    onRegistrarVenta(venta);

    // Limpiar formulario
    setClienteSeleccionado("");
    setPantallaSeleccionada("");
    setVendidoA("");
    setFechaInicio("");
    setDiasRenta(1);
    setError("");
  };

  const clientesConAsignaciones = clientes.filter((c) =>
    asignaciones.some((a) => a.clienteId === c.id && a.activa)
  );

  const ventasHoy = ventasRegistradas.filter(
    (v) =>
      new Date(v.fechaRegistro).toDateString() === new Date().toDateString() && v.activo
  );

  const ventasDelCliente = ventasRegistradas.filter(
    (v) => v.clienteId === clienteSeleccionado && v.activo
  );

  return (
    <div className="registro-ventas">
      <div className="registro-container">
        <div className="form-section">
          <h2>Registrar Nueva Venta/Renta</h2>

          <div className="form-grid-venta">
            {/* Cliente */}
            <div className="form-group">
              <label>Cliente *</label>
              <select
                value={clienteSeleccionado}
                onChange={(e) => {
                  setClienteSeleccionado(e.target.value);
                  setPantallaSeleccionada("");
                  setError("");
                }}
                className="form-select"
              >
                <option value="">-- Seleccionar cliente --</option>
                {clientesConAsignaciones.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Pantalla */}
            {clienteSeleccionado && (
              <div className="form-group">
                <label>Pantalla *</label>
                <select
                  value={pantallaSeleccionada}
                  onChange={(e) => {
                    setPantallaSeleccionada(e.target.value);
                    setError("");
                  }}
                  className="form-select"
                >
                  <option value="">-- Seleccionar pantalla --</option>
                  {pantallasDelCliente.map((a) => (
                    <option key={a.id} value={a.pantallaId}>
                      Pantalla {a.pantallaId.substring(0, 8)} - $
                      {a.precioUnitario.toFixed(2)}/día
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Vendido a */}
            <div className="form-group">
              <label>Vendido a *</label>
              <input
                type="text"
                value={vendidoA}
                onChange={(e) => setVendidoA(e.target.value)}
                placeholder="Nombre de la empresa o persona"
                className="form-input"
              />
            </div>

            {/* Fecha inicio */}
            <div className="form-group">
              <label>Fecha de Inicio *</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="form-input"
              />
            </div>

            {/* Días de renta */}
            <div className="form-group">
              <label>Días de Renta *</label>
              <input
                type="number"
                value={diasRenta}
                onChange={(e) => setDiasRenta(parseInt(e.target.value) || 1)}
                min="1"
                className="form-input"
              />
            </div>

            {/* Precio unitario (solo lectura) */}
            <div className="form-group">
              <label>Precio Unitario</label>
              <input
                type="text"
                value={`$${precioUnitario.toFixed(2)}/día`}
                readOnly
                className="form-input read-only"
              />
            </div>

            {/* Fecha fin (solo lectura) */}
            <div className="form-group">
              <label>Fecha de Fin</label>
              <input
                type="text"
                value={fechaFin}
                readOnly
                className="form-input read-only"
              />
            </div>

            {/* Importe total (solo lectura) */}
            <div className="form-group">
              <label>Importe Total</label>
              <input
                type="text"
                value={`$${importeTotal.toFixed(2)}`}
                readOnly
                className="form-input read-only total"
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button className="btn btn-primary btn-lg" onClick={handleRegistrarVenta}>
            ✔️ Registrar Venta
          </button>
        </div>

        <div className="stats-grid">
          {/* Ventas hoy */}
          <div className="stat-card">
            <h3>📊 Ventas Hoy</h3>
            <p className="stat-number">{ventasHoy.length}</p>
            <p className="stat-total">
              Total: ${ventasHoy.reduce((t, v) => t + v.importeTotal, 0).toFixed(2)}
            </p>
          </div>

          {/* Ventas del cliente */}
          {clienteSeleccionado && (
            <div className="stat-card">
              <h3>🏢 Ventas - {obtenerNombreCliente(clienteSeleccionado)}</h3>
              <p className="stat-number">{ventasDelCliente.length}</p>
              <p className="stat-total">
                Total: ${ventasDelCliente.reduce((t, v) => t + v.importeTotal, 0).toFixed(2)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lista de ventas registradas */}
      <div className="ventas-list-container">
        <h2>Ventas Registradas</h2>

        {ventasRegistradas.length === 0 ? (
          <div className="empty-state">
            <p>No hay ventas registradas</p>
          </div>
        ) : (
          <div className="ventas-list">
            {ventasRegistradas
              .filter((v) => v.activo)
              .sort((a, b) => new Date(b.fechaRegistro).getTime() - new Date(a.fechaRegistro).getTime())
              .slice(0, 10)
              .map((venta) => (
                <div key={venta.id} className="venta-item">
                  <div className="venta-header">
                    <h4>{obtenerNombreCliente(venta.clienteId)}</h4>
                    <span className="venta-importe">${venta.importeTotal.toFixed(2)}</span>
                  </div>
                  <div className="venta-details">
                    <p>
                      <strong>Vendido a:</strong> {venta.vendidoA}
                    </p>
                    <p>
                      <strong>Renta:</strong>{" "}
                      {new Date(venta.fechaInicio).toLocaleDateString("es-MX")} -{" "}
                      {new Date(venta.fechaFin).toLocaleDateString("es-MX")} ({venta.diasRenta} días)
                    </p>
                    <p>
                      <strong>Precio:</strong> ${venta.precioUnitario.toFixed(2)}/día
                    </p>
                    <p className="fecha-registro">
                      Registrado:{" "}
                      {new Date(venta.fechaRegistro).toLocaleDateString("es-MX",
                        { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
                      )}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
