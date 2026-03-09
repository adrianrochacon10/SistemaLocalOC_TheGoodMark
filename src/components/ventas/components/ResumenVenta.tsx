// src/components/ventas/components/ResumenVenta.tsx
import React from "react";
import { Pantalla } from "../../../types";
import { formatearFecha } from "../../../utils/formateoFecha";
import { formatearMoneda } from "../../../utils/formateoMoneda";

interface ResumenVentaProps {
  pantallasActuales: Pantalla[];
  estadoVenta: string;
  pantallasSeleccionadas: string[];
  vendidoA: string;
  fechaInicio: string;
  fechaFin: string;
  mesesRenta: number;
  cantidad: number;
  precioUnitario: number;
  precioTotal: number;
  tipoPagoNombre: string;
}

export const ResumenVenta: React.FC<ResumenVentaProps> = ({
  pantallasActuales,
  estadoVenta,
  pantallasSeleccionadas,
  vendidoA,
  fechaInicio,
  fechaFin,
  mesesRenta,
  cantidad,
  precioUnitario,
  precioTotal,
  tipoPagoNombre,
}) => (
  <div className="resumen-venta">
    <h4>📋 Resumen de la Venta</h4>
    <div className="resumen-grid">

      <div className="resumen-item">
        <span className="label">Pantallas:</span>
        <span className="valor">
          {pantallasSeleccionadas.length} pantalla{pantallasSeleccionadas.length !== 1 ? "s" : ""} – {pantallasActuales.map((p) => p.nombre).join(", ")}
        </span>
      </div>

      <div className="resumen-item">
        <span className="label">Estado:</span>
        <span className="valor">{estadoVenta}</span>
      </div>

      <div className="resumen-item">
        <span className="label">Cantidad:</span>
        <span className="valor">{cantidad}</span>
      </div>

      <div className="resumen-item">
        <span className="label">Precio unitario:</span>
        <span className="valor">{formatearMoneda(precioUnitario)}</span>
      </div>

      <div className="resumen-item">
        <span className="label">Tipo de pago:</span>
        <span className="valor">{tipoPagoNombre || "-"}</span>
      </div>

      <div className="resumen-item">
        <span className="label">Vendido a:</span>
        <span className="valor">{vendidoA || "-"}</span>
      </div>

      <div className="resumen-item">
        <span className="label">Fecha inicio:</span>
        <span className="valor">{formatearFecha(fechaInicio)}</span>
      </div>

      <div className="resumen-item">
        <span className="label">Fecha fin:</span>
        <span className="valor">{formatearFecha(fechaFin)}</span>
      </div>

      <div className="resumen-item">
        <span className="label">Duración:</span>
        <span className="valor">{mesesRenta} mes{mesesRenta !== 1 ? "es" : ""}</span>
      </div>

      <div className="resumen-item total">
        <span className="label">PRECIO BASE (cantidad × precio):</span>
        <span className="valor" style={{ color: "#22c55e", fontWeight: 800 }}>
          {formatearMoneda(precioTotal)}
        </span>
      </div>
      <p className="resumen-nota" style={{ fontSize: "0.85em", color: "#64748b", marginTop: 8 }}>
        <strong>Tipo de pago:</strong> Porcentaje → aplica %; Precio fijo → mantiene; Consideración/Ninguno → $0.
      </p>

    </div>
  </div>
);
