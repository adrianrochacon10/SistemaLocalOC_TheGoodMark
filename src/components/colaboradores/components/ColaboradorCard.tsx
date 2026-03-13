// src/components/pantallas/ColaboradorCard.tsx
import React from "react";
import { TipoComision } from "../GestorColaboradores";
import { Colaborador, Pantalla, Producto } from "../../../types";

const etiquetaTipoComision: Record<TipoComision, string> = {
  porcentaje: "Porcentaje",
  ninguno: "Ninguno",
  consideracion: "Consideración",
  precio_fijo: "Precio fijo",
};
  
interface Props {
  colaborador: Colaborador;
  pantallas: Pantalla[];
  productos: Producto[];
  onEditar: (c: Colaborador) => void;
  onEliminar: (id: string) => void;
}

export const ColaboradorCard: React.FC<Props> = ({
  colaborador,
  pantallas,
  productos,
  onEditar,
  onEliminar,
}) => (
  <div className="colaborador-card">
    <div className="colaborador-header">
      <h4>{colaborador.nombre}</h4>
      <span className="badge-pantallas">
        {pantallas.length} pantalla{pantallas.length !== 1 ? "s" : ""}
      </span>
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
    {colaborador.tipoComision && (
      <p>
        <strong>Comisión:</strong>{" "}
        {etiquetaTipoComision[colaborador.tipoComision]}
        {colaborador.tipoComision === "porcentaje" &&
        colaborador.porcentajeSocio !== undefined
          ? ` — ${colaborador.porcentajeSocio}%`
          : ""}
      </p>
    )}

    {pantallas.length > 0 && (
      <div className="pantallas-asociadas">
        <h5>Pantallas Asociadas</h5>
        <ul className="pantallas-list">
          {pantallas.map((p) => (
            <li key={p.id}>
              <span className="pantalla-nombre">{p.nombre}</span>
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
                {p.precio.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </span>
            </li>
          ))}
        </ul>
      </div>
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
      >
        🗑️ Eliminar
      </button>
    </div>
  </div>
);
