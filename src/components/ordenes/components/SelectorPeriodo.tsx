import React from "react";

interface Props {
  mesSeleccionado: number;
  añoSeleccionado: number;
  onCambiarMes: (mes: number) => void;
  onCambiarAño: (año: number) => void;
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

export const SelectorPeriodo: React.FC<Props> = ({
  mesSeleccionado,
  añoSeleccionado,
  onCambiarMes,
  onCambiarAño,
}) => {
  const hoy = new Date();
  const años = Array.from({ length: 4 }, (_, i) => hoy.getFullYear() - 2 + i);

  return (
    <div className="selector-mes-section">
      <h3>Seleccionar Período</h3>
      <div className="selector-row">
        <div className="selector-group">
          <label>Mes:</label>
          <select
            value={mesSeleccionado}
            onChange={(e) => onCambiarMes(parseInt(e.target.value))}
          >
            {MESES.map((mes, idx) => (
              <option key={idx} value={idx}>
                {mes}
              </option>
            ))}
          </select>
        </div>
        <div className="selector-group">
          <label>Año:</label>
          <select
            value={añoSeleccionado}
            onChange={(e) => onCambiarAño(parseInt(e.target.value))}
          >
            {años.map((año) => (
              <option key={año} value={año}>
                {año}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
