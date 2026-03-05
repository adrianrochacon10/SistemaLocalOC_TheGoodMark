// src/components/ventas/components/EstadisticasVentas.tsx
import React from "react";
import { RegistroVenta } from "../../../types";
import { formatearMoneda } from "../../../utils/formateoMoneda";

interface EstadisticasVentasProps {
  ventasFiltradas: RegistroVenta[];
}

export const EstadisticasVentas: React.FC<EstadisticasVentasProps> = ({
  ventasFiltradas,
}) => (
  <div className="estadisticas">
    <div className="stat-card">
      <span className="stat-number">{ventasFiltradas.length}</span>
      <span className="stat-label">Ventas del mes</span>
    </div>
    <div className="stat-card">
      <span className="stat-number">
        {formatearMoneda(
          ventasFiltradas.reduce((sum, v) => sum + v.importeTotal, 0),
        )}
      </span>
      <span className="stat-label">Ingresos totales</span>
    </div>
  </div>
);
