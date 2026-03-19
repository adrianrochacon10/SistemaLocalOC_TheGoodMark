// src/components/pantallas/ColaboradorForm.tsx
import React from "react";
import { TipoComision } from "../GestorColaboradores";
import { ColorPicker } from "../../ui/ColorPicker";
import { FilasFormulario } from "../../pantallas/components/FilasFormulario";

interface Props {
  formData: {
    nombre: string;
    alias: string;
    telefono: string;
    email: string;
    color: string;
    tipoComision: TipoComision;
    porcentaje: number;
  };
  formSetters: {
    setNombre: (v: string) => void;
    setAlias: (v: string) => void;
    setTelefono: (v: string) => void;
    setEmail: (v: string) => void;
    setColor: (v: string) => void;
    setTipoComision: (v: TipoComision) => void;
    setPorcentaje: (v: number) => void;
  };
  pantallasForm: any;
  productosForm: any;
  errorColaborador: string;
  errorPantalla: string;
}

export const ColaboradorForm: React.FC<Props> = ({
  formData,
  formSetters,
  pantallasForm,
  productosForm,
  errorColaborador,
  errorPantalla,
}) => {
  const { nombre, alias, telefono, email, color, tipoComision, porcentaje } =
    formData;
  const {
    setNombre,
    setAlias,
    setTelefono,
    setEmail,
    setColor,
    setTipoComision,
    setPorcentaje,
  } = formSetters;

  return (
    <>
      <div className="seccion-formulario">
        <h4>Datos del Colaborador</h4>

        <div className="form-group">
          <label>Nombre del Colaborador *</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Juan Pérez"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Alias</label>
            <input
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Nombre del contacto"
            />
          </div>
          <div className="form-group">
            <label>Teléfono</label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="555-1234-5678"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@colaborador.com"
          />
        </div>

        <div className="form-group">
          <label>Color para identificar colaborador</label>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        <div className="form-group">
          <label>Tipo de comisión *</label>
          <select
            value={tipoComision}
            onChange={(e) => setTipoComision(e.target.value as TipoComision)}
            className="form-select"
          >
            <option value="ninguno">Ninguno</option>
            <option value="porcentaje">Porcentaje</option>
            <option value="consideracion">Consideración</option>
            <option value="precio_fijo">Precio fijo</option>
          </select>
        </div>

        {tipoComision === "porcentaje" && (
          <div className="form-group" style={{ marginTop: "-8px" }}>
            <label>Porcentaje (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={porcentaje}
              onChange={(e) =>
                setPorcentaje(
                  e.target.value === "" ? 0 : parseInt(e.target.value) || 0,
                )
              }
              placeholder="Ej: 30"
            />
          </div>
        )}

        {errorColaborador && (
          <div className="error-message">{errorColaborador}</div>
        )}
      </div>

      <FilasFormulario
        titulo="Pantallas Asociadas *"
        campos={[
          {
            key: "nombre",
            label: "Nombre de Pantalla",
            placeholder: "Ej: Pantalla Principal",
          },
        ]}
        filas={pantallasForm.filas}
        onActualizarCampo={pantallasForm.actualizarCampo}
        onAgregarFila={pantallasForm.agregarFila}
        onEliminarFila={pantallasForm.eliminarFila}
        textoAgregar="➕ Agregar otra Pantalla"
        error={errorPantalla}
      />

      <FilasFormulario
        titulo="Otros Productos Asociados"
        campos={[
          {
            key: "nombre",
            label: "Nombre de Producto",
            placeholder: "Ej: Valla Principal",
          },
          {
            key: "precio",
            label: "Precio",
            placeholder: "Ej: 5000",
            tipo: "number",
          },
        ]}
        filas={productosForm.filas}
        onActualizarCampo={productosForm.actualizarCampo}
        onAgregarFila={productosForm.agregarFila}
        onEliminarFila={productosForm.eliminarFila}
        textoAgregar="➕ Agregar otro Producto"
      />
    </>
  );
};
