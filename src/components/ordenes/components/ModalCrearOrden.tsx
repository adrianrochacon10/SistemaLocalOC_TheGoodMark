import React, { useState, useMemo } from "react";
import ReactDOM from "react-dom";
import {
  RegistroVenta,
  Colaborador,
  Pantalla,
  ConfiguracionEmpresa,
} from "../../../types";
import { obtenerRegistrosDelMes } from "../../../utils/ordenUtils";

interface Props {
  clientes: Colaborador[];
  pantallas: Pantalla[];
  ventasRegistradas: RegistroVenta[];
  config: ConfiguracionEmpresa;
  onConfirmar: (colaboradorId: string, mes: number, año: number) => void;
  onCancelar: () => void;
}

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export const ModalCrearOrden: React.FC<Props> = ({
  clientes,
  pantallas,
  ventasRegistradas,
  config,
  onConfirmar,
  onCancelar,
}) => {
  const hoy = new Date();

  // ── Paso 1: colaborador
  const [colaboradorId, setColaboradorId] = useState("");
  // ── Paso 2: período (solo visible cuando hay colaborador)
  const [mes, setMes] = useState(hoy.getMonth());
  const [año, setAño] = useState(hoy.getFullYear());

  const pasoActual = colaboradorId ? 2 : 1;

  const años = Array.from({ length: 4 }, (_, i) => hoy.getFullYear() - 2 + i);

  const colaboradorSeleccionado = clientes.find((c) => c.id === colaboradorId);

  // Ventas filtradas
  const ventasDelMes = useMemo(() => {
    if (!colaboradorId) return [];
    return obtenerRegistrosDelMes(ventasRegistradas, mes, año).filter(
      (v) => v.clienteId === colaboradorId,
    );
  }, [ventasRegistradas, mes, año, colaboradorId]);

  const subtotal = ventasDelMes.reduce((s, v) => s + v.precioGeneral, 0);
  const iva = subtotal * (config.ivaPercentaje / 100);
  const total = subtotal + iva;

  const handleConfirmar = () => {
    if (!colaboradorId) {
      alert("Selecciona un colaborador");
      return;
    }
    if (ventasDelMes.length === 0) {
      alert("No hay ventas para ese período");
      return;
    }
    onConfirmar(colaboradorId, mes, año);
  };

  // ── Renderizar en el body via portal ──────────────────────────────
  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Encabezado */}
        <div className="modal-header">
          <h2>📋 Nueva Orden de Compra</h2>
          <button className="modal-close" onClick={onCancelar}>
            ✕
          </button>
        </div>

        {/* Indicador de pasos */}
        <div className="modal-steps">
          <div className={`step ${pasoActual >= 1 ? "step-activo" : ""}`}>
            <span className="step-num">1</span>
            <span className="step-label">Colaborador</span>
          </div>
          <div className="step-linea" />
          <div className={`step ${pasoActual >= 2 ? "step-activo" : ""}`}>
            <span className="step-num">2</span>
            <span className="step-label">Período y resumen</span>
          </div>
        </div>

        <div className="modal-body">
          {/* ── PASO 1: Seleccionar colaborador ── */}
          <div className="modal-section">
            <h3>🤝 Colaborador *</h3>
            <select
              value={colaboradorId}
              onChange={(e) => setColaboradorId(e.target.value)}
              className="form-select form-select-lg"
            >
              <option value="">— Seleccionar colaborador —</option>
              {clientes
                .filter((c) => c.activo)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
            </select>

            {/* Mini-ficha del colaborador seleccionado */}
            {colaboradorSeleccionado && (
              <div className="colaborador-ficha">
                {colaboradorSeleccionado.alias && (
                  <span>👤 {colaboradorSeleccionado.alias}</span>
                )}
                {colaboradorSeleccionado.telefono && (
                  <span>📞 {colaboradorSeleccionado.telefono}</span>
                )}
                {colaboradorSeleccionado.email && (
                  <span>✉️ {colaboradorSeleccionado.email}</span>
                )}
              </div>
            )}
          </div>

          {/* ── PASO 2: Período + resumen (solo si hay colaborador) ── */}
          {colaboradorId && (
            <>
              <div className="modal-section">
                <h3>📅 Período</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Mes</label>
                    <select
                      value={mes}
                      onChange={(e) => setMes(Number(e.target.value))}
                      className="form-select"
                    >
                      {MESES.map((m, i) => (
                        <option key={i} value={i}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Año</label>
                    <select
                      value={año}
                      onChange={(e) => setAño(Number(e.target.value))}
                      className="form-select"
                    >
                      {años.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* ── RESUMEN de ventas ── */}
              <div className="modal-section">
                <h3>
                  📦 Ventas a incluir
                  <span className="badge-count">{ventasDelMes.length}</span>
                </h3>

                {ventasDelMes.length === 0 ? (
                  <div className="empty-msg">
                    <p>
                      ⚠️ No hay ventas para {colaboradorSeleccionado?.nombre} en{" "}
                      {MESES[mes]} {año}.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="ventas-resumen-list">
                      {ventasDelMes.map((v) => {
                        const pantalla = pantallas.find(
                          (p) => p.id === v.pantallasIds[0],
                        );
                        return (
                          <div key={v.id} className="venta-resumen-item">
                            <div className="venta-resumen-info">
                              <span className="venta-resumen-nombre">
                                {v.vendidoA}
                              </span>
                              <span className="venta-resumen-pantalla">
                                📺 {pantalla?.nombre ?? "—"}
                              </span>
                              <span className="venta-resumen-fecha">
                                {new Date(v.fechaInicio).toLocaleDateString(
                                  "es-MX",
                                )}{" "}
                                →{" "}
                                {new Date(v.fechaFin).toLocaleDateString(
                                  "es-MX",
                                )}
                              </span>
                            </div>
                            <span className="venta-resumen-importe">
                              $
                              {v.precioGeneral.toLocaleString("es-MX", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Totales */}
                    <div className="modal-totales">
                      <div className="total-row">
                        <span>Subtotal</span>
                        <span>
                          $
                          {subtotal.toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="total-row">
                        <span>IVA ({config.ivaPercentaje}%)</span>
                        <span>
                          $
                          {iva.toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="total-row total-final">
                        <span>TOTAL</span>
                        <span>
                          $
                          {total.toLocaleString("es-MX", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onCancelar}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirmar}
            disabled={!colaboradorId || ventasDelMes.length === 0}
          >
            ✅ Confirmar Orden — {MESES[mes]} {año}
          </button>
        </div>
      </div>
    </div>,
    document.body, // ← se monta directamente en el body, encima de todo
  );
};
