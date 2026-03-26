import React, { useState } from "react";
import {
  OrdenDeCompra,
  Colaborador,
  Pantalla,
  ConfiguracionEmpresa,
  Usuario,
} from "../../../types";
import { exportarPDFOrden } from "../../../utils/pdfGenerator";

interface Props {
  orden: OrdenDeCompra;
  clientes: Colaborador[];
  pantallas: Pantalla[];
  config: ConfiguracionEmpresa;
  usuarioActual: Usuario;
  expandido: boolean;
  onToggle: () => void;
  onEliminarOrden: (ordenId: string) => Promise<void>;
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

export const OrdenCard: React.FC<Props> = ({
  orden,
  clientes,
  pantallas,
  config,
  usuarioActual,
  expandido,
  onToggle,
  onEliminarOrden,
}) => {
  const [pdfBusy, setPdfBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const handlePDF = () => {
    void (async () => {
      setPdfBusy(true);
      try {
        await exportarPDFOrden(
          orden,
          config,
          usuarioActual.nombre,
          pantallas,
        );
      } catch (e) {
        alert(
          e instanceof Error
            ? e.message
            : "No se pudo generar el PDF. Prueba de nuevo.",
        );
      } finally {
        setPdfBusy(false);
      }
    })();
  };

  const nombreColaborador = orden.colaboradorId
    ? clientes.find((c) => c.id === orden.colaboradorId)?.nombre
    : undefined;
  const esAdmin = usuarioActual.rol === "admin";

  const handleEliminar = () => {
    if (!esAdmin || deleteBusy) return;
    const ok = window.confirm(
      "¿Eliminar esta orden? También se desasociará de sus ventas.",
    );
    if (!ok) return;
    void (async () => {
      setDeleteBusy(true);
      try {
        await onEliminarOrden(orden.id);
      } catch (e) {
        alert(
          e instanceof Error
            ? e.message
            : "No se pudo eliminar la orden. Intenta de nuevo.",
        );
      } finally {
        setDeleteBusy(false);
      }
    })();
  };

  return (
    <div className={`orden-card ${expandido ? "expandido" : ""}`}>
      {/* Header */}
      <div className="orden-header cursor-pointer" onClick={onToggle}>
        <h4>{orden.numeroOrden}</h4>
        <span className={`estado-badge ${orden.estado}`}>
          {orden.estado.charAt(0).toUpperCase() + orden.estado.slice(1)}
        </span>
      </div>

      {/* Resumen */}
      <div className="orden-info">
        {nombreColaborador ? (
          <p>
            <strong>Colaborador:</strong> {nombreColaborador}
          </p>
        ) : null}
        <p>
          <strong>Mes:</strong> {MESES[orden.mes ?? 0]} {orden.año ?? ""}
        </p>
        <p>
          <strong>Registros:</strong> {(orden.registrosVenta ?? []).length}
        </p>
        <p className="total-linea">
          <strong>TOTAL:</strong> ${(orden.total ?? 0).toFixed(2)}
        </p>
      </div>

      {/* Detalles expandidos */}
      {expandido && (
        <div className="orden-detalles">
          <h5>Detalles de la Orden</h5>
          <div className="detalles-list">
            {(orden.registrosVenta ?? []).map((venta) => {
              const socio = clientes.find(
                (c) =>
                  c.id === (venta.colaboradorId || orden.colaboradorId),
              );
              const nombresP =
                (venta.pantallasIds ?? [])
                  .map((id) => pantallas.find((p) => p.id === id)?.nombre ?? "Pantalla")
                  .join(", ") || "—";
              const productoTxt = venta.productoNombre?.trim() || "Sin producto";
              const importeLinea =
                Number(venta.importeTotal ?? venta.precioTotal ?? venta.precioGeneral ?? 0) || 0;
              return (
                <div key={venta.id} className="detalle-item">
                  <p>
                    <strong>
                      {socio?.nombre ?? "Colaborador"} — {nombresP}
                    </strong>
                  </p>
                  <p>Producto: {productoTxt}</p>
                  <p>Vendido a: {venta.vendidoA}</p>
                  <p>
                    Período:{" "}
                    {new Date(venta.fechaInicio).toLocaleDateString("es-MX")} →{" "}
                    {new Date(venta.fechaFin).toLocaleDateString("es-MX")}
                  </p>
                  <p>
                    Importe: $
                    {importeLinea.toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="detalles-calculos">
            <p>
              <strong>Subtotal:</strong> ${(orden.subtotal ?? 0).toFixed(2)}
            </p>
            <p>
              <strong>IVA ({orden.ivaPercentaje ?? 0}%):</strong> $
              {(orden.ivaTotal ?? 0).toFixed(2)}
            </p>
            <p className="total-linea">
              <strong>TOTAL:</strong> ${(orden.total ?? 0).toFixed(2)}
            </p>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={pdfBusy}
            onClick={handlePDF}
          >
            {pdfBusy ? "Generando PDF…" : "📥 Descargar PDF"}
          </button>
          {esAdmin ? (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={deleteBusy}
              onClick={handleEliminar}
            >
              {deleteBusy ? "Eliminando…" : "🗑️ Eliminar orden"}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
};
