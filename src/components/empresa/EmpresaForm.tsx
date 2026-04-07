import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { backendApi } from "../../lib/backendApi";
import "./EmpresaForm.css";

interface EmpresaFormProps {
  onCancel?: () => void;
}

export const EmpresaForm: React.FC<EmpresaFormProps> = ({
  onCancel,
}) => {
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nombre_empresa: "",
    rfc: "",
    direccion: "",
    telefono: "",
    email: "",
    iva_percentaje: 16,
    dia_corte_ordenes: 20,
    activo: true,
  });

  const cargarConfiguracion = useCallback(async (silencioso = false) => {
    if (!silencioso) {
      setCargando(true);
      setMensaje(null);
    }
    try {
      const data = await backendApi.get("/api/configuracion");
      if (data) {
        setFormData({
          nombre_empresa: data.nombre_empresa ?? "",
          rfc: data.rfc ?? "",
          direccion: data.direccion ?? "",
          telefono: data.telefono ?? "",
          email: data.email ?? "",
          iva_percentaje: Number(data.iva_percentaje ?? 16),
          dia_corte_ordenes: Number(data.dia_corte_ordenes ?? 20),
          activo: Boolean(data.activo ?? true),
        });
      }
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : "Error al cargar configuración");
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarConfiguracion(false);
  }, [cargarConfiguracion]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : name === "iva_percentaje"
            ? Number(value)
            : name === "dia_corte_ordenes"
              ? Number(value)
            : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    if (!formData.nombre_empresa.trim()) {
      toast.warning("El nombre de la empresa es obligatorio.");
      return;
    }

    setGuardando(true);
    try {
      await backendApi.post("/api/configuracion", {
        nombreEmpresa: formData.nombre_empresa,
        rfc: formData.rfc || null,
        direccion: formData.direccion || null,
        telefono: formData.telefono || null,
        email: formData.email || null,
        ivaPercentaje: Number(formData.iva_percentaje || 0),
        diaCorteOrdenes: Number(formData.dia_corte_ordenes || 20),
        activo: formData.activo,
      });
      toast.success("Configuración guardada correctamente.");
      setMensaje("Configuración guardada correctamente");
      setEditando(false);
      await cargarConfiguracion(true);
    } catch (e) {
      const err = e instanceof Error ? e.message : "Error al guardar configuración";
      toast.error(err);
      setMensaje(err);
    } finally {
      setGuardando(false);
    }
  };

  const cerrarModalEdicion = () => {
    setEditando(false);
    setMensaje(null);
    void cargarConfiguracion(true);
  };

  return (
    <>
      {!editando ? (
        <div className="empresa-config-inline">
          <div className="empresa-config-layout">
            <div className="empresa-config-main">
              <div className="empresa-form-container empresa-form-container--inline">
                <h2>Configuración de Empresa</h2>
                {cargando && <p>Cargando configuración...</p>}
                {mensaje && <p>{mensaje}</p>}
                <div className="empresa-form empresa-form--readonly">
                  <div className="empresa-info-grid">
                    <div className="empresa-info-item empresa-info-item--full">
                      <span className="empresa-info-label">Nombre de la Empresa</span>
                      <span className="empresa-info-value">{formData.nombre_empresa || "-"}</span>
                    </div>
                    <div className="empresa-info-item">
                      <span className="empresa-info-label">RFC</span>
                      <span className="empresa-info-value">{formData.rfc || "-"}</span>
                    </div>
                    <div className="empresa-info-item">
                      <span className="empresa-info-label">Teléfono</span>
                      <span className="empresa-info-value">{formData.telefono || "-"}</span>
                    </div>
                    <div className="empresa-info-item empresa-info-item--full">
                      <span className="empresa-info-label">Email</span>
                      <span className="empresa-info-value">{formData.email || "-"}</span>
                    </div>
                    <div className="empresa-info-item empresa-info-item--full">
                      <span className="empresa-info-label">Dirección</span>
                      <span className="empresa-info-value empresa-info-value--multiline">
                        {formData.direccion || "-"}
                      </span>
                    </div>
                    <div className="empresa-info-item">
                      <span className="empresa-info-label">IVA (%)</span>
                      <span className="empresa-info-value">{String(formData.iva_percentaje)}</span>
                    </div>
                    <div className="empresa-info-item">
                      <span className="empresa-info-label">Activo</span>
                      <span className="empresa-info-value">{formData.activo ? "Sí" : "No"}</span>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setEditando(true)}
                      disabled={cargando}
                    >
                      Editar
                    </button>
                    {onCancel && (
                      <button type="button" className="btn btn-secondary" onClick={onCancel}>
                        Regresar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <aside
              className="empresa-corte-box"
              aria-label="Día de corte de órdenes de compra"
            >
              <span className="empresa-corte-box__title">Órdenes de compra</span>
              <span className="empresa-corte-box__label">Día de corte</span>
              <span className="empresa-corte-box__value">
                {String(formData.dia_corte_ordenes || 20)}
              </span>
            </aside>
          </div>
        </div>
      ) : (
        <div
          className="empresa-form-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="empresa-config-edit-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrarModalEdicion();
          }}
        >
          <div
            className="empresa-form-container empresa-form-container--edit-wide"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="empresa-config-edit-title">Editar configuración</h2>
            {mensaje && <p>{mensaje}</p>}
            <form onSubmit={handleSubmit} className="empresa-form empresa-form--edit-split">
              <div className="empresa-config-layout empresa-config-layout--modal">
                <div className="empresa-config-main empresa-config-main--form">
                  <div className="form-group">
                    <label htmlFor="nombre_empresa">
                      Nombre de la Empresa <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="nombre_empresa"
                      name="nombre_empresa"
                      value={formData.nombre_empresa}
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
                    <label htmlFor="email">Email</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="correo@empresa.com"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="direccion">Dirección</label>
                    <textarea
                      id="direccion"
                      name="direccion"
                      value={formData.direccion}
                      onChange={handleChange}
                      placeholder="Dirección"
                      rows={3}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="iva_percentaje">IVA (%)</label>
                      <input
                        type="number"
                        id="iva_percentaje"
                        name="iva_percentaje"
                        value={formData.iva_percentaje === 0 ? "" : formData.iva_percentaje}
                        onChange={handleChange}
                        min={0}
                        max={100}
                        step={0.01}
                      />
                    </div>
                    <div className="form-group empresa-form-group--checkbox">
                      <label htmlFor="activo">Activo</label>
                      <input
                        type="checkbox"
                        id="activo"
                        name="activo"
                        checked={formData.activo}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                <aside
                  className="empresa-corte-box empresa-corte-box--edit"
                  aria-label="Día de corte de órdenes de compra"
                >
                  <span className="empresa-corte-box__title">Órdenes de compra</span>
                  <div className="form-group">
                    <label htmlFor="dia_corte_ordenes">Día de corte</label>
                    <input
                      type="number"
                      id="dia_corte_ordenes"
                      name="dia_corte_ordenes"
                      value={formData.dia_corte_ordenes === 0 ? "" : formData.dia_corte_ordenes}
                      onChange={handleChange}
                      min={1}
                      max={31}
                      step={1}
                    />
                  </div>
                </aside>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={guardando}>
                  {guardando ? "Guardando..." : "Guardar configuración"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={cerrarModalEdicion}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
