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

function inferirDuracionUnidad(venta: RegistroVenta): "meses" | "dias" {
  const unidadGuardada = String((venta as any).duracionUnidad ?? "").toLowerCase().trim();
  if (unidadGuardada === "dias" || unidadGuardada === "meses") {
    return unidadGuardada as "dias" | "meses";
  }
  if ((venta as any).gastoAdicionalEnDias === true) return "dias";
  if (!venta?.fechaInicio || !venta?.fechaFin) return "meses";
  const fi = new Date(venta.fechaInicio);
  const ff = new Date(venta.fechaFin);
  if (Number.isNaN(fi.getTime()) || Number.isNaN(ff.getTime())) return "meses";
  const dias = Math.max(1, Math.round((ff.getTime() - fi.getTime()) / 86400000) + 1);
  const mr = Math.max(1, Number(venta.mesesRenta) || 1);
  // Ventas por días históricas pueden venir con fecha fin desfasada;
  // si usa duraciones típicas de días y contrato corto, tratarlo como días.
  if ([1, 3, 7, 15].includes(mr) && dias <= 31) return "dias";
  if (mr === dias || Math.abs(dias - mr) <= 1) return "dias";
  return "meses";
}

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
  const duracionUnidad = inferirDuracionUnidad(venta);
  const etiquetaUnidad = duracionUnidad === "dias" ? "día" : "mes";
  const etiquetaUnidadPlural = duracionUnidad === "dias" ? "días" : "meses";

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
                <span className="vd-dato-valor">
                  {colaborador?.nombre ?? "—"}
                </span>
              </div>
              <div className="vd-dato">
                <span className="vd-dato-label">Vendedor asignado</span>
                <span className="vd-dato-valor">
                  {vendedor?.nombre ?? "Sin asignar"}
                </span>
              </div>
              <div className="vd-dato">
                <span className="vd-dato-label">Identificador</span>
                <span className="vd-dato-valor">
                  {venta.identificadorVenta?.trim() || "—"}
                </span>
              </div>
              <div className="vd-dato">
                <span className="vd-dato-label">Vendido a</span>
                <span className="vd-dato-valor">
                  {venta.vendidoA && venta.vendidoA !== "-"
                    ? venta.vendidoA
                    : "—"}
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
                  {venta.mesesRenta} {venta.mesesRenta !== 1 ? etiquetaUnidadPlural : etiquetaUnidad}
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
                const precioPeriodo =
                  Number((venta as any).precioTotal ?? 0) > 0
                    ? (Number((venta as any).precioTotal ?? 0) || 0) / Math.max(1, meses)
                    : Number(venta.precioGeneral ?? 0) || 0;
                // Total de venta: gastos adicionales se manejan aparte, no dentro de la venta.
                const totalBruto =
                  Number((venta as any).precioTotal ?? 0) > 0
                    ? Number((venta as any).precioTotal ?? 0)
                    : precioPeriodo * meses;

                const totalCostos = venta.costos ?? 0;
                const totalComision = venta.comision ?? 0;
                const totalPagoCons = venta.pagoConsiderar ?? 0;
                const gastosAdic = Number(venta.gastosAdicionales ?? 0) || 0;
                // % del socio sobre monto de venta.
                const baseSocioSinGastos = Math.max(0, totalBruto);

                const pctGuardado =
                  venta.porcentajeSocio != null &&
                  Number.isFinite(Number(venta.porcentajeSocio))
                    ? Number(venta.porcentajeSocio)
                    : typeof colaborador?.porcentajeSocio === "number"
                      ? colaborador.porcentajeSocio
                      : null;

                const importeGuardado = Number(venta.importeTotal ?? 0) || 0;
                const socioDesdePorcentaje =
                  pctGuardado != null &&
                  pctGuardado >= 0 &&
                  baseSocioSinGastos > 0
                    ? Math.round(
                        (baseSocioSinGastos * pctGuardado) / 100 * 100,
                      ) / 100
                    : 0;

                const esPorcentaje = colaborador?.tipoComision === "porcentaje";
                const esFijoOConsideracion =
                  colaborador?.tipoComision === "consideracion" ||
                  colaborador?.tipoComision === "precio_fijo";
                let totalMontoSocio = 0;
                if (esPorcentaje) {
                  // Si el importe guardado es menor que el bruto, es el monto socio real (líneas producto/pantalla).
                  if (
                    importeGuardado > 0 &&
                    totalBruto > 0 &&
                    importeGuardado < totalBruto - 0.01
                  ) {
                    totalMontoSocio = importeGuardado;
                  } else if (socioDesdePorcentaje > 0) {
                    // importeTotal === precioTotal (error) o solo hay %: aplica % sobre el bruto, no el 100 %.
                    totalMontoSocio = socioDesdePorcentaje;
                  }
                }

                const precioNetoPorMesTrasSocio =
                  meses > 0
                    ? Math.max(0, totalBruto - totalMontoSocio) / meses
                    : 0;

                const porcentajeSocio =
                  pctGuardado != null && Number.isFinite(pctGuardado)
                    ? Math.round(pctGuardado)
                    : baseSocioSinGastos > 0 && totalMontoSocio > 0
                      ? Math.round(
                          (totalMontoSocio / baseSocioSinGastos) * 100,
                        )
                      : 0;

                // Porcentaje: utilidad = precio de venta (− monto socio). Fijo/consideración: utilidad = costo. Otros: margen.
                const utilidad = esPorcentaje
                  ? Math.max(
                      0,
                      Math.round((totalBruto - totalMontoSocio) * 100) / 100,
                    )
                  : esFijoOConsideracion
                    ? Math.max(0, Number(totalCostos) || 0)
                    : Math.max(
                        0,
                        Math.round(
                          (totalBruto -
                            totalComision -
                            totalPagoCons -
                            Number(totalCostos || 0)) *
                            100,
                        ) / 100,
                      );
                const utilidadPorMes =
                  meses > 0
                    ? Math.round((utilidad / meses) * 100) / 100
                    : utilidad;

                return (
                  <>
                    {/* ── TOTAL BRUTO ── */}
                    <div className="resumen-fin-bloque">
                      <div className="resumen-fin-row resumen-fin-principal">
                        <span>
                          Total ({meses} {meses === 1 ? etiquetaUnidad : etiquetaUnidadPlural})
                        </span>
                        <span>{fmt(totalBruto)}</span>
                      </div>
                      <div className="resumen-fin-row resumen-fin-sub">
                        <span>↳ Precio por {etiquetaUnidad}</span>
                        <span>{fmt(precioPeriodo)}</span>
                      </div>
                    </div>

                    {/* ── PAGO A CONSIDERAR ── */}
                    {totalPagoCons > 0 && (
                      <div className="resumen-fin-bloque resumen-fin-bloque-morado">
                        <div className="resumen-fin-row resumen-fin-principal resumen-fin-morado">
                          <span>
                            Pago a Considerar ({meses} {meses === 1 ? etiquetaUnidad : etiquetaUnidadPlural})
                          </span>
                          <span>− {fmt(totalPagoCons)}</span>
                        </div>
                        <div className="resumen-fin-row resumen-fin-sub">
                          <span>↳ Pago por {etiquetaUnidad}</span>
                          <span>− {fmt(totalPagoCons / meses)}</span>
                        </div>
                      </div>
                    )}

                    {/* ── COSTOS ── */}
                    {totalCostos > 0 && (
                      <div className="resumen-fin-bloque">
                        <div className="resumen-fin-row resumen-fin-principal">
                          <span>
                            Costos ({meses} {meses === 1 ? etiquetaUnidad : etiquetaUnidadPlural})
                          </span>
                          <span>{fmt(totalCostos)}</span>
                        </div>
                        <div className="resumen-fin-row resumen-fin-sub">
                          <span>↳ Costo por {etiquetaUnidad}</span>
                          <span>{fmt(totalCostos / meses)}</span>
                        </div>
                      </div>
                    )}

                    {/* ── COMISIÓN ── */}
                    {totalComision > 0 && (
                      <div className="resumen-fin-bloque resumen-fin-bloque-negativo">
                        <div className="resumen-fin-row resumen-fin-principal resumen-fin-negativo">
                          <span>
                            Comisión ({meses} {meses === 1 ? etiquetaUnidad : etiquetaUnidadPlural})
                          </span>
                          <span>− {fmt(totalComision)}</span>
                        </div>
                        <div className="resumen-fin-row resumen-fin-sub">
                          <span>↳ Comisión por {etiquetaUnidad}</span>
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
                              Monto socio ({meses} {meses === 1 ? etiquetaUnidad : etiquetaUnidadPlural})
                            </span>
                            <span>− {fmt(totalMontoSocio)}</span>
                          </div>
                          <div className="resumen-fin-row resumen-fin-sub">
                            <span>↳ Porcentaje</span>
                            <span>{porcentajeSocio}%</span>
                          </div>
                          {meses > 1 ? (
                            <div className="resumen-fin-row resumen-fin-sub">
                              <span>↳ Precio por {etiquetaUnidad} con porcentaje</span>
                              <span>{fmt(precioNetoPorMesTrasSocio)}</span>
                            </div>
                          ) : null}
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
                    {meses > 1 ? (
                      <div className="resumen-fin-row resumen-fin-sub">
                        <span>↳ Utilidad neta por {etiquetaUnidad}</span>
                        <span>{fmt(utilidadPorMes)}</span>
                      </div>
                    ) : null}
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
