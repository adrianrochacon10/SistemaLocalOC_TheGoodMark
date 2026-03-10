// src/components/ventas/RegistroVentasStatsYLista.tsx
import React, { useMemo, useState } from "react";
import { RegistroVenta, Colaborador } from "../../../types";

interface RegistroVentasStatsYListaProps {
  clientes: Colaborador[];
  ventasRegistradas: RegistroVenta[];
}

export const RegistroVentasStatsYLista: React.FC<
  RegistroVentasStatsYListaProps
> = ({ clientes, ventasRegistradas }) => {
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>("");

  const obtenerNombreCliente = (id: string) =>
    clientes.find((c) => c.id === id)?.nombre || "";

  const ventasHoy = useMemo(
    () =>
      ventasRegistradas.filter(
        (v) =>
          new Date(v.fechaRegistro).toDateString() ===
            new Date().toDateString() && v.activo,
      ),
    [ventasRegistradas],
  );

  const ventasDelCliente = useMemo(
    () =>
      ventasRegistradas.filter(
        (v) => v.clienteId === clienteSeleccionado && v.activo,
      ),
    [ventasRegistradas, clienteSeleccionado],
  );

  const ventasOrdenadas = useMemo(
    () =>
      ventasRegistradas
        .filter((v) => v.activo)
        .sort(
          (a, b) =>
            new Date(b.fechaRegistro).getTime() -
            new Date(a.fechaRegistro).getTime(),
        )
        .slice(0, 10),
    [ventasRegistradas],
  );

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>📊 Ventas Hoy</h3>
          <p className="stat-number">{ventasHoy.length}</p>
          <p className="stat-total">
            Total: $
            {ventasHoy.reduce((t, v) => t + v.importeTotal, 0).toFixed(2)}
          </p>
        </div>

        <div className="stat-card">
          <h3>🏢 Ventas por Cliente</h3>
          <select
            className="form-select"
            value={clienteSeleccionado}
            onChange={(e) => setClienteSeleccionado(e.target.value)}
          >
            <option value="">-- Seleccionar cliente --</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>

          {clienteSeleccionado && (
            <>
              <p className="stat-number">{ventasDelCliente.length}</p>
              <p className="stat-total">
                Total: $
                {ventasDelCliente
                  .reduce((t, v) => t + v.importeTotal, 0)
                  .toFixed(2)}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="ventas-list-container">
        <h2>Ventas Registradas</h2>

        {ventasRegistradas.length === 0 ? (
          <div className="empty-state">
            <p>No hay ventas registradas</p>
          </div>
        ) : (
          <div className="ventas-list">
            {ventasOrdenadas.map((venta) => (
              <div key={venta.id} className="venta-item">
                <div className="venta-header">
                  <h4>{obtenerNombreCliente(venta.clienteId)}</h4>
                  <span className="venta-importe">
                    ${venta.importeTotal.toFixed(2)}
                  </span>
                </div>
                <div className="venta-details">
                  <p>
                    <strong>Vendido a:</strong> {venta.vendidoA}
                  </p>
                  <p className="fecha-registro">
                    Registrado:{" "}
                    {new Date(venta.fechaRegistro).toLocaleDateString("es-MX", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
