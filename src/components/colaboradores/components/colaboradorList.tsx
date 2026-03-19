// src/components/pantallas/ColaboradorList.tsx
import React from "react";
import {
  Pantalla,
  AsignacionPantalla,
  Colaborador,
  Producto,
  AsignacionProductoExtra,
} from "../../../types";
import { ColaboradorCard } from "./ColaboradorCard";

interface Props {
  clientes: Colaborador[];
  pantallas: Pantalla[];
  asignaciones: AsignacionPantalla[];
  productos: Producto[];
  asignacionesProductos: AsignacionProductoExtra[];
  onAbrirModal: () => void;
  onEditar: (colaborador: Colaborador) => void;
  onEliminar: (id: string) => void;
}

export const ColaboradorList: React.FC<Props> = ({
  clientes,
  pantallas,
  asignaciones,
  productos,
  asignacionesProductos,
  onAbrirModal,
  onEditar,
  onEliminar,
}) => {
  const activos = clientes.filter((c) => c.activo);

  const getPantallas = (id: string): Pantalla[] =>
    asignaciones
      .filter((a) => a.clienteId === id && a.activa)
      .map((a) => pantallas.find((p) => p.id === a.pantallaId))
      .filter(Boolean) as Pantalla[];

  const getProductos = (id: string): Producto[] =>
    asignacionesProductos
      .filter((a) => a.clienteId === id && a.activo)
      .map((a) => productos.find((p) => p.id === a.productoId))
      .filter(Boolean) as Producto[];

  if (activos.length === 0) {
    return (
      <div className="estado-vacio">
        <div className="estado-vacio-contenido">
          <div className="icono-grande">👥</div>
          <h3>No hay colaboradores registrados</h3>
          <p>Comienza agregando tu primer colaborador</p>
          <button className="btn btn-primary btn-lg" onClick={onAbrirModal}>
            ➕ Agregar Colaborador
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="header-colaboradores">
        <button className="btn btn-flotante-mini" onClick={onAbrirModal}>
          <span style={{ fontSize: "1.1em", marginRight: 6 }}>＋</span>
          Agregar Colaborador
        </button>
      </div>

      <div className="colaboradores-grid">
        {activos.map((colaborador) => (
          <ColaboradorCard
            key={colaborador.id}
            colaborador={colaborador}
            pantallas={getPantallas(colaborador.id)}
            productos={getProductos(colaborador.id)}
            onEditar={onEditar}
            onEliminar={onEliminar}
          />
        ))}
      </div>
    </>
  );
};
