import React from "react";

export interface CampoConfig {
  key: string;
  label: string;
  placeholder?: string;
  tipo?: "text" | "number";
}

export interface FilaItem {
  tempId: string;
  [key: string]: string | number;
}

interface FilasFormularioProps {
  titulo: string;
  campos: CampoConfig[];
  filas: FilaItem[];
  onActualizarCampo: (idx: number, campo: string, valor: string) => void;
  onAgregarFila: () => void;
  onEliminarFila: (idx: number) => void;
  textoAgregar?: string;
  error?: string;
}

export const FilasFormulario: React.FC<FilasFormularioProps> = ({
  titulo,
  campos,
  filas,
  onActualizarCampo,
  onAgregarFila,
  onEliminarFila,
  textoAgregar = "➕ Agregar otra fila",
  error,
}) => {
  return (
    <div className="seccion-formulario">
      <h4>{titulo}</h4>
      <div className="pantallas-formulario">
        {filas.map((fila, idx) => (
          <div key={fila.tempId} className="pantalla-fila">
            {campos.map((campo) => (
              <div className="form-group" key={campo.key}>
                <label>{campo.label}</label>
                <input
                  type={campo.tipo ?? "text"}
                  value={fila[campo.key] ?? ""}
                  onChange={(e) =>
                    onActualizarCampo(idx, campo.key, e.target.value)
                  }
                  placeholder={campo.placeholder}
                />
              </div>
            ))}
            {filas.length > 1 && (
              <button
                className="btn-eliminar-fila"
                onClick={() => onEliminarFila(idx)}
                type="button"
              >
                🗑️
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        className="btn btn-secondary btn-sm"
        onClick={onAgregarFila}
        type="button"
      >
        {textoAgregar}
      </button>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};
