// src/components/ventas/components/EstadisticasVentas.tsx
import React from "react";
import { RegistroVenta } from "../../../types";
import { formatearMoneda } from "../../../utils/formateoMoneda";
import { precioVentaTotalContratoParaKpi } from "../../../utils/utilidadVenta";

interface EstadisticasVentasProps {
  ventasFiltradas: RegistroVenta[];
}

const esAceptada = (v: RegistroVenta) =>
  String(v.estadoVenta ?? "").toLowerCase() === "aceptado";

export const EstadisticasVentas: React.FC<EstadisticasVentasProps> = ({
  ventasFiltradas,
}) => {
  const aceptadas = ventasFiltradas.filter(esAceptada);
  const precioVentaAceptadas = aceptadas.reduce(
    (sum, v) => sum + Math.max(0, precioVentaTotalContratoParaKpi(v)),
    0,
  );
  return (
    <div className="estadisticas">
      <div className="stat-card">
        <span className="stat-number">{ventasFiltradas.length}</span>
        <span className="stat-label">Ventas totales</span>
      </div>
      <div className="stat-card">
        <span className="stat-number">{formatearMoneda(precioVentaAceptadas)}</span>
        <span className="stat-label">Precio de venta</span>
      </div>
    </div>
  );
};
