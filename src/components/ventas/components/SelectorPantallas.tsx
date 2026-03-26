// src/components/ventas/components/SelectorPantallas.tsx
import React from "react";
import { AsignacionPantalla, Pantalla } from "../../../types";

interface SelectorPantallasProps {
  pantallasDelCliente: AsignacionPantalla[];
  pantallasSeleccionadas: string[];
  pantallas: Pantalla[];
  onToggle: (pantallaId: string) => void;
}

export const SelectorPantallas: React.FC<SelectorPantallasProps> = ({
  pantallasDelCliente,
  pantallasSeleccionadas,
  pantallas,
  onToggle,
}) => (
  <div className="form-group">
    <label className="label-pantallas">
      Pantallas seleccionadas:{" "}
      <span className="badge-cantidad">{pantallasSeleccionadas.length}</span>
    </label>

    <div className="pantallas-checkbox-group">
      {pantallasDelCliente.map((asignacion) => {
        const pantalla = pantallas.find(
          (p) => String(p.id) === String(asignacion.pantallaId),
        );
        const isSelected = pantallasSeleccionadas.includes(asignacion.pantallaId);
        const nombrePantalla =
          pantalla?.nombre?.trim() || "Pantalla sin nombre";
        return (
          <label
            key={asignacion.pantallaId}
            className={`checkbox-item ${isSelected ? "selected" : ""}`}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggle(asignacion.pantallaId)}
            />
            <span className="checkbox-visual"></span>
            <span className="checkbox-label">
              <span className="pantalla-nombre">{nombrePantalla}</span>
              {pantalla?.ubicacion && (
                <span className="pantalla-mini-ubicacion">{pantalla.ubicacion}</span>
              )}
            </span>
          </label>
        );
      })}
    </div>

    {pantallasSeleccionadas.length === 0 && (
      <div className="hint-text">⚠️ Selecciona al menos una pantalla</div>
    )}
  </div>
);
