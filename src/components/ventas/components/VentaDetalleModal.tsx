// src/components/ventas/components/VentaDetalleModal.tsx
import React from "react";
import ReactDOM from "react-dom";
import { RegistroVenta, Colaborador, Pantalla, Usuario } from "../../../types";

interface Props {
  venta: RegistroVenta;
  colaboradores: Colaborador[];
  pantallas: Pantalla[];
  usuarios: Usuario[];
  onCerrar: () => void;
  onEditar?: (venta: RegistroVenta) => void;
}

const fmt = (n: number) =>
  n.toLocaleString("es-MX", { style: "currency", currency: "MXN" });

const fmtFecha = (d: Date | string) =>
  new Date(d).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const ESTADO_COLOR: Record<string, string> = {
  Aceptado: "badge-aceptado",
  Rechazado: "badge-rechazado",
  Prospecto: "badge-prospecto",
};

export const VentaDetalleModal: React.FC<Props> = ({
  venta,
  colaboradores,
  pantallas,
  usuarios,
  onCerrar,
  onEditar,
}) => {
  const colaborador = colaboradores.find((c) => c.id === venta.colaboradorId);
  const vendedor = usuarios.find((u) => u.id === venta.vendedorId);

  const pantallasVenta = (venta.pantallasIds ?? [])
    .map((id) => pantallas.find((p) => p.id === id))
    .filter(Boolean) as Pantalla[];

  return ReactDOM.createPortal(
    <div className="modal-overlay vd-overlay" onClick={onCerrar}>
      <div className="vd-container" onClick={(e) => e.stopPropagation()}>
        {/* ── Encabezado ── */}
        <div className="vd-header">
          <div className="vd-header-info">
            <h2 className="vd-titulo">{venta.vendidoA}</h2>
            <span
              className={`vd-badge ${ESTADO_COLOR[venta.estadoVenta ?? "Prospecto"]}`}
            >
              {venta.estadoVenta ?? "Prospecto"}
            </span>
          </div>
          <button className="modal-close" onClick={onCerrar}>
            ✕
          </button>
        </div>

        <div className="vd-body">
          {/* ── Partes involucradas ── */}
          <div className="vd-section">
            <h4 className="vd-section-title">👥 Partes involucradas</h4>
            <div className="vd-row-grid">
              <div className="vd-dato">
                <span className="vd-dato-label">Colaborador</span>
                <span className="vd-dato-valor">{colaborador?.nombre ?? "—"}</span>
              </div>
              <div className="vd-dato">
                <span className="vd-dato-label">Vendedor asignado</span>
                <span className="vd-dato-valor">
                  {vendedor?.nombre ?? "Sin asignar"}
                </span>
              </div>
            </div>
          </div>

          {/* ── Pantallas ── */}
          <div className="vd-section">
            <h4 className="vd-section-title">📺 Pantallas</h4>
            <div className="vd-pantallas-list">
              {pantallasVenta.length > 0 ? (
                pantallasVenta.map((p) => (
                  <span key={p.id} className="vd-pantalla-chip">
                    {p.nombre}
                  </span>
                ))
              ) : (
                <span className="vd-empty">Sin pantallas registradas</span>
              )}
            </div>
          </div>

          {/* ── Período ── */}
          <div className="vd-section">
            <h4 className="vd-section-title">📅 Período</h4>
            <div className="vd-row-grid">
              <div className="vd-dato">
                <span className="vd-dato-label">Fecha inicio</span>
                <span className="vd-dato-valor">
                  {fmtFecha(venta.fechaInicio)}
                </span>
              </div>
              <div className="vd-dato">
                <span className="vd-dato-label">Fecha fin</span>
                <span className="vd-dato-valor">
                  {fmtFecha(venta.fechaFin)}
                </span>
              </div>
              <div className="vd-dato">
                <span className="vd-dato-label">Duración</span>
                <span className="vd-dato-valor">
                  {venta.mesesRenta} mes{venta.mesesRenta !== 1 ? "es" : ""}
                </span>
              </div>
              <div className="vd-dato">
                <span className="vd-dato-label">Registrada</span>
                <span className="vd-dato-valor">
                  {fmtFecha(venta.fechaRegistro)}
                </span>
              </div>
            </div>
          </div>

          {/* ── Financiero ── */}
          <div className="vd-section">
            <h4 className="vd-section-title">💰 Resumen financiero</h4>
            <div
              className="resumen-financiero"
              style={{ marginTop: 0, borderTop: "none", paddingTop: 0 }}
            >
              {(() => {
                const meses = venta.mesesRenta || 1;
                const precioMes = venta.precioGeneral ?? 0;
                const totalBruto = venta.precioTotal ?? precioMes * meses;

                const totalCostos = venta.costos ?? 0;
                const totalComision = venta.comision ?? 0;
                const totalPagoCons = venta.pagoConsiderar ?? 0;

                const totalMontoSocio = venta.importeTotal ?? 0;
                const montoSocioMes = meses > 0 ? totalMontoSocio / meses : 0;

                // Porcentaje sobre precio por mes
                const porcentajeSocio =
                  precioMes > 0
                    ? Math.round((montoSocioMes / precioMes) * 100)
                    : 0;

                const esPorcentaje = colaborador?.tipoComision === "porcentaje";

                const utilidad =
                  totalBruto -
                  totalCostos -
                  totalComision -
                  totalPagoCons -
                  (esPorcentaje ? totalMontoSocio : 0);

                return (
                  <>
                    {/* ── TOTAL BRUTO ── */}
                    <div className="resumen-fin-bloque">
                      <div className="resumen-fin-row resumen-fin-principal">
                        <span>
                          Total ({meses} {meses === 1 ? "mes" : "meses"})
                        </span>
                        <span>{fmt(totalBruto)}</span>
                      </div>
                      <div className="resumen-fin-row resumen-fin-sub">
                        <span>↳ Precio por mes</span>
                        <span>{fmt(precioMes)}</span>
                      </div>
                    </div>

                    {/* ── PAGO A CONSIDERAR ── */}
                    {totalPagoCons > 0 && (
                      <div className="resumen-fin-bloque resumen-fin-bloque-morado">
                        <div className="resumen-fin-row resumen-fin-principal resumen-fin-morado">
                          <span>
                            Pago a Considerar ({meses}{" "}
                            {meses === 1 ? "mes" : "meses"})
                          </span>
                          <span>− {fmt(totalPagoCons)}</span>
                        </div>
                        <div className="resumen-fin-row resumen-fin-sub">
                          <span>↳ Pago por mes</span>
                          <span>− {fmt(totalPagoCons / meses)}</span>
                        </div>
                      </div>
                    )}

                    {/* ── COSTOS ── */}
                    {totalCostos > 0 && (
                      <div className="resumen-fin-bloque resumen-fin-bloque-negativo">
                        <div className="resumen-fin-row resumen-fin-principal resumen-fin-negativo">
                          <span>
                            Costos ({meses} {meses === 1 ? "mes" : "meses"})
                          </span>
                          <span>− {fmt(totalCostos)}</span>
                        </div>
                        <div className="resumen-fin-row resumen-fin-sub">
                          <span>↳ Costo por mes</span>
                          <span>− {fmt(totalCostos / meses)}</span>
                        </div>
                      </div>
                    )}

                    {/* ── COMISIÓN ── */}
                    {totalComision > 0 && (
                      <div className="resumen-fin-bloque resumen-fin-bloque-negativo">
                        <div className="resumen-fin-row resumen-fin-principal resumen-fin-negativo">
                          <span>
                            Comisión ({meses} {meses === 1 ? "mes" : "meses"})
                          </span>
                          <span>− {fmt(totalComision)}</span>
                        </div>
                        <div className="resumen-fin-row resumen-fin-sub">
                          <span>↳ Comisión por mes</span>
                          <span>− {fmt(totalComision / meses)}</span>
                        </div>
                      </div>
                    )}

                    {/* ── MONTO SOCIO ── */}
                    {colaborador?.tipoComision === "porcentaje" &&
                      totalMontoSocio > 0 && (
                        <div className="resumen-fin-bloque resumen-fin-bloque-morado">
                          <div className="resumen-fin-row resumen-fin-principal resumen-fin-morado">
                            <span>
                              Monto socio ({meses}{" "}
                              {meses === 1 ? "mes" : "meses"})
                            </span>
                            <span>− {fmt(totalMontoSocio)}</span>
                          </div>
                          <div className="resumen-fin-row resumen-fin-sub">
                            <span>↳ Porcentaje</span>
                            <span>{porcentajeSocio}%</span>
                          </div>
                          <div className="resumen-fin-row resumen-fin-sub">
                            <span>↳ Monto socio por mes</span>
                            <span>− {fmt(montoSocioMes)}</span>
                          </div>
                        </div>
                      )}

                    {/* ── UTILIDAD NETA ── */}
                    <div
                      className={`resumen-fin-total ${
                        utilidad < 0
                          ? "resumen-fin-perdida"
                          : "resumen-fin-ganancia"
                      }`}
                    >
                      <span>Utilidad neta</span>
                      <span>{fmt(utilidad)}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="vd-footer">
          <button className="btn btn-outline" onClick={onCerrar}>
            Cerrar
          </button>
          {onEditar && (
            <button
              className="btn btn-primary"
              onClick={() => {
                onEditar(venta);
                onCerrar();
              }}
            >
              ✏️ Editar venta
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
