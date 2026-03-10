// src/components/pantallas/GestorPantallasClientes.tsx
import React from "react";
import { Pantalla, AsignacionPantalla, Colaborador, Producto, AsignacionProductoExtra } from "../../types";
import "./GestorPantallasClientes.css";
import { useGestorColaboradores } from "../colaboradores/GestorColaboradores";
import { ColaboradorList } from "../colaboradores/components/colaboradorList";
import { ColaboradorModal } from "../colaboradores/components/ColaboradorModal";

interface GestorPantallasClientesProps {
  tiposPago: { id: string; nombre: string }[];
  pantallas: Pantalla[];
  clientes: Colaborador[];
  asignaciones: AsignacionPantalla[];
  productos?: Producto[];
  asignacionesProductos?: AsignacionProductoExtra[];
  onAgregarPantalla: (p: Pantalla) => void;
  onActualizarPantalla: (p: Pantalla) => void;
  onEliminarPantalla: (id: string) => void;
  onAgregarCliente: (c: Colaborador, extras?: { tipo_pago_id: string; pantalla_id: string }) => void | Promise<Colaborador | void>;
  onActualizarCliente: (c: Colaborador) => void;
  onAsignarPantalla: (a: AsignacionPantalla) => void;
  onEliminarPantallasYAsignaciones: (id: string) => void;
  onDesasignarPantalla: (clienteId: string, pantallaId: string) => void;
  onAgregarProducto?: (p: Producto) => void;
  onActualizarProducto?: (p: Producto) => void;
  onEliminarProducto?: (id: string) => void;
  onAsignarProducto?: (a: AsignacionProductoExtra) => void;
}

export const GestorPantallasClientes: React.FC<GestorPantallasClientesProps> = ({
  pantallas, clientes, asignaciones,
  productos = [], asignacionesProductos = [],
  onAgregarPantalla, onActualizarPantalla, onEliminarPantalla,
  onAgregarCliente, onActualizarCliente, onAsignarPantalla,
  onEliminarPantallasYAsignaciones,
  onAgregarProducto, onActualizarProducto, onEliminarProducto, onAsignarProducto,
}) => {
  const gestor = useGestorColaboradores({
    pantallas, asignaciones, productos, asignacionesProductos,
    onAgregarPantalla, onActualizarPantalla, onEliminarPantalla,
    onAgregarCliente, onActualizarCliente, onAsignarPantalla,
    onEliminarPantallasYAsignaciones,
    onAgregarProducto, onActualizarProducto, onEliminarProducto, onAsignarProducto,
  });

  return (
    <div className="gestor-pantallas-clientes">
      <h2>Gestión de Colaboradores</h2>

      <ColaboradorList
        clientes={clientes}
        pantallas={pantallas}
        asignaciones={asignaciones}
        productos={productos}
        asignacionesProductos={asignacionesProductos}
        onAbrirModal={() => gestor.setMostrarModal(true)}
        onEditar={gestor.handleEditar}
        onEliminar={gestor.handleEliminar}
      />

      {gestor.mostrarModal && (
        <ColaboradorModal
          modoEdicion={gestor.modoEdicion}
          formData={gestor.formData}
          formSetters={gestor.formSetters}
          pantallasForm={gestor.pantallasForm}
          productosForm={gestor.productosForm}
          errorColaborador={gestor.errorColaborador}
          errorPantalla={gestor.errorPantalla}
          onGuardar={gestor.handleGuardar}
          onCerrar={gestor.resetFormulario}
        />
      )}
    </div>
  );
};
