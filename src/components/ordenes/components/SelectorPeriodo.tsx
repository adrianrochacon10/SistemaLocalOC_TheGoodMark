import React from "react";

interface Props {
  mesSeleccionado: number;
  añoSeleccionado: number;
  onCambiarMes: (mes: number) => void;
  onCambiarAño: (año: number) => void;
  identificadorFiltro?: string;
  onCambiarIdentificador?: (value: string) => void;
  busquedaTexto?: string;
  onCambiarBusquedaTexto?: (value: string) => void;
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
  identificadorFiltro = "",
  onCambiarIdentificador,
  busquedaTexto = "",
  onCambiarBusquedaTexto,
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
        {onCambiarIdentificador && onCambiarBusquedaTexto ? (
          <div className="selector-fila-busqueda">
            <div className="selector-group selector-group-busqueda-oc">
              <label htmlFor="filtro-identificador-oc">Identificador</label>
              <input
                id="filtro-identificador-oc"
                type="text"
                inputMode="text"
                autoComplete="off"
                value={identificadorFiltro}
                onChange={(e) => onCambiarIdentificador(e.target.value)}
                maxLength={32}
                className="selector-input-texto-oc"
              />
            </div>
            <div className="selector-group selector-group-busqueda-oc">
              <label htmlFor="filtro-nombre-oc">Nombre</label>
              <input
                id="filtro-nombre-oc"
                type="text"
                inputMode="text"
                autoComplete="off"
                value={busquedaTexto}
                onChange={(e) => onCambiarBusquedaTexto(e.target.value)}
                maxLength={120}
                className="selector-input-texto-oc"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
