import React, { useState } from "react";
import { Contrato, TipoCliente } from "../../types";
import "./ContratoForm.css";

interface ContratoFormProps {
  empresaId: string;
  empresaNombre: string;
  onAgregar: (contrato: Contrato) => void;
  onCancel: () => void;
}

export const ContratoForm: React.FC<ContratoFormProps> = ({
  empresaId,
  empresaNombre,
  onAgregar,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    tipoCliente: "simple" as TipoCliente,
    fechaInicio: "",
    fechaFin: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fechaInicio || !formData.fechaFin) {
      alert("Ambas fechas son obligatorias");
      return;
    }

    const fechaInicio = new Date(formData.fechaInicio);
    const fechaFin = new Date(formData.fechaFin);

    if (fechaFin <= fechaInicio) {
      alert("La fecha de fin debe ser posterior a la fecha de inicio");
      return;
    }

    const nuevoContrato: Contrato = {
      id: Date.now().toString(),
      empresaId,
      tipoCliente: formData.tipoCliente,
      fechaInicio,
      fechaFin,
      fechaCreacion: new Date(),
      estado: "activo",
    };

    onAgregar(nuevoContrato);
    setFormData({
      tipoCliente: "simple",
      fechaInicio: "",
      fechaFin: "",
    });
  };

  return (
    <div className="contrato-form-overlay">
      <div className="contrato-form-container">
        <h2>Nuevo Contrato - {empresaNombre}</h2>
        <form onSubmit={handleSubmit} className="contrato-form">
          <div className="form-group">
            <label htmlFor="tipoCliente">
              Tipo de Cliente <span className="required">*</span>
            </label>
            <select
              id="tipoCliente"
              name="tipoCliente"
              value={formData.tipoCliente}
              onChange={handleChange}
              required
            >
              <option value="simple">
                Simple (Pantalla única)
              </option>
              <option value="complejo">
                Complejo (Múltiples servicios)
              </option>
            </select>
            <p className="form-hint">
              {formData.tipoCliente === "simple"
                ? "Para contratos con un único cliente y pantalla"
                : "Para contratos con múltiples pantallas, publicidad y exhibiciones"}
            </p>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="fechaInicio">
                Fecha de Inicio <span className="required">*</span>
              </label>
              <input
                type="date"
                id="fechaInicio"
                name="fechaInicio"
                value={formData.fechaInicio}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="fechaFin">
                Fecha de Fin <span className="required">*</span>
              </label>
              <input
                type="date"
                id="fechaFin"
                name="fechaFin"
                value={formData.fechaFin}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="info-box">
            <p>
              <strong>Nota:</strong> Las órdenes de compra se generarán automáticamente
              desde la fecha de inicio hasta la fecha de fin según el tipo de
              frecuencia establecido.
            </p>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Crear Contrato
            </button>
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
