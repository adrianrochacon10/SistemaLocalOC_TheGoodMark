// src/components/pantallas/ColaboradorForm.tsx
import React from "react";
import { ColorPicker } from "../../ui/ColorPicker";
import { FilasFormulario } from "./FilaFormulario";

interface Props {
  formData: {
    nombre: string;
    alias: string;
    telefono: string;
    email: string;
    color: string;
    porcentaje: number;
    tipoPagoId: string;
    esTipoPagoPorcentaje: boolean;
  };
  formSetters: {
    setNombre: (v: string) => void;
    setAlias: (v: string) => void;
    setTelefono: (v: string) => void;
    setEmail: (v: string) => void;
    setColor: (v: string) => void;
    setPorcentaje: (v: number) => void;
    setTipoPagoId: (v: string) => void;
  };
  pantallasForm: any;
  productosForm: any;
  tiposPago: Array<{ id: string; nombre: string }>;
  canEditarTipoPago?: boolean;
  errorColaborador: string;
  errorPantalla: string;
}

export const ColaboradorForm: React.FC<Props> = ({
  formData,
  formSetters,
  pantallasForm,
  productosForm,
  tiposPago,
  canEditarTipoPago = true,
  errorColaborador,
  errorPantalla,
}) => {
  const {
    nombre,
    alias,
    telefono,
    email,
    color,
    porcentaje,
    tipoPagoId,
    esTipoPagoPorcentaje,
  } =
    formData;
  const {
    setNombre,
    setAlias,
    setTelefono,
    setEmail,
    setColor,
    setPorcentaje,
    setTipoPagoId,
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

        {esTipoPagoPorcentaje && (
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

        <div className="form-group">
          <label>Tipo de pago</label>
          <select
            value={tipoPagoId}
            onChange={(e) => setTipoPagoId(e.target.value)}
            className="form-select"
            disabled={!canEditarTipoPago}
          >
            <option value="">Selecciona tipo de pago</option>
            {tiposPago.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>

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
            placeholder: "Ej: Cantarranas",
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
            placeholder: "Ej: Espectacular",
          },
          {
            key: "precio",
            label: "Precio",
            placeholder: "Ej: 123.45",
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
