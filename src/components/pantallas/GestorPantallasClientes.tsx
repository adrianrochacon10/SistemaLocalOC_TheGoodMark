// src/components/pantallas/GestorPantallasClientes.tsx
import React from "react";
import { Pantalla, AsignacionPantalla, Colaborador, Producto, AsignacionProductoExtra } from "../../types";
import "./GestorPantallasClientes.css";
import { useGestorColaboradores } from "../colaboradores/GestorColaboradores";
import { ColaboradorList } from "../colaboradores/components/colaboradorList";
import { ColaboradorModal } from "../colaboradores/components/ColaboradorModal";

interface GestorPantallasClientesProps {
  profile: { id: string; rol: string } | null;
  tiposPago: { id: string; nombre: string }[];
  pantallas: Pantalla[];
  clientes: Colaborador[];
  asignaciones: AsignacionPantalla[];
  productos?: Producto[];
  asignacionesProductos?: AsignacionProductoExtra[];
  onAgregarPantalla: (p: Pantalla) => void;
  onActualizarPantalla: (p: Pantalla) => void;
  onEliminarPantalla: (id: string) => void;
  onAgregarCliente: (
    c: Colaborador,
    extras?: {
      tipo_pago_id: string;
      pantalla_ids: string[];
      producto_ids: string[];
      es_porcentaje?: boolean;
      porcentaje?: number;
    },
  ) => void | Promise<Colaborador | void>;
  onActualizarCliente: (
    c: Colaborador,
    extras?: {
      tipo_pago_id?: string;
      pantalla_ids?: string[];
      producto_ids?: string[];
      es_porcentaje?: boolean;
      porcentaje?: number;
      codigo_edicion?: string;
    },
  ) => void | Promise<Colaborador | void>;
  onAsignarPantalla: (a: AsignacionPantalla) => void;
  onEliminarPantallasYAsignaciones: (id: string) => void;
  onDesasignarPantalla: (clienteId: string, pantallaId: string) => void;
  onAgregarProducto?: (p: Producto) => void;
  onActualizarProducto?: (p: Producto) => void;
  onEliminarProducto?: (id: string) => void;
  onAsignarProducto?: (a: AsignacionProductoExtra) => void;
}

export const GestorPantallasClientes: React.FC<GestorPantallasClientesProps> = ({
  profile, tiposPago, pantallas, clientes, asignaciones,
  productos = [], asignacionesProductos = [],
  onAgregarPantalla, onActualizarPantalla, onEliminarPantalla,
  onAgregarCliente, onActualizarCliente, onAsignarPantalla,
  onEliminarPantallasYAsignaciones,
  onAgregarProducto, onActualizarProducto, onEliminarProducto, onAsignarProducto,
}) => {
  const gestor = useGestorColaboradores({
    profile, tiposPago, pantallas, asignaciones, productos, asignacionesProductos,
    onAgregarPantalla, onActualizarPantalla, onEliminarPantalla,
    onAgregarCliente, onActualizarCliente, onAsignarPantalla,
    onEliminarPantallasYAsignaciones,
    onAgregarProducto, onActualizarProducto, onEliminarProducto, onAsignarProducto,
  });

  return (
    <div className="gestor-pantallas-clientes">
      <div className="gestor-colab-topbar">
        <h2>Gestión de Colaboradores</h2>
        <button
          className="btn btn-flotante-mini"
          onClick={() => gestor.setMostrarModal(true)}
        >
          <span style={{ fontSize: "1.1em", marginRight: 6 }}>＋</span>
          Agregar Colaborador
        </button>
      </div>

      <ColaboradorList
        clientes={clientes}
        pantallas={pantallas}
        asignaciones={asignaciones}
        productos={productos}
        asignacionesProductos={asignacionesProductos}
        onAbrirModal={() => gestor.setMostrarModal(true)}
        onEditar={gestor.handleEditar}
        onEliminar={gestor.handleEliminar}
        canEliminar={profile?.rol === "admin"}
        canCrear={true}
        mostrarBotonHeader={false}
      />

      {gestor.mostrarModal && (
        <ColaboradorModal
          modoEdicion={gestor.modoEdicion}
          formData={gestor.formData}
          formSetters={gestor.formSetters}
          pantallasForm={gestor.pantallasForm}
          productosForm={gestor.productosForm}
          tiposPago={gestor.tiposPago}
          pantallas={gestor.pantallas}
          productos={gestor.productos}
          canEditarTipoPago={gestor.canEditarTipoPago}
          errorColaborador={gestor.errorColaborador}
          errorPantalla={gestor.errorPantalla}
          mensajeGuardado={gestor.mensajeGuardado}
          guardando={gestor.guardando}
          onGuardar={gestor.handleGuardar}
          onCerrar={gestor.resetFormulario}
        />
      )}

      {gestor.mostrarModalCodigo && (
        <div
          className="modal-overlay"
          onClick={() => gestor.cerrarModalCodigo()}
        >
          <div className="modal-contenido" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Código requerido para editar</h3>
              <button
                className="modal-close"
                onClick={() => gestor.cerrarModalCodigo()}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>{gestor.mensajeCodigo}</p>
              <div className="form-group">
                <label>Código de edición</label>
                <input
                  type="text"
                  value={gestor.codigoEdicion}
                  onChange={(e) => gestor.setCodigoEdicion(e.target.value)}
                  placeholder="Ingresa el código"
                />
              </div>
              {gestor.errorCodigo && (
                <div className="error-message">{gestor.errorCodigo}</div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={gestor.solicitarCodigoEdicion}>
                Solicitar código
              </button>
              <button className="btn btn-primary" onClick={gestor.validarCodigoEdicion}>
                Validar código
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
