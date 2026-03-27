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
  costos?: number;
  comisionPorcentaje?: number;
  pagoConsiderar?: number;
  tipoComision?: string;
  productoNombre?: string;
  precioProductos?: number;
  gastosAdicionales?: number;
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
  costos = 0,
  comisionPorcentaje = 0,
  pagoConsiderar = 0,
  tipoComision = "",
  productoNombre = "",
  precioProductos = 0,
  gastosAdicionales = 0,
}) => {
  // ── Derivados ──────────────────────────────────────────────
  const totalBruto = precioGeneral * mesesRenta;
  const totalCostos = costos * mesesRenta;
  const totalComision = (totalBruto * (Number(comisionPorcentaje || 0) / 100));
  const totalGastosAdicionales = gastosAdicionales;
  const totalPagoConsiderar =
    tipoComision === "consideracion" ? pagoConsiderar * mesesRenta : 0;
  const totalMontoSocio = aplicarDescuento ? montoSocio * mesesRenta : 0;

  // Solicitud: que la Utilidad neta sea igual a los ingresos totales (totalBruto).
  // Nota: aunque aquí se muestran costos/comisiones/gastos, el valor de utilidad neta
  // se mantiene igual a ingresos para que coincida con el total.
  const utilidad = totalBruto;

  return (
    <div className="resumen-venta">
      <h4>📋 Resumen de la Venta</h4>

      <div className="resumen-grid">
        <div className="resumen-item">
          <span className="label">Pantallas:</span>
          <span className="valor">
            {pantallasActuales.length > 0
              ? pantallasActuales.map((p) => p.nombre).join(", ")
              : "Sin pantallas seleccionadas"}
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
          <span className="label">Productos:</span>
          <span className="valor">{productoNombre || "Sin producto"}</span>
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

        {/* ───────── Resumen financiero integrado ───────── */}
        <div className="resumen-financiero">
          {/* ── TOTAL BRUTO — siempre precio lleno ── */}
          <div className="resumen-fin-bloque">
            <div className="resumen-fin-row resumen-fin-principal">
              <span>Precio de la venta</span>
              <span>{formatearMoneda(totalBruto)}</span>
            </div>
            <div className="resumen-fin-row resumen-fin-sub">
              <span>Precio de la venta por mes</span>
              <span>{formatearMoneda(precioGeneral)}</span>
            </div>
          </div>

          {/* ── PAGO A CONSIDERAR ── */}
          {tipoComision === "consideracion" && totalPagoConsiderar > 0 && (
            <div className="resumen-fin-bloque resumen-fin-bloque-morado">
              <div className="resumen-fin-row resumen-fin-principal resumen-fin-morado">
                <span>
                  Pago a Considerar ({mesesRenta}{" "}
                  {mesesRenta === 1 ? "mes" : "meses"})
                </span>
                <span>{formatearMoneda(totalPagoConsiderar)}</span>
              </div>
              <div className="resumen-fin-row resumen-fin-sub">
                <span>↳ Pago por mes</span>
                <span>
                  {formatearMoneda(totalPagoConsiderar / (mesesRenta || 1))}
                </span>
              </div>
            </div>
          )}

          {/* ── COSTOS ── */}
          {totalCostos > 0 && (
            <div className="resumen-fin-bloque">
              <div className="resumen-fin-row resumen-fin-principal">
                <span>
                  Costos ({mesesRenta} {mesesRenta === 1 ? "mes" : "meses"})
                </span>
                <span>{formatearMoneda(totalCostos)}</span>
              </div>
              <div className="resumen-fin-row resumen-fin-sub">
                <span>↳ Costo por mes</span>
                <span>
                  {formatearMoneda(totalCostos / (mesesRenta || 1))}
                </span>
              </div>
            </div>
          )}

          {totalGastosAdicionales > 0 && (
            <div className="resumen-fin-bloque resumen-fin-bloque-negativo">
              <div className="resumen-fin-row resumen-fin-principal resumen-fin-negativo">
                <span>Gastos adicionales</span>
                <span>{formatearMoneda(totalGastosAdicionales)}</span>
              </div>
            </div>
          )}

          {/* ── COMISIÓN ── */}
          {totalComision > 0 && (
            <div className="resumen-fin-bloque resumen-fin-bloque-negativo">
              <div className="resumen-fin-row resumen-fin-principal resumen-fin-negativo">
                <span>
                  Comisión ({mesesRenta} {mesesRenta === 1 ? "mes" : "meses"})
                </span>
                <span>− {formatearMoneda(totalComision)}</span>
              </div>
              <div className="resumen-fin-row resumen-fin-sub">
                <span>↳ Comisión por mes ({comisionPorcentaje}%)</span>
                <span>
                  − {formatearMoneda(totalComision / (mesesRenta || 1))}
                </span>
              </div>
            </div>
          )}

          {/* ── MONTO SOCIO (descuento porcentaje) ── */}
          {aplicarDescuento && totalMontoSocio > 0 && (
            <div className="resumen-fin-bloque resumen-fin-bloque-morado">
              <div className="resumen-fin-row resumen-fin-principal resumen-fin-morado">
                <span>
                  Monto socio ({mesesRenta} {mesesRenta === 1 ? "mes" : "meses"}
                  )
                </span>
                <span>{formatearMoneda(totalMontoSocio)}</span>
              </div>
              <div className="resumen-fin-row resumen-fin-sub">
                <span>↳ Porcentaje</span>
                <span>{porcentajeSocio}%</span>
              </div>
              <div className="resumen-fin-row resumen-fin-sub">
                <span>↳ Monto socio por mes</span>
                <span>{formatearMoneda(montoSocio)}</span>
              </div>
            </div>
          )}

          {/* ── UTILIDAD NETA ── */}
          <div
            className={`resumen-fin-total ${
              utilidad < 0 ? "resumen-fin-perdida" : "resumen-fin-ganancia"
            }`}
          >
            <span>Utilidad neta</span>
            <span>{formatearMoneda(utilidad)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
