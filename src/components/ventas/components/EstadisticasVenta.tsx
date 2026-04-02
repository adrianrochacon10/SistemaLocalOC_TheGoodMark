// src/components/ventas/components/EstadisticasVentas.tsx
import React from "react";
import { Colaborador, RegistroVenta } from "../../../types";
import { formatearMoneda } from "../../../utils/formateoMoneda";
import { precioVentaTotalContratoParaKpi } from "../../../utils/utilidadVenta";

interface EstadisticasVentasProps {
  ventasFiltradas: RegistroVenta[];
  colaboradores?: Colaborador[];
}

export const EstadisticasVentas: React.FC<EstadisticasVentasProps> = ({
  ventasFiltradas,
  colaboradores: _colaboradores = [],
}) => {
  const aceptadas = ventasFiltradas.filter((v) => v.estadoVenta === "Aceptado");
  const precioVentaAceptadas = aceptadas.reduce(
    (sum, v) => sum + precioVentaTotalContratoParaKpi(v),
    0,
  );
  return (
    <div className="estadisticas">
      <div className="stat-card">
        <span className="stat-number">{ventasFiltradas.length}</span>
        <span className="stat-label">Ventas del mes</span>
      </div>
      <div className="stat-card">
        <span className="stat-number">{formatearMoneda(precioVentaAceptadas)}</span>
        <span className="stat-label">Precio de venta total</span>
      </div>
    </div>
  );
};
