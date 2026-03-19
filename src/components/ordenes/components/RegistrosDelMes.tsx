import React from "react";
import { RegistroVenta, Colaborador, Pantalla } from "../../../types";

interface Props {
  registros: RegistroVenta[];
  clientes: Colaborador[];
  pantallas: Pantalla[];
  mes: number;
  año: number;
  subtotal: number;
  iva: number;
  total: number;
  ivaPercentaje: number;
  onGenerar: () => void;
  error: string;
  exito: string;
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

export const RegistrosDelMes: React.FC<Props> = ({
  registros,
  clientes,
  pantallas,
  mes,
  año,
  subtotal,
  iva,
  total,
  ivaPercentaje,
  onGenerar,
  error,
  exito,
}) => {
  if (registros.length === 0) {
    return (
      <div className="registros-section">
        <h3>
          📅 Registros de Ventas - {MESES[mes]} {año}
        </h3>
        <div className="no-registros">
          <p>No hay ventas registradas para este mes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="registros-section">
      <h3>
        📅 Registros de Ventas - {MESES[mes]} {año}
      </h3>

      <div className="registros-list">
        {registros.map((venta) => {
          const cliente = clientes.find((c) => c.id === venta.clienteId);
          const pantallasNombres = venta.pantallasIds
            .map((id) => pantallas.find((p) => p.id === id)?.nombre)
            .filter(Boolean)
            .join(", ");

          const fechaInicio = new Date(venta.fechaInicio);
          const fechaFin = new Date(venta.fechaFin);
          const primerDia = new Date(año, mes, 1);
          const ultimoDia = new Date(año, mes + 1, 0);
          const inicioEnMes = fechaInicio > primerDia ? fechaInicio : primerDia;
          const finEnMes = fechaFin < ultimoDia ? fechaFin : ultimoDia;
          const diasActivos = Math.max(
            0,
            Math.floor(
              (finEnMes.getTime() - inicioEnMes.getTime()) / 86_400_000,
            ) + 1,
          );

          return (
            <div key={venta.id} className="registro-item">
              <div className="registro-header">
                <div>
                  <h5>
                    {cliente?.nombre ?? "—"} — {pantallasNombres || "—"}
                  </h5>
                  <p className="vendido-a">Vendido a: {venta.vendidoA}</p>
                </div>
                <span className="importe">
                  ${venta.precioGeneral.toFixed(2)}
                </span>
              </div>
              <div className="registro-detalles">
                <span>
                  Período: {fechaInicio.toLocaleDateString("es-MX")} →{" "}
                  {fechaFin.toLocaleDateString("es-MX")}
                </span>
                <span>Días activos este mes: {diasActivos}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Cálculos */}
      <div className="calculos-section">
        <div className="calculo-item">
          <span className="label">Subtotal:</span>
          <span className="valor">${subtotal.toFixed(2)}</span>
        </div>
        <div className="calculo-item">
          <span className="label">IVA ({ivaPercentaje}%):</span>
          <span className="valor">${iva.toFixed(2)}</span>
        </div>
        <div className="calculo-item total">
          <span className="label">TOTAL:</span>
          <span className="valor">${total.toFixed(2)}</span>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {exito && <div className="success-message">{exito}</div>}

      <button className="btn btn-primary btn-lg" onClick={onGenerar}>
        📄 Generar Orden de Compra
      </button>
    </div>
  );
};
