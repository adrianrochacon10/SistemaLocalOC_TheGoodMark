// src/components/ventas/components/EstadisticasVentas.tsx
import React from "react";
import { RegistroVenta } from "../../../types";
import { formatearMoneda } from "../../../utils/formateoMoneda";

interface EstadisticasVentasProps {
  ventasFiltradas: RegistroVenta[];
}

function utilidadAceptada(v: RegistroVenta): number {
  const u = v.utilidadNeta;
  if (u != null && Number.isFinite(Number(u))) return Number(u);
  return 0;
}

export const EstadisticasVentas: React.FC<EstadisticasVentasProps> = ({
  ventasFiltradas,
}) => {
  const aceptadas = ventasFiltradas.filter((v) => v.estadoVenta === "Aceptado");
  const utilidadAceptadas = aceptadas.reduce(
    (sum, v) => sum + utilidadAceptada(v),
    0,
  );
  const comisionesAceptadas = aceptadas.reduce(
    (sum, v) => sum + (Number(v.comision ?? 0) || 0),
    0,
  );

  return (
    <div className="estadisticas">
      <div className="stat-card">
        <span className="stat-number">{ventasFiltradas.length}</span>
        <span className="stat-label">Ventas del mes</span>
      </div>
      <div className="stat-card">
        <span className="stat-number">{formatearMoneda(utilidadAceptadas)}</span>
        <span className="stat-label">Utilidad neta</span>
        <span className="stat-hint">
          Suma de utilidad neta en ventas aceptadas. Comisiones:{" "}
          {formatearMoneda(comisionesAceptadas)}
        </span>
      </div>
    </div>
  );
};
