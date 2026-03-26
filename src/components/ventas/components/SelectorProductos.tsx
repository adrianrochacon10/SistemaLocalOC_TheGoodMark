// src/components/ventas/components/SelectorProductos.tsx
import React from "react";
import { Producto } from "../../../types";

interface SelectorProductosProps {
  productosDelCliente: Producto[];
  productosSeleccionados: string[];
  onToggle: (productoId: string) => void;
  ocultarHint?: boolean;
}

export const SelectorProductos: React.FC<SelectorProductosProps> = ({
  productosDelCliente,
  productosSeleccionados,
  onToggle,
  ocultarHint,
}) => (
  <div className="form-group">
    <label className="label-pantallas">
      Productos seleccionados:{" "}
      <span className="badge-cantidad">{productosSeleccionados.length}</span>
    </label>

    <div className="pantallas-checkbox-group">
      {productosDelCliente.map((producto) => {
        const isSelected = productosSeleccionados.includes(producto.id);
        return (
          <label
            key={producto.id}
            className={`checkbox-item ${isSelected ? "selected" : ""}`}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggle(producto.id)}
            />
            <span className="checkbox-visual"></span>
            <span className="checkbox-label">
              <span className="pantalla-nombre">{producto.nombre}</span>
            </span>
          </label>
        );
      })}
    </div>

    {productosSeleccionados.length === 0 && !ocultarHint && (
      <div className="hint-text">Selecciona al menos un producto</div>
    )}
  </div>
);
