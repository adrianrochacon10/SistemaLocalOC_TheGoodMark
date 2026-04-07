// src/components/ventas/components/EstadisticasVentas.tsx
import React from "react";
import { Colaborador, RegistroVenta } from "../../../types";
import { formatearMoneda } from "../../../utils/formateoMoneda";
import { utilidadNetaContratoParaKpi } from "../../../utils/utilidadVenta";

interface EstadisticasVentasProps {
  ventasFiltradas: RegistroVenta[];
  colaboradores?: Colaborador[];
}

export const EstadisticasVentas: React.FC<EstadisticasVentasProps> = ({
  ventasFiltradas,
  colaboradores = [],
}) => {
  const aceptadas = ventasFiltradas.filter((v) => v.estadoVenta === "Aceptado");
  const utilidadNetaAceptadas = aceptadas.reduce(
    (sum, v) =>
      sum +
      Math.max(
        0,
        utilidadNetaContratoParaKpi(v, colaboradores) - (Number(v.gastosAdicionales ?? 0) || 0),
      ),
    0,
  );
  return (
    <div className="estadisticas">
      <div className="stat-card">
        <span className="stat-number">{ventasFiltradas.length}</span>
        <span className="stat-label">Ventas totales</span>
      </div>
      <div className="stat-card">
        <span className="stat-number">{formatearMoneda(utilidadNetaAceptadas)}</span>
        <span className="stat-label">Utilidad neta (aceptadas)</span>
      </div>
    </div>
  );
};
