// src/components/ventas/components/EstadisticasVentas.tsx
import React from "react";
import { RegistroVenta } from "../../../types";
import { formatearMoneda } from "../../../utils/formateoMoneda";

interface EstadisticasVentasProps {
  ventasFiltradas: RegistroVenta[];
}

export const EstadisticasVentas: React.FC<EstadisticasVentasProps> = ({
  ventasFiltradas,
}) => {
  const aceptadas = ventasFiltradas.filter((v) => v.estadoVenta === "Aceptado");
  const ingresosAceptados = aceptadas.reduce(
    (sum, v) => sum + (v.precioGeneral ?? v.importeTotal ?? 0),
    0,
  );
  return (
    <div className="estadisticas">
      <div className="stat-card">
        <span className="stat-number">{ventasFiltradas.length}</span>
        <span className="stat-label">Ventas del mes</span>
      </div>
      <div className="stat-card">
        <span className="stat-number">{formatearMoneda(ingresosAceptados)}</span>
        <span className="stat-label">Ingresos totales (aceptadas)</span>
      </div>
    </div>
  );
};