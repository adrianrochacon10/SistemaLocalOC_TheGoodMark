// src/components/ventas/components/EstadisticasVentas.tsx
import React from "react";
import { RegistroVenta } from "../../../types";
import { formatearMoneda } from "../../../utils/formateoMoneda";

interface EstadisticasVentasProps {
  ventasFiltradas: RegistroVenta[];
}

/** Ingreso/utilidad del contrato: total del periodo, no el precio mensual. */
function importeContratoVenta(v: RegistroVenta): number {
  const directo = Number(v.importeTotal ?? v.precioTotal ?? 0) || 0;
  if (directo > 0) return directo;
  const mensual = Number(v.precioGeneral ?? 0) || 0;
  const meses = Math.max(1, Math.floor(Number(v.mesesRenta ?? 1) || 1));
  return mensual * meses;
}

export const EstadisticasVentas: React.FC<EstadisticasVentasProps> = ({
  ventasFiltradas,
}) => {
  const aceptadas = ventasFiltradas.filter((v) => v.estadoVenta === "Aceptado");
  const ingresosAceptados = aceptadas.reduce(
    (sum, v) => sum + importeContratoVenta(v),
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
        <span className="stat-number">{formatearMoneda(ingresosAceptados)}</span>
        <span className="stat-label">Utilidad neta</span>
        <span className="stat-hint">
          Suma del importe total por venta (no solo el precio por periodo). Comisiones:{" "}
          {formatearMoneda(comisionesAceptadas)}
        </span>
      </div>
    </div>
  );
};
