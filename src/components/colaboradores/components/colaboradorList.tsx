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
  canEliminar: boolean;
  canCrear: boolean;
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
  canEliminar,
  canCrear,
}) => {
  const visibles = clientes;
  const getArrayIds = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.map((v) => String(v));
    if (typeof value === "string") return value.split(",").map((v) => v.trim()).filter(Boolean);
    return [];
  };

  const getPantallas = (colaborador: Colaborador): Pantalla[] => {
    const colabAny = colaborador as Colaborador & {
      pantallas?: Pantalla[];
      pantalla_ids?: string[] | string;
    };
    if (Array.isArray(colabAny.pantallas) && colabAny.pantallas.length > 0) {
      return colabAny.pantallas;
    }

    const ids = getArrayIds(colabAny.pantalla_ids);
    if (ids.length > 0) {
      return ids
        .map((id) => pantallas.find((p) => p.id === id))
        .filter(Boolean) as Pantalla[];
    }

    const porAsignacion = asignaciones
      .filter((a) => a.clienteId === colaborador.id && a.activa)
      .map((a) => pantallas.find((p) => p.id === a.pantallaId))
      .filter(Boolean) as Pantalla[];

    if (porAsignacion.length > 0) return porAsignacion;

    const desdeColaborador = pantallas.find((p) => p.id === colaborador.pantallaId);
    return desdeColaborador ? [desdeColaborador] : [];
  };

  const getProductos = (colaborador: Colaborador): Producto[] => {
    const colabAny = colaborador as Colaborador & {
      productos?: Producto[];
      producto_ids?: string[] | string;
    };
    if (Array.isArray(colabAny.productos) && colabAny.productos.length > 0) {
      return colabAny.productos;
    }

    const ids = getArrayIds(colabAny.producto_ids);
    if (ids.length > 0) {
      return ids
        .map((id) => productos.find((p) => p.id === id))
        .filter(Boolean) as Producto[];
    }

    const porAsignacion = asignacionesProductos
      .filter((a) => a.clienteId === colaborador.id && a.activo)
      .map((a) => productos.find((p) => p.id === a.productoId))
      .filter(Boolean) as Producto[];

    if (porAsignacion.length > 0) return porAsignacion;

    const desdeColaborador = productos.find((p) => p.id === colaborador.productoId);
    return desdeColaborador ? [desdeColaborador] : [];
  };

  if (visibles.length === 0) {
    return (
      <div className="estado-vacio">
        <div className="estado-vacio-contenido">
          <div className="icono-grande">👥</div>
          <h3>No hay colaboradores registrados</h3>
          <p>
            {canCrear
              ? "Comienza agregando tu primer colaborador"
              : "No tienes permisos para crear colaboradores"}
          </p>
          {canCrear && (
            <button className="btn btn-primary btn-lg" onClick={onAbrirModal}>
              ➕ Agregar Colaborador
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {canCrear && (
        <div className="header-colaboradores">
          <button className="btn btn-flotante-mini" onClick={onAbrirModal}>
            <span style={{ fontSize: "1.1em", marginRight: 6 }}>＋</span>
            Agregar Colaborador
          </button>
        </div>
      )}

      <div className="colaboradores-grid">
        {visibles.map((colaborador) => (
          <ColaboradorCard
            key={colaborador.id}
            colaborador={colaborador}
            pantallas={getPantallas(colaborador)}
            productos={getProductos(colaborador)}
            onEditar={onEditar}
            onEliminar={onEliminar}
            canEliminar={canEliminar}
          />
        ))}
      </div>
    </>
  );
};
