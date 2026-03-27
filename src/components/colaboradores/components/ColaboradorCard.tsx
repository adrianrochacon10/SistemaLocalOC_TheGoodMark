// src/components/pantallas/ColaboradorCard.tsx
import React, { useState } from "react";
import { Colaborador, Pantalla, Producto } from "../../../types";
  
interface Props {
  colaborador: Colaborador;
  pantallas: Pantalla[];
  productos: Producto[];
  onEditar: (c: Colaborador) => void;
  onEliminar: (id: string) => void;
  canEliminar: boolean;
}

export const ColaboradorCard: React.FC<Props> = ({
  colaborador,
  pantallas,
  productos,
  onEditar,
  onEliminar,
  canEliminar,
}) => {
  const [mostrarDetalle, setMostrarDetalle] = useState(false);
  const colorColaborador = (colaborador as Colaborador & { color?: string }).color;
  return (
    <div className="colaborador-card">
      <div className="colaborador-header">
        <h4 style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {colorColaborador ? (
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: colorColaborador,
                display: "inline-block",
              }}
            />
          ) : null}
          {colaborador.nombre}
        </h4>
      </div>

      {colaborador.alias && (
        <p>
          <strong>Alias:</strong> {colaborador.alias}
        </p>
      )}
      {colaborador.telefono && (
        <p>
          <strong>Teléfono:</strong> {colaborador.telefono}
        </p>
      )}
      {colaborador.email && (
        <p>
          <strong>Email:</strong> {colaborador.email}
        </p>
      )}

      <div className="colaborador-acciones" style={{ marginBottom: 8 }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setMostrarDetalle((v) => !v)}
          type="button"
          style={{ padding: "4px 10px", fontSize: "0.8rem" }}
        >
          {mostrarDetalle ? "Ver menos" : "Ver más"}
        </button>
      </div>

      {mostrarDetalle && (
        <>
          {pantallas.length > 0 && (
            <div className="pantallas-asociadas">
              <h5>Pantallas Asociadas</h5>
              <ul className="pantallas-list">
                {pantallas.map((p) => (
                  <li key={p.id}>
                    <span className="pantalla-nombre">{p.nombre}</span>
                    <span className="pantalla-ubicacion">
                      $
                      {(Number(p.precio ?? 0) || 0).toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    {p.ubicacion && (
                      <span className="pantalla-ubicacion">{p.ubicacion}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {productos.length > 0 && (
            <div className="pantallas-asociadas">
              <h5>Otros Productos</h5>
              <ul className="pantallas-list">
                {productos.map((p) => (
                  <li key={p.id}>
                    <span className="pantalla-nombre">{p.nombre}</span>
                    <span className="pantalla-ubicacion">
                      $
                      {(p.precio ?? 0).toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <div className="colaborador-acciones">
        <button
          className="btn btn-accion btn-editar"
          onClick={() => onEditar(colaborador)}
        >
          ✏️ Editar
        </button>
        <button
          className="btn btn-accion btn-eliminar"
          onClick={() => onEliminar(colaborador.id)}
          disabled={!canEliminar}
          title={canEliminar ? "Eliminar colaborador" : "Solo admin puede eliminar"}
        >
          🗑️ Eliminar
        </button>
      </div>
    </div>
  );
};
