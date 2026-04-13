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
  /** Legado: el resumen calcula el monto desde precio/mes × %; se ignora en pantalla. */
  montoSocio?: number;
  aplicarDescuento: boolean;
  costos?: number;
  comisionPorcentaje?: number;
  pagoConsiderar?: number;
  tipoComision?: string;
  productoNombre?: string;
  /** Lista de nombres de productos (prioridad sobre `productoNombre` unido por comas). */
  nombresProductos?: string[];
  /** Suma precios de catálogo; solo informativo (no suma al total de venta). */
  precioPantallasReferencia?: number;
  precioProductosReferencia?: number;
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
  montoSocio: _montoSocioLegacy,
  aplicarDescuento,
  costos = 0,
  comisionPorcentaje = 0,
  pagoConsiderar = 0,
  tipoComision = "",
  productoNombre = "",
  nombresProductos,
  precioPantallasReferencia = 0,
  precioProductosReferencia = 0,
  gastosAdicionales = 0,
}) => {
  const esPorDias = duracionUnidad === "dias";

  const nombresPantallasLista = pantallasActuales
    .map((p) => String(p.nombre ?? "").trim())
    .filter(Boolean);
  const textoPantallasResumen =
    nombresPantallasLista.length === 0
      ? "Sin pantallas seleccionadas"
      : nombresPantallasLista.length > 2
        ? `${nombresPantallasLista.length} pantallas`
        : nombresPantallasLista.join(", ");

  const nombresProductosLista: string[] =
    nombresProductos !== undefined
      ? nombresProductos.map((n) => String(n ?? "").trim()).filter(Boolean)
      : productoNombre.trim()
        ? productoNombre
            .split(/\s*,\s*/)
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
  const textoProductosResumen =
    nombresProductosLista.length === 0
      ? "Sin producto"
      : nombresProductosLista.length > 2
        ? `${nombresProductosLista.length} productos`
        : nombresProductosLista.join(", ");

  const etiquetaDuracion = (n: number) =>
    esPorDias
      ? `${n} ${n === 1 ? "día" : "días"}`
      : `${n} ${n === 1 ? "mes" : "meses"}`;

  // ── Derivados ──────────────────────────────────────────────
  const totalBruto = esPorDias ? precioGeneral : precioGeneral * mesesRenta;
  const totalCostos = Number(costos || 0);
  const totalComision = totalBruto * (Number(comisionPorcentaje || 0) / 100);
  const totalGastosAdicionales = gastosAdicionales;
  const totalPagoConsiderar =
    tipoComision === "consideracion" ? pagoConsiderar * mesesRenta : 0;

  const esTipoPorcentaje = tipoComision === "porcentaje";
  const pctSocio = Math.max(0, Math.min(100, Number(porcentajeSocio || 0)));
  /**
   * Colaborador por %: el socio se calcula **solo** desde precio/mes × % y luego × meses
   * (nunca como variable intermedia “precio total × %” en este resumen).
   * Por días: % sobre la tarifa total del período (`totalBruto`).
   */
  const montoSocioPorMes =
    aplicarDescuento && esTipoPorcentaje && !esPorDias && pctSocio > 0
      ? Math.round(((Number(precioGeneral) || 0) * pctSocio) / 100 * 100) / 100
      : 0;
  const montoSocioEfectivo =
    aplicarDescuento && esTipoPorcentaje && pctSocio > 0
      ? esPorDias
        ? Math.round((totalBruto * pctSocio) / 100 * 100) / 100
        : Math.round(
            montoSocioPorMes * Math.max(1, mesesRenta) * 100,
          ) / 100
      : 0;

  const montoSocioSobrePrecioVenta = montoSocioEfectivo;
  /** Alineado con ①②③: neto/mes = mensualidad − cuota socio/mes (no total÷meses). */
  const ingresoNetoMensualTrasSocio =
    esTipoPorcentaje && aplicarDescuento && !esPorDias && pctSocio > 0
      ? Math.max(
          0,
          Math.round(
            ((Number(precioGeneral) || 0) - montoSocioPorMes) * 100,
          ) / 100,
        )
      : null;

  const precioVentaFinal = totalBruto;
  const esTipoFijoOConsideracion =
    tipoComision === "consideracion" || tipoComision === "precio_fijo";
  /**
   * Porcentaje: utilidad neta = precio de venta total (− % del socio si aplica).
   * Precio fijo / consideración: utilidad neta = costo de la venta (no precio − costo).
   * Otros: margen precio − costo.
   */
  const utilidad = esTipoPorcentaje
    ? aplicarDescuento
      ? Math.max(0, Math.round((totalBruto - montoSocioEfectivo) * 100) / 100)
      : Math.max(0, Math.round(totalBruto * 100) / 100)
    : esTipoFijoOConsideracion
      ? Math.max(0, Math.round(totalCostos * 100) / 100)
      : Math.max(0, Math.round((totalBruto - totalCostos) * 100) / 100);
  const utilidadPorMes =
    !esPorDias && mesesRenta > 0
      ? Math.round((utilidad / Math.max(1, mesesRenta)) * 100) / 100
      : utilidad;

  const costoPorMes =
    !esPorDias && mesesRenta > 0 && totalCostos > 0
      ? Math.round((totalCostos / Math.max(1, mesesRenta)) * 100) / 100
      : null;

  return (
    <div className="resumen-venta">
      <h4>📋 Resumen de la Venta</h4>

      <div className="resumen-grid">
        <div className="resumen-item">
          <span className="label">Pantallas:</span>
          <span className="valor">{textoPantallasResumen}</span>
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
          <span className="valor">{textoProductosResumen}</span>
        </div>
        <div className="resumen-item">
          <span className="label">Cliente:</span>
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
            <div className="resumen-fin-row resumen-fin-sub">
              <span>{esPorDias ? "Tarifa por duración (días)" : "Precio por mes"}</span>
              <span>{formatearMoneda(precioGeneral)}</span>
            </div>
            {!esPorDias && precioPantallasReferencia > 0 && (
              <div className="resumen-fin-row resumen-fin-sub">
                <span>↳ Catálogo pantallas</span>
                <span>{formatearMoneda(precioPantallasReferencia)}</span>
              </div>
            )}
            {!esPorDias && precioProductosReferencia > 0 && (
              <div className="resumen-fin-row resumen-fin-sub">
                <span>↳ Catálogo productos</span>
                <span>{formatearMoneda(precioProductosReferencia)}</span>
              </div>
            )}
            {totalCostos > 0 && (
              <>
                <div className="resumen-fin-row resumen-fin-sub">
                  <span>Costo de la venta (total)</span>
                  <span>{formatearMoneda(totalCostos)}</span>
                </div>
                {costoPorMes != null && (
                  <div className="resumen-fin-row resumen-fin-sub">
                    <span>↳ Costo por mes</span>
                    <span>{formatearMoneda(costoPorMes)}</span>
                  </div>
                )}
              </>
            )}
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

          {/* ── SOCIO POR %: solo cadena mensual → %/mes → × meses (sin mezclar con total bruto) ── */}
          {aplicarDescuento && montoSocioSobrePrecioVenta > 0 && (
            <div className="resumen-fin-bloque resumen-fin-bloque-morado">
              {!esPorDias ? (
                <>
                  <div className="resumen-fin-row resumen-fin-sub">
                    <span>① Precio de venta por mes</span>
                    <span>{formatearMoneda(precioGeneral)}</span>
                  </div>
                  <div className="resumen-fin-row resumen-fin-sub">
                    <span>
                      ② {porcentajeSocio}% × precio/mes (cuota socio / mes)
                    </span>
                    <span>{formatearMoneda(montoSocioPorMes)}</span>
                  </div>
                  <div className="resumen-fin-row resumen-fin-sub">
                    <span>
                      ③ × {mesesRenta} {mesesRenta === 1 ? "mes" : "meses"} (total
                      socio en el contrato)
                    </span>
                    <span>{formatearMoneda(montoSocioEfectivo)}</span>
                  </div>
                  <div className="resumen-fin-row resumen-fin-principal resumen-fin-morado">
                    <span>Total participación del socio</span>
                    <span>{formatearMoneda(montoSocioSobrePrecioVenta)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="resumen-fin-row resumen-fin-sub">
                    <span>Tarifa del período (días)</span>
                    <span>{formatearMoneda(totalBruto)}</span>
                  </div>
                  <div className="resumen-fin-row resumen-fin-principal resumen-fin-morado">
                    <span>
                      Participación del socio ({porcentajeSocio}% del período)
                    </span>
                    <span>{formatearMoneda(montoSocioSobrePrecioVenta)}</span>
                  </div>
                </>
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
          {ingresoNetoMensualTrasSocio != null && (
            <div className="resumen-fin-row resumen-fin-sub">
              <span>
                ↳ Ingreso neto por mes (precio/mes − cuota socio/mes)
              </span>
              <span>{formatearMoneda(ingresoNetoMensualTrasSocio)}</span>
            </div>
          )}
          {ingresoNetoMensualTrasSocio == null &&
            !esPorDias &&
            mesesRenta > 1 && (
              <div className="resumen-fin-row resumen-fin-sub">
                <span>↳ Utilidad neta por mes</span>
                <span>{formatearMoneda(utilidadPorMes)}</span>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
