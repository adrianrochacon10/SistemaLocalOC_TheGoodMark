// src/components/pantallas/ColaboradorModal.tsx
import React from "react";
import { ColaboradorForm } from "./ColaboradorForm";

interface Props {
  modoEdicion: boolean;
  formData: any;
  formSetters: any;
  pantallasForm: any;
  productosForm: any;
  errorColaborador: string;
  errorPantalla: string;
  onGuardar: () => void;
  onCerrar: () => void;
}

export const ColaboradorModal: React.FC<Props> = ({
  modoEdicion,
  formData,
  formSetters,
  pantallasForm,
  productosForm,
  errorColaborador,
  errorPantalla,
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
        <ColaboradorForm
          formData={formData}
          formSetters={formSetters}
          pantallasForm={pantallasForm}
          productosForm={productosForm}
          errorColaborador={errorColaborador}
          errorPantalla={errorPantalla}
        />
      </div>

      <div className="modal-footer">
        <button className="btn btn-outline" onClick={onCerrar}>
          Cancelar
        </button>
        <button className="btn btn-primary" onClick={onGuardar}>
          ✅ {modoEdicion ? "Guardar Cambios" : "Guardar Colaborador"}
        </button>
      </div>
    </div>
  </div>
);
