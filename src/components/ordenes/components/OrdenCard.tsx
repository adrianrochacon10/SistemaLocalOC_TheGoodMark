import React, { useState } from "react";
import {
  OrdenDeCompra,
  Colaborador,
  Pantalla,
  ConfiguracionEmpresa,
  Usuario,
} from "../../../types";
import { generarPDFOrden } from "../../../utils/pdfGenerator";
import { toast } from "react-toastify";

interface Props {
  orden: OrdenDeCompra;
  clientes: Colaborador[];
  pantallas: Pantalla[];
  config: ConfiguracionEmpresa;
  usuarioActual: Usuario;
  expandido: boolean;
  onToggle: () => void;
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
}) => {
  const [descargandoPdf, setDescargandoPdf] = useState(false);

  const handlePDF = () => {
    if (descargandoPdf) return;
    setDescargandoPdf(true);
    void generarPDFOrden(orden, config, usuarioActual.nombre)
      .then(() => {
        toast.success("PDF descargado correctamente");
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "No se pudo descargar el PDF";
        toast.error(msg);
      })
      .finally(() => {
        setDescargandoPdf(false);
      });
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
              const cliente = clientes.find((c) => c.id === venta.clienteId);
              const pantalla = pantallas.find(
                (p) => p.id === venta.pantallasIds[0],
              );
              return (
                <div key={venta.id} className="detalle-item">
                  <p>
                    <strong>
                      {cliente?.nombre} — {pantalla?.nombre}
                    </strong>
                  </p>
                  <p>Vendido a: {venta.vendidoA}</p>
                  <p>
                    Período:{" "}
                    {new Date(venta.fechaInicio).toLocaleDateString("es-MX")} →{" "}
                    {new Date(venta.fechaFin).toLocaleDateString("es-MX")}
                  </p>
                  <p>Importe: ${venta.importeTotal.toFixed(2)}</p>
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
            className="btn btn-primary btn-sm"
            onClick={handlePDF}
            disabled={descargandoPdf}
          >
            {descargandoPdf ? "Generando PDF..." : "📥 Descargar PDF"}
          </button>
        </div>
      )}
    </div>
  );
};
