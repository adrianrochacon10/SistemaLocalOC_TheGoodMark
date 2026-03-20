// src/components/pantallas/ColaboradorModal.tsx
import React from "react";
import { ColaboradorForm } from "./ColaboradorForm";

interface Props {
  modoEdicion: boolean;
  formData: any;
  formSetters: any;
  pantallasForm: any;
  productosForm: any;
  tiposPago: Array<{ id: string; nombre: string }>;
  pantallas: Array<{ id: string; nombre: string }>;
  productos: Array<{ id: string; nombre: string; precio: number }>;
  canEditarTipoPago?: boolean;
  errorColaborador: string;
  errorPantalla: string;
  mensajeGuardado?: string;
  guardando: boolean;
  onGuardar: () => void | Promise<void>;
  onCerrar: () => void;
}

export const ColaboradorModal: React.FC<Props> = ({
  modoEdicion,
  formData,
  formSetters,
  pantallasForm,
  productosForm,
  tiposPago,
  pantallas,
  productos,
  canEditarTipoPago,
  errorColaborador,
  errorPantalla,
  mensajeGuardado,
  guardando,
  onGuardar,
  onCerrar,
}) => (
  <div className="modal-overlay" onClick={onCerrar}>
    <div className="modal-contenido" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h3>
          {modoEdicion ? "Editar Colaborador" : "Agregar Nuevo Colaborador"}
        </h3>
        <button className="modal-close" onClick={onCerrar}>
          ✕
        </button>
      </div>

      <div className="modal-body">
        {mensajeGuardado && (
          <div style={{ color: "#16a34a", marginBottom: 12 }}>{mensajeGuardado}</div>
        )}
        <ColaboradorForm
          formData={formData}
          formSetters={formSetters}
          pantallasForm={pantallasForm}
          productosForm={productosForm}
          tiposPago={tiposPago}
          canEditarTipoPago={canEditarTipoPago}
          errorColaborador={errorColaborador}
          errorPantalla={errorPantalla}
        />
      </div>

      <div className="modal-footer">
        <button className="btn btn-outline" onClick={onCerrar} disabled={guardando}>
          Cancelar
        </button>
        <button className="btn btn-primary" onClick={onGuardar} disabled={guardando}>
          ✅ {guardando ? "Guardando..." : modoEdicion ? "Guardar Cambios" : "Guardar Colaborador"}
        </button>
      </div>
    </div>
  </div>
);
