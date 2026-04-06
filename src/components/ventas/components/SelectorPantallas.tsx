// src/components/ventas/components/SelectorPantallas.tsx
import React from "react";
import { AsignacionPantalla, Pantalla } from "../../../types";

interface SelectorPantallasProps {
  pantallasDelCliente: AsignacionPantalla[];
  pantallasSeleccionadas: string[];
  pantallas: Pantalla[];
  onToggle: (pantallaId: string) => void;
  precioPantallaMap: Record<string, number>;
  onCambiarPrecioPantalla: (pantallaId: string, precio: number) => void;
}

export const SelectorPantallas: React.FC<SelectorPantallasProps> = ({
  pantallasDelCliente,
  pantallasSeleccionadas,
  pantallas,
  onToggle,
  precioPantallaMap,
  onCambiarPrecioPantalla,
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
              <span className="pantalla-mini-ubicacion">
                Precio: $
                {Number(
                  precioPantallaMap[String(asignacion.pantallaId)] ??
                    pantalla?.precio ??
                    0,
                ).toLocaleString("es-MX", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              {isSelected && (
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={Number(
                    precioPantallaMap[String(asignacion.pantallaId)] ??
                      pantalla?.precio ??
                      0,
                  )}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    onCambiarPrecioPantalla(
                      String(asignacion.pantallaId),
                      Number(e.target.value || 0),
                    )
                  }
                  className="form-input"
                  style={{ marginTop: 6 }}
                  placeholder="Precio de venta pantalla"
                />
              )}
              {pantalla?.ubicacion && (
                <span className="pantalla-mini-ubicacion">{pantalla.ubicacion}</span>
              )}
            </span>
          </label>
        );
      })}
    </div>

  </div>
);
