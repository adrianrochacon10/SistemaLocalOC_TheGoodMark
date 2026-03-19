import React from "react";
import type { RegistroVenta, Cliente, Pantalla } from "../../../types";

interface Props {
  ventasRegistradas: RegistroVenta[];
  clientes: Cliente[];
  pantallas: Pantalla[];
}

export const RegistroVentasStatsYLista: React.FC<Props> = ({
  ventasRegistradas,
  clientes,
  pantallas,
}) => {
  const obtenerNombreCliente = (id: string) =>
    clientes.find((c) => c.id === id)?.nombre || "";

  return (
    <div className="ventas-list-container">
      <h2>Ventas Registradas</h2>

      {ventasRegistradas.length === 0 ? (
        <div className="empty-state">
          <p>No hay ventas registradas</p>
        </div>
      ) : (
        <div className="ventas-list">
          {ventasRegistradas.map((venta) => (
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
  );
};

