import React, { useState } from "react";
import { Empresa } from "../../types";
import "./EmpresaForm.css";

interface EmpresaFormProps {
  onAgregar: (empresa: Empresa) => void;
  onCancel: () => void;
}

export const EmpresaForm: React.FC<EmpresaFormProps> = ({
  onAgregar,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    nombre: "",
    rfc: "",
    direccion: "",
    telefono: "",
    contacto: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre.trim()) {
      alert("El nombre de la empresa es obligatorio");
      return;
    }

    const nuevaEmpresa: Empresa = {
      id: Date.now().toString(),
      nombre: formData.nombre,
      rfc: formData.rfc || undefined,
      direccion: formData.direccion || undefined,
      telefono: formData.telefono || undefined,
      contacto: formData.contacto || undefined,
      fechaCreacion: new Date(),
    };

    onAgregar(nuevaEmpresa);
    setFormData({
      nombre: "",
      rfc: "",
      direccion: "",
      telefono: "",
      contacto: "",
    });
  };

  return (
    <div className="empresa-form-overlay">
      <div className="empresa-form-container">
        <h2>Registrar Nueva Empresa</h2>
        <form onSubmit={handleSubmit} className="empresa-form">
          <div className="form-group">
            <label htmlFor="nombre">
              Nombre de la Empresa <span className="required">*</span>
            </label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Nombre de la empresa"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="rfc">RFC</label>
              <input
                type="text"
                id="rfc"
                name="rfc"
                value={formData.rfc}
                onChange={handleChange}
                placeholder="RFC"
              />
            </div>

            <div className="form-group">
              <label htmlFor="telefono">Teléfono</label>
              <input
                type="tel"
                id="telefono"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                placeholder="Teléfono"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="contacto">Contacto</label>
            <input
              type="text"
              id="contacto"
              name="contacto"
              value={formData.contacto}
              onChange={handleChange}
              placeholder="Nombre del contacto"
            />
          </div>

          <div className="form-group">
            <label htmlFor="direccion">Dirección</label>
            <textarea
              id="direccion"
              name="direccion"
              value={formData.direccion}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  direccion: e.target.value,
                }))
              }
              placeholder="Dirección"
              rows={3}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Guardar Empresa
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
