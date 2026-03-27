import React from "react";
import { Colaborador } from "../../../types";

interface Props {
  mesSeleccionado: number;
  añoSeleccionado: number;
  onCambiarMes: (mes: number) => void;
  onCambiarAño: (año: number) => void;
  colaboradorFiltroId?: string;
  onCambiarColaborador?: (colaboradorId: string) => void;
  clientes?: Colaborador[];
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
  colaboradorFiltroId = "",
  onCambiarColaborador,
  clientes = [],
}) => {
  const hoy = new Date();
  const años = Array.from({ length: 4 }, (_, i) => hoy.getFullYear() - 2 + i);

  return (
    <div className="selector-mes-section">
      <h3>Filtros</h3>
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
        {onCambiarColaborador ? (
          <div className="selector-group">
            <label>Colaborador:</label>
            <select
              value={colaboradorFiltroId}
              onChange={(e) => onCambiarColaborador(e.target.value)}
            >
              <option value="">Todos</option>
              {clientes
                .slice()
                .sort((a, b) =>
                  String(a.nombre ?? "").localeCompare(String(b.nombre ?? "")),
                )
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
            </select>
          </div>
        ) : null}
      </div>
    </div>
  );
};
