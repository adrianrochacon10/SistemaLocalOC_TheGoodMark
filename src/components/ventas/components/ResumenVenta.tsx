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
  precioGeneral: number;
  porcentajeSocio: number;
  montoSocio: number;
  aplicarDescuento: boolean;
}

export const ResumenVenta: React.FC<ResumenVentaProps> = ({
  pantallasActuales,
  estadoVenta,
  pantallasSeleccionadas,
  vendidoA,
  fechaInicio,
  fechaFin,
  mesesRenta,
  precioGeneral,
  porcentajeSocio,
  montoSocio,
  aplicarDescuento,
}) => (
  <div className="resumen-venta">
    <h4>📋 Resumen de la Venta</h4>
    <div className="resumen-grid">
      <div className="resumen-item">
        <span className="label">Pantallas:</span>
        <span className="valor">
          {pantallasActuales.map((p) => p.nombre).join(", ")}
        </span>
      </div>

      <div className="resumen-item">
        <span className="label">Estado:</span>
        <span className="valor">{estadoVenta}</span>
      </div>

      <div className="resumen-item">
        <span className="label">Cantidad:</span>
        <span className="valor">
          {pantallasSeleccionadas.length} pantalla
          {pantallasSeleccionadas.length !== 1 ? "s" : ""}
        </span>
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
        <span className="valor">
          {mesesRenta} mes{mesesRenta !== 1 ? "es" : ""}
        </span>
      </div>

      {/* ─── PRECIO GENERAL — siempre visible ─────── */}
      <div className="resumen-item total">
        <span className="label">
          PRECIO GENERAL ({mesesRenta} {mesesRenta === 1 ? "mes" : "meses"}):
        </span>
        <span className="valor">
          {formatearMoneda(precioGeneral * mesesRenta)}
        </span>
      </div>

      {/* ─── CON COMISIÓN — porcentaje + monto socio ─ */}
      {aplicarDescuento && (
        <>
          <div className="resumen-item total">
            <span className="label">Porcentaje socio:</span>
            <span className="valor">{porcentajeSocio}%</span>
          </div>

          <div className="resumen-item total">
            <span className="label">
              Monto socio total ({mesesRenta}{" "}
              {mesesRenta === 1 ? "mes" : "meses"}):
            </span>
            <span
              className="valor"
              style={{ color: "#22c55e", fontWeight: 800 }}
            >
              {formatearMoneda(montoSocio * mesesRenta)}
            </span>
          </div>
        </>
      )}

      {/* ─── SIN COMISIÓN — importe directo ──────── */}
      {!aplicarDescuento && (
        <div className="resumen-item total">
          <span className="label">
            Importe total ({mesesRenta} {mesesRenta === 1 ? "mes" : "meses"}):
          </span>
          <span className="valor" style={{ color: "#22c55e", fontWeight: 800 }}>
            {formatearMoneda(precioGeneral * mesesRenta)}
          </span>
        </div>
      )}
    </div>
  </div>
);