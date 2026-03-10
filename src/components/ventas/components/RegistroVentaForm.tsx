// src/components/ventas/RegistroVentaForm.tsx
import React, { useState } from "react";
import {
  RegistroVenta,
  Pantalla,
  AsignacionPantalla,
  Colaborador,
  Usuario,
} from "../../../types";

interface RegistroVentaFormProps {
  pantallas: Pantalla[];
  asignaciones: AsignacionPantalla[];
  clientes: Colaborador[];
  usuarioActual: Usuario;
  onRegistrarVenta: (venta: RegistroVenta) => void;
}

export const RegistroVentaForm: React.FC<RegistroVentaFormProps> = ({
  asignaciones,
  clientes,
  usuarioActual,
  onRegistrarVenta,
}) => {
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>("");
  const [pantallaSeleccionada, setPantallaSeleccionada] = useState<string>("");
  const [vendidoA, setVendidoA] = useState<string>("");
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [diasRenta, setDiasRenta] = useState<number>(1);
  const [error, setError] = useState<string>("");

  const pantallasDelCliente = asignaciones.filter(
    (a) => a.clienteId === clienteSeleccionado && a.activa,
  );

  const asignacionActual = pantallasDelCliente.find(
    (a) => a.pantallaId === pantallaSeleccionada,
  );
  const precioUnitario = asignacionActual?.precioUnitario || 0;

  const calcularFechaFin = () => {
    if (!fechaInicio) return "";
    const inicio = new Date(fechaInicio);
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + diasRenta);
    return fin.toISOString().split("T")[0];
  };

  const fechaFin = calcularFechaFin();
  const importeTotal = precioUnitario * diasRenta;

  const clientesConAsignaciones = clientes.filter((c) =>
    asignaciones.some((a) => a.clienteId === c.id && a.activa),
  );

  const handleRegistrarVenta = () => {
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
      pantallasIds: pantallaSeleccionada,
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

    setClienteSeleccionado("");
    setPantallaSeleccionada("");
    setVendidoA("");
    setFechaInicio("");
    setDiasRenta(1);
    setError("");
  };

  return (
    <div className="form-section">
      <h2>Registrar Nueva Venta/Renta</h2>

      <div className="form-grid-venta">
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

        <div className="form-group">
          <label>Fecha de Inicio *</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="form-input"
          />
        </div>

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

        <div className="form-group">
          <label>Precio Unitario</label>
          <input
            type="text"
            value={`$${precioUnitario.toFixed(2)}/día`}
            readOnly
            className="form-input read-only"
          />
        </div>

        <div className="form-group">
          <label>Fecha de Fin</label>
          <input
            type="text"
            value={fechaFin}
            readOnly
            className="form-input read-only"
          />
        </div>

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
  );
};
