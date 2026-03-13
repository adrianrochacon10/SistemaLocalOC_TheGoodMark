// src/components/ventas/components/VentaDetalleModal.tsx
import React from "react";
import ReactDOM from "react-dom";
import { RegistroVenta, Colaborador, Pantalla, Usuario } from "../../../types";

interface Props {
  venta: RegistroVenta;
  clientes: Colaborador[];
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
  clientes,
  pantallas,
  usuarios,
  onCerrar,
  onEditar,
}) => {
  const cliente = clientes.find((c) => c.id === venta.clienteId);
  const vendedor = usuarios.find((u) => u.id === venta.vendedorId);
  const pantallasVenta = (venta.pantallasIds ?? [])
    .map((id) => pantallas.find((p) => p.id === id))
    .filter(Boolean) as Pantalla[];

  const total = venta.precioGeneral ?? 0;
  const costos = venta.costos ?? 0;
  const comision = venta.comision ?? 0;
  const utilidad = total - costos - comision;

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
          {/* ── Sección colaborador / vendedor ── */}
          <div className="vd-section">
            <h4 className="vd-section-title">👥 Partes involucradas</h4>
            <div className="vd-row-grid">
              <div className="vd-dato">
                <span className="vd-dato-label">Colaborador</span>
                <span className="vd-dato-valor">{cliente?.nombre ?? "—"}</span>
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
            <div className="vd-financiero">
              <div className="vd-fin-row">
                <span>Precio por mes</span>
                <span>
                  {fmt((venta.precioGeneral ?? 0) / (venta.mesesRenta || 1))}
                </span>
              </div>
              <div className="vd-fin-row">
                <span>Total ({venta.mesesRenta} meses)</span>
                <span>{fmt(total)}</span>
              </div>
              <div className="vd-fin-row vd-fin-negativo">
                <span>Costos</span>
                <span>− {fmt(costos)}</span>
              </div>
              <div className="vd-fin-row vd-fin-negativo">
                <span>Comisión</span>
                <span>− {fmt(comision)}</span>
              </div>
              <div
                className={`vd-fin-row vd-fin-total ${utilidad < 0 ? "vd-fin-perdida" : "vd-fin-ganancia"}`}
              >
                <span>Utilidad neta</span>
                <span>{fmt(utilidad)}</span>
              </div>
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
