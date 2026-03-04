import React, { useState } from "react";
import { Pantalla } from "../../types";
import "./CatalogoPantallas.css";

interface CatalogoPantallasProps {
  pantallas: Pantalla[];
  onAgregarPantalla: (pantalla: Pantalla) => void;
  onEliminarPantalla: (pantallaId: string) => void;
}

export const CatalogoPantallas: React.FC<CatalogoPantallasProps> = ({
  pantallas,
  onAgregarPantalla,
  onEliminarPantalla,
}) => {
  const [nombre, setNombre] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [error, setError] = useState("");

  const handleCrear = () => {
    setError("");
    if (!nombre.trim()) {
      setError("El nombre de la pantalla es obligatorio");
      return;
    }
    const nueva: Pantalla = {
      id: "p" + Date.now() + Math.floor(Math.random() * 10000),
      nombre: nombre.trim(),
      ubicacion: ubicacion.trim() || undefined,
      precioUnitario: 0,
      activa: true,
      fechaCreacion: new Date(),
    };
    onAgregarPantalla(nueva);
    setNombre("");
    setUbicacion("");
  };

  return (
    <div className="catalogo-pantallas">
      <h2>📺 Catálogo de Pantallas</h2>
      <p className="catalogo-descripcion">
        Agrega aquí las pantallas disponibles. Luego, al dar de alta un
        colaborador, solo tendrás que seleccionar cuáles asignarle.
      </p>

        <div className="catalogo-form-card">
          <h3>➕ Nueva pantalla</h3>
          <div className="catalogo-form-grid">
            <div className="form-group">
              <label>Nombre de pantalla *</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Pantalla Principal"
              />
            </div>
            <div className="form-group">
              <label>Ubicación</label>
              <input
                type="text"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                placeholder="Ej: Centro Comercial"
              />
            </div>
          </div>
        {error && <div className="error-message">{error}</div>}
        <button type="button" className="btn btn-primary" onClick={handleCrear}>
          ✔️ Agregar pantalla
        </button>
      </div>

      <div className="catalogo-lista">
        <h3>Pantallas registradas ({pantallas.length})</h3>
        {pantallas.length === 0 ? (
          <p className="sin-pantallas">
            No hay pantallas. Agrega una arriba para poder asignarlas a
            colaboradores.
          </p>
        ) : (
          <ul className="lista-pantallas">
            {pantallas.map((p) => (
              <li key={p.id} className="item-pantalla">
                <div className="item-info">
                  <span className="item-nombre">{p.nombre}</span>
                  {p.ubicacion && (
                    <span className="item-ubicacion">{p.ubicacion}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-accion btn-eliminar"
                  onClick={() => {
                    if (confirm("¿Eliminar esta pantalla?")) {
                      onEliminarPantalla(p.id);
                    }
                  }}
                >
                  🗑️ Eliminar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
