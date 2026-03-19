// src/components/pantallas/CrearOrden.tsx
import React, { useState, useMemo } from "react";
import {
  OrdenDeCompra,
  Colaborador,
  ConfiguracionEmpresa,
  RegistroVenta,
} from "../../types";
import { asignarOrdenMes, etiquetaMes } from "../../utils/ordenUtils";
import "./CrearOrden.css";

interface CrearOrdenProps {
  clientes: Colaborador[];
  ventas: RegistroVenta[]; // todas las ventas registradas en el sistema
  config: ConfiguracionEmpresa;
  diaCorte?: number; // default: 5
  onCrear: (orden: OrdenDeCompra) => void;
  onCancelar: () => void;
}

export const CrearOrden: React.FC<CrearOrdenProps> = ({
  clientes,
  ventas,
  config,
  diaCorte = 5,
  onCrear,
  onCancelar,
}) => {
  const hoy = new Date();
  const [mesOrden, setMesOrden] = useState(hoy.getMonth());
  const [añoOrden, setAñoOrden] = useState(hoy.getFullYear());
  const [clienteIdFiltro, setClienteIdFiltro] = useState(""); // "" = todos

  // ── Clasificación automática de ventas ────────────────────────────────
  const { ventasActuales, ventasSiguienteMes } = useMemo(() => {
    const filtradas = clienteIdFiltro
      ? ventas.filter((v) => v.clienteId === clienteIdFiltro)
      : ventas;

    return {
      ventasActuales: filtradas.filter(
        (v) => asignarOrdenMes(v, mesOrden, añoOrden, diaCorte) === "actual",
      ),
      ventasSiguienteMes: filtradas.filter(
        (v) => asignarOrdenMes(v, mesOrden, añoOrden, diaCorte) === "siguiente",
      ),
    };
  }, [ventas, mesOrden, añoOrden, diaCorte, clienteIdFiltro]);

  // ── Selección manual (por defecto todas las "actuales" están seleccionadas)
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());

  // Sincronizar selección cuando cambia el mes
  const ventasIds = useMemo(
    () => new Set(ventasActuales.map((v) => v.id)),
    [ventasActuales],
  );
  // Al cambiar de mes, preseleccionar todas las automáticas
  React.useEffect(() => {
    setSeleccionadas(new Set(ventasActuales.map((v) => v.id)));
  }, [mesOrden, añoOrden, clienteIdFiltro]); // eslint-disable-line

  const toggleSeleccion = (id: string) => {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Totales ────────────────────────────────────────────────────────────
  const ventasIncluidas = ventasActuales.filter((v) => seleccionadas.has(v.id));
  const subtotal = ventasIncluidas.reduce((s, v) => s + v.importeTotal, 0);
  const iva = subtotal * ((config.ivaPercentaje || 16) / 100);
  const total = subtotal + iva;

  const fechaCorteDisplay = new Date(
    añoOrden,
    mesOrden,
    diaCorte,
  ).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ── Crear orden ────────────────────────────────────────────────────────
  const handleCrear = () => {
    if (ventasIncluidas.length === 0) {
      alert("No hay ventas seleccionadas para esta orden");
      return;
    }

    const orden: OrdenDeCompra = {
      id: "oc" + Date.now(),
      numeroOrden: `OC-${añoOrden}${String(mesOrden + 1).padStart(2, "0")}-${Date.now()}`,
      fecha: new Date(),
      estado: "descargada",

      // ✅ Nombres correctos según la interfaz
      mes: mesOrden,
      año: añoOrden,

      subtotal,
      ivaTotal: iva,
      ivaPercentaje: config.ivaPercentaje,
      total,
      empresaId: clienteIdFiltro || undefined,

      // Usando registrosVenta en lugar de conceptos
      registrosVenta: ventasIncluidas.map((v) => ({
        id: v.id,
        pantallasIds: v.pantallasIds,
        itemsVenta: v.itemsVenta,
        clienteId: v.clienteId,
        productoId: v.productoId ?? null,
        vendidoA: v.vendidoA,
        precioGeneral: v.precioGeneral,
        cantidad: v.cantidad,
        precioTotal: v.precioTotal,
        fechaRegistro: v.fechaRegistro,
        fechaInicio: v.fechaInicio,
        fechaFin: v.fechaFin,
        mesesRenta: v.mesesRenta,
        importeTotal: v.importeTotal,
        activo: v.activo,
        usuarioRegistroId: v.usuarioRegistroId,
        estadoVenta: v.estadoVenta,
        tipoPagoId: v.tipoPagoId,
      })),
    };

    onCrear(orden);
  };

  const meses = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: new Date(2000, i).toLocaleDateString("es-MX", { month: "long" }),
  }));

  return (
    <div className="crear-orden-overlay" onClick={onCancelar}>
      <div
        className="crear-orden-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TÍTULO */}
        <div className="orden-titulo">
          <h2>📋 Crear Orden de Compra</h2>
          <p>Las ventas se asignan automáticamente según la fecha de corte</p>
        </div>

        {/* ── SELECTOR DE MES ── */}
        <div className="orden-section">
          <h3>📅 Mes de la Orden</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Mes</label>
              <select
                value={mesOrden}
                onChange={(e) => setMesOrden(Number(e.target.value))}
                className="form-select"
              >
                {meses.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Año</label>
              <input
                type="number"
                value={añoOrden}
                onChange={(e) => setAñoOrden(Number(e.target.value))}
              />
            </div>
            <div className="form-group">
              <label>Filtrar por cliente (opcional)</label>
              <select
                value={clienteIdFiltro}
                onChange={(e) => setClienteIdFiltro(e.target.value)}
                className="form-select"
              >
                <option value="">— Todos los clientes —</option>
                {clientes
                  .filter((c) => c.activo)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* RESUMEN DE CORTE */}
          <div className="corte-info">
            <span className="corte-badge">
              ✂️ Fecha de corte: <strong>{fechaCorteDisplay}</strong>
            </span>
            <span className="corte-sub">
              Ventas registradas <strong>antes</strong> de esa fecha y con
              inicio en {etiquetaMes(mesOrden, añoOrden)} → esta orden.
              Registradas <strong>después</strong> → orden de{" "}
              {etiquetaMes(mesOrden + 1, añoOrden)}.
            </span>
          </div>
        </div>

        {/* ── VENTAS DE ESTA ORDEN ── */}
        <div className="orden-section">
          <h3>
            ✅ Ventas incluidas en {etiquetaMes(mesOrden, añoOrden)}
            <span className="badge-count">{ventasActuales.length}</span>
          </h3>

          {ventasActuales.length === 0 ? (
            <p className="empty-msg">
              No hay ventas que cumplan los criterios para este mes.
            </p>
          ) : (
            <table className="ventas-tabla">
              <thead>
                <tr>
                  <th></th>
                  <th>Descripción</th>
                  <th>Cliente</th>
                  <th>Periodo</th>
                  <th>Registrada</th>
                  <th className="text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {ventasActuales.map((v) => {
                  const cliente = clientes.find((c) => c.id === v.clienteId);
                  return (
                    <tr
                      key={v.id}
                      className={
                        seleccionadas.has(v.id)
                          ? "fila-activa"
                          : "fila-inactiva"
                      }
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={seleccionadas.has(v.id)}
                          onChange={() => toggleSeleccion(v.id)}
                        />
                      </td>
                      <td>{v.vendidoA}</td>
                      <td>{cliente?.nombre ?? "—"}</td>
                      <td className="fecha-cell">
                        {v.fechaInicio.toLocaleDateString("es-MX")} →{" "}
                        {v.fechaFin.toLocaleDateString("es-MX")}
                      </td>
                      <td className="fecha-cell">
                        {v.fechaRegistro.toLocaleDateString("es-MX")}
                      </td>
                      <td className="text-right importe">
                        $
                        {v.importeTotal.toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── VENTAS QUE SE VAN AL MES SIGUIENTE ── */}
        {ventasSiguienteMes.length > 0 && (
          <div className="orden-section seccion-advertencia">
            <h3>
              ⏭️ Ventas que pasan a {etiquetaMes(mesOrden + 1, añoOrden)}
              <span className="badge-count badge-warn">
                {ventasSiguienteMes.length}
              </span>
            </h3>
            <p className="advertencia-texto">
              Estas ventas inician en {etiquetaMes(mesOrden, añoOrden)} pero
              fueron registradas <strong>después del {diaCorte}</strong>, por lo
              que aparecerán en la orden de{" "}
              <strong>{etiquetaMes(mesOrden + 1, añoOrden)}</strong> con su
              fecha de inicio original indicada.
            </p>
            <table className="ventas-tabla ventas-siguiente">
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Cliente</th>
                  <th>Inicio real</th>
                  <th>Registrada</th>
                  <th className="text-right">Importe</th>
                </tr>
              </thead>
              <tbody>
                {ventasSiguienteMes.map((v) => {
                  const cliente = clientes.find((c) => c.id === v.clienteId);
                  return (
                    <tr key={v.id}>
                      <td>{v.vendidoA}</td>
                      <td>{cliente?.nombre ?? "—"}</td>
                      <td className="fecha-cell alerta">
                        📌 {v.fechaInicio.toLocaleDateString("es-MX")}
                      </td>
                      <td className="fecha-cell">
                        {v.fechaRegistro.toLocaleDateString("es-MX")}
                      </td>
                      <td className="text-right importe">
                        $
                        {v.importeTotal.toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TOTALES ── */}
        {ventasIncluidas.length > 0 && (
          <div className="total-section">
            <div className="total-row">
              <span className="total-label">Subtotal:</span>
              <span>
                $
                {subtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="total-row">
              <span className="total-label">
                IVA ({config.ivaPercentaje}%):
              </span>
              <span>
                ${iva.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="total-row total-final">
              <span className="total-label">Total:</span>
              <span className="total-amount">
                ${total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {/* ACCIONES */}
        <div className="form-actions">
          <button className="btn btn-outline" onClick={onCancelar}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCrear}
            disabled={ventasIncluidas.length === 0}
          >
            ✅ Crear Orden — {etiquetaMes(mesOrden, añoOrden)}
          </button>
        </div>
      </div>
    </div>
  );
};
