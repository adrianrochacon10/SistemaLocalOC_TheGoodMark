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
  duracionUnidad?: "meses" | "dias";
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
  precioPantallas?: number;
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
  duracionUnidad = "meses",
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
  precioPantallas = 0,
  gastosAdicionales = 0,
}) => {
  const esPorDias = duracionUnidad === "dias";
  const etiquetaDuracion = (n: number) =>
    esPorDias
      ? `${n} ${n === 1 ? "día" : "días"}`
      : `${n} ${n === 1 ? "mes" : "meses"}`;

  // ── Derivados ──────────────────────────────────────────────
  const totalBruto = esPorDias ? precioGeneral : precioGeneral * mesesRenta;
  const totalCostos = Number(costos || 0);
  const totalComision = totalBruto * (Number(comisionPorcentaje || 0) / 100);
  const totalGastosAdicionales = gastosAdicionales;
  const totalBaseSinGastos = totalBruto;
  const totalPagoConsiderar =
    tipoComision === "consideracion" ? pagoConsiderar * mesesRenta : 0;
  /**
   * `montoSocio` ya viene del padre como % del **precio total de la venta** (no del costo).
   * No multiplicar por meses: eso duplicaba el cálculo (p. ej. 20% × 9 meses sobre el mismo total).
   */
  const montoSocioSobrePrecioVenta = aplicarDescuento ? montoSocio : 0;
  const precioTotalNetoTrasSocio =
    aplicarDescuento && montoSocioSobrePrecioVenta > 0
      ? Math.max(0, Math.round((totalBruto - montoSocio) * 100) / 100)
      : totalBruto;
  /** Por mes = (precio total de venta − % del socio) ÷ meses, no el % del socio ÷ meses. */
  const precioMensualNetoTrasSocio =
    aplicarDescuento &&
    montoSocioSobrePrecioVenta > 0 &&
    !esPorDias &&
    mesesRenta > 0
      ? Math.round((precioTotalNetoTrasSocio / Math.max(1, mesesRenta)) * 100) / 100
      : 0;

  const precioVentaFinal = totalBruto;
  const esTipoPorcentaje = tipoComision === "porcentaje";
  /**
   * Porcentaje: utilidad sobre precio de venta (precio total − monto del socio si aplica).
   * Otros tipos: margen precio − costo de venta.
   */
  const utilidad = esTipoPorcentaje
    ? aplicarDescuento
      ? Math.max(0, Math.round((totalBruto - montoSocio) * 100) / 100)
      : totalBruto
    : Math.max(0, Math.round((totalBruto - totalCostos) * 100) / 100);

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
            {mesesRenta} {duracionUnidad === "dias" ? (mesesRenta !== 1 ? "días" : "día") : (mesesRenta !== 1 ? "meses" : "mes")}
          </span>
        </div>

        {/* ───────── Resumen financiero integrado ───────── */}
        <div className="resumen-financiero">
          {/* ── TOTAL BRUTO — siempre precio lleno ── */}
          <div className="resumen-fin-bloque">
            <div className="resumen-fin-row resumen-fin-principal">
              <span>Precio de la venta (total)</span>
              <span>{formatearMoneda(precioVentaFinal)}</span>
            </div>
            {!esPorDias && (
              <div className="resumen-fin-row resumen-fin-sub">
                <span>↳ Base (pantallas + productos)</span>
                <span>{formatearMoneda(totalBaseSinGastos)}</span>
              </div>
            )}
            {!esPorDias && precioPantallas > 0 && (
              <div className="resumen-fin-row resumen-fin-sub">
                <span>↳ Pantallas</span>
                <span>{formatearMoneda(precioPantallas)}</span>
              </div>
            )}
            {!esPorDias && precioProductos > 0 && (
              <div className="resumen-fin-row resumen-fin-sub">
                <span>↳ Productos</span>
                <span>{formatearMoneda(precioProductos)}</span>
              </div>
            )}
            <div className="resumen-fin-row resumen-fin-sub">
              <span>{esPorDias ? "Tarifa por duración (días)" : "Precio por mes"}</span>
              <span>{formatearMoneda(precioGeneral)}</span>
            </div>
          </div>

          {/* ── CONSIDERACIÓN (descuento sobre costo) ── */}
          {tipoComision === "consideracion" && totalPagoConsiderar > 0 && (
            <div className="resumen-fin-bloque resumen-fin-bloque-morado">
              <div className="resumen-fin-row resumen-fin-principal resumen-fin-morado">
                <span>Descuento por consideración ({etiquetaDuracion(mesesRenta)})</span>
                <span>{formatearMoneda(totalPagoConsiderar)}</span>
              </div>
              <div className="resumen-fin-row resumen-fin-sub">
                <span>↳ Consideración por periodo</span>
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
                <span>Costo de la venta</span>
                <span>{formatearMoneda(totalCostos)}</span>
              </div>
            </div>
          )}

          {totalGastosAdicionales > 0 && (
            <div className="resumen-fin-bloque">
              <div className="resumen-fin-row resumen-fin-principal">
                <span>Gastos adicionales</span>
                <span>{formatearMoneda(totalGastosAdicionales)}</span>
              </div>
            </div>
          )}

          {/* ── COMISIÓN ── */}
          {totalComision > 0 && (
            <div className="resumen-fin-bloque">
              <div className="resumen-fin-row resumen-fin-principal">
                <span>Comisión ({etiquetaDuracion(mesesRenta)})</span>
                <span>{formatearMoneda(totalComision)}</span>
              </div>
              <div className="resumen-fin-row resumen-fin-sub">
                <span>↳ Comisión ({comisionPorcentaje}%)</span>
                <span>{formatearMoneda(totalComision / (mesesRenta || 1))}</span>
              </div>
            </div>
          )}

          {/* ── MONTO SOCIO (descuento porcentaje) ── */}
          {aplicarDescuento && montoSocioSobrePrecioVenta > 0 && (
            <div className="resumen-fin-bloque resumen-fin-bloque-morado">
              <div className="resumen-fin-row resumen-fin-principal resumen-fin-morado">
                <span>
                  Monto socio ({porcentajeSocio}% sobre precio de la venta)
                </span>
                <span>{formatearMoneda(montoSocioSobrePrecioVenta)}</span>
              </div>
              <div className="resumen-fin-row resumen-fin-sub">
                <span>↳ Precio total de la venta</span>
                <span>{formatearMoneda(totalBruto)}</span>
              </div>
              <div className="resumen-fin-row resumen-fin-sub">
                <span>↳ Precio de venta</span>
                <span>{formatearMoneda(precioTotalNetoTrasSocio)}</span>
              </div>
              {!esPorDias && mesesRenta > 1 && precioMensualNetoTrasSocio > 0 && (
                <div className="resumen-fin-row resumen-fin-sub">
                  <span>↳ Precio por mes con porcentaje</span>
                  <span>{formatearMoneda(precioMensualNetoTrasSocio)}</span>
                </div>
              )}
              {esPorDias && (
                <div className="resumen-fin-row resumen-fin-sub">
                  <span>↳ Sobre tarifa por duración en días</span>
                  <span>{formatearMoneda(totalBruto)}</span>
                </div>
              )}
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
