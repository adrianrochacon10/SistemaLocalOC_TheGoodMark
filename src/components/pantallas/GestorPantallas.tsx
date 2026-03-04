import React, { useState } from "react";
import { Pantalla, AsignacionPantalla, Cliente } from "../../types";
import "./GestorPantallas.css";

interface GestorPantallasProps {
  pantallas: Pantalla[];
  clientes: Cliente[];
  asignaciones: AsignacionPantalla[];
  onAgregarPantalla: (pantalla: Pantalla) => void;
  onAsignarPantalla: (asignacion: AsignacionPantalla) => void;
  onEliminarPantalla: (id: string) => void;
  onAgregarCliente: (cliente: Cliente) => void;
}

export const GestorPantallas: React.FC<GestorPantallasProps> = ({
  pantallas,
  clientes,
  asignaciones,
  onAgregarPantalla,
  onAsignarPantalla,
  onEliminarPantalla,
  onAgregarCliente,
}) => {
  const [vistaActual, setVistaActual] = useState<"pantallas" | "clientes" | "asignaciones">(
    "pantallas"
  );

  // Estado para crear nueva pantalla
  const [nuevaPantalla, setNuevaPantalla] = useState({
    nombre: "",
    ubicacion: "",
    plaza: "",
    precioUnitario: 0,
  });

  // Estado para crear nuevo cliente
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: "",
    contacto: "",
    telefono: "",
    email: "",
  });

  // Estado para asignar pantalla
  const [asignacion, setAsignacion] = useState({
    pantallaId: "",
    clienteId: "",
    precioUnitario: 0,
  });

  const handleAgregarPantalla = () => {
    if (!nuevaPantalla.nombre || nuevaPantalla.precioUnitario <= 0) {
      alert("Completa los campos requeridos");
      return;
    }

    const pantalla: Pantalla = {
      id: Math.random().toString(36).substr(2, 9),
      nombre: nuevaPantalla.nombre,
      ubicacion: nuevaPantalla.ubicacion,
      plaza: nuevaPantalla.plaza,
      precioUnitario: nuevaPantalla.precioUnitario,
      activa: true,
      fechaCreacion: new Date(),
    };

    onAgregarPantalla(pantalla);
    setNuevaPantalla({ nombre: "", ubicacion: "", plaza: "", precioUnitario: 0 });
  };

  const handleAgregarCliente = () => {
    if (!nuevoCliente.nombre) {
      alert("El nombre del cliente es requerido");
      return;
    }

    const cliente: Cliente = {
      id: Math.random().toString(36).substr(2, 9),
      nombre: nuevoCliente.nombre,
      contacto: nuevoCliente.contacto,
      telefono: nuevoCliente.telefono,
      email: nuevoCliente.email,
      activo: true,
      fechaCreacion: new Date(),
    };

    onAgregarCliente(cliente);
    setNuevoCliente({ nombre: "", contacto: "", telefono: "", email: "" });
  };

  const handleAsignarPantalla = () => {
    if (!asignacion.pantallaId || !asignacion.clienteId || asignacion.precioUnitario <= 0) {
      alert("Completa todos los campos");
      return;
    }

    const nueva: AsignacionPantalla = {
      id: Math.random().toString(36).substr(2, 9),
      pantallaId: asignacion.pantallaId,
      clienteId: asignacion.clienteId,
      precioUnitario: asignacion.precioUnitario,
      activa: true,
      fechaAsignacion: new Date(),
    };

    onAsignarPantalla(nueva);
    setAsignacion({ pantallaId: "", clienteId: "", precioUnitario: 0 });
  };

  const pantallasActivas = pantallas.filter((p) => p.activa);
  const clientesActivos = clientes.filter((c) => c.activo);
  const asignacionesActivas = asignaciones.filter((a) => a.activa);

  const obtenerNombrePantalla = (id: string) => pantallas.find((p) => p.id === id)?.nombre || "";
  const obtenerNombreCliente = (id: string) => clientes.find((c) => c.id === id)?.nombre || "";

  return (
    <div className="gestor-pantallas">
      <div className="gestor-nav">
        <button
          className={`nav-item ${vistaActual === "pantallas" ? "active" : ""}`}
          onClick={() => setVistaActual("pantallas")}
        >
          📺 Pantallas ({pantallasActivas.length})
        </button>
        <button
          className={`nav-item ${vistaActual === "clientes" ? "active" : ""}`}
          onClick={() => setVistaActual("clientes")}
        >
          🏢 Clientes ({clientesActivos.length})
        </button>
        <button
          className={`nav-item ${vistaActual === "asignaciones" ? "active" : ""}`}
          onClick={() => setVistaActual("asignaciones")}
        >
          🔗 Asignaciones ({asignacionesActivas.length})
        </button>
      </div>

      <div className="gestor-content">
        {/* VISTA PANTALLAS */}
        {vistaActual === "pantallas" && (
          <div className="vista-pantallas">
            <h2>Gestión de Pantallas</h2>

            <div className="form-section">
              <h3>Nueva Pantalla</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    value={nuevaPantalla.nombre}
                    onChange={(e) =>
                      setNuevaPantalla({ ...nuevaPantalla, nombre: e.target.value })
                    }
                    placeholder="Ej: Pantalla Centro"
                  />
                </div>
                <div className="form-group">
                  <label>Ubicación</label>
                  <input
                    type="text"
                    value={nuevaPantalla.ubicacion}
                    onChange={(e) =>
                      setNuevaPantalla({ ...nuevaPantalla, ubicacion: e.target.value })
                    }
                    placeholder="Ej: Centro Comercial"
                  />
                </div>
                <div className="form-group">
                  <label>Plaza</label>
                  <input
                    type="text"
                    value={nuevaPantalla.plaza}
                    onChange={(e) =>
                      setNuevaPantalla({ ...nuevaPantalla, plaza: e.target.value })
                    }
                    placeholder="Ej: Plazuela"
                  />
                </div>
                <div className="form-group">
                  <label>Precio Unitario ($/día) *</label>
                  <input
                    type="number"
                    value={nuevaPantalla.precioUnitario}
                    onChange={(e) =>
                      setNuevaPantalla({
                        ...nuevaPantalla,
                        precioUnitario: parseFloat(e.target.value),
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
              <button className="btn btn-primary" onClick={handleAgregarPantalla}>
                ➕ Agregar Pantalla
              </button>
            </div>

            <div className="list-section">
              <h3>Pantallas Disponibles</h3>
              {pantallasActivas.length === 0 ? (
                <p className="empty-msg">No hay pantallas registradas</p>
              ) : (
                <div className="pantallas-grid">
                  {pantallasActivas.map((p) => (
                    <div key={p.id} className="pantalla-card">
                      <div className="card-header">
                        <h4>{p.nombre}</h4>
                        <button
                          className="btn-remove"
                          onClick={() => onEliminarPantalla(p.id)}
                          title="Eliminar"
                        >
                          ✕
                        </button>
                      </div>
                      {p.ubicacion && <p><strong>Ubicación:</strong> {p.ubicacion}</p>}
                      {p.plaza && <p><strong>Plaza:</strong> {p.plaza}</p>}
                      <p className="price"><strong>Precio:</strong> ${p.precioUnitario.toFixed(2)}/día</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VISTA CLIENTES */}
        {vistaActual === "clientes" && (
          <div className="vista-clientes">
            <h2>Gestión de Clientes</h2>

            <div className="form-section">
              <h3>Nuevo Cliente</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    value={nuevoCliente.nombre}
                    onChange={(e) =>
                      setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })
                    }
                    placeholder="Ej: Cliente 1"
                  />
                </div>
                <div className="form-group">
                  <label>Contacto</label>
                  <input
                    type="text"
                    value={nuevoCliente.contacto}
                    onChange={(e) =>
                      setNuevoCliente({ ...nuevoCliente, contacto: e.target.value })
                    }
                    placeholder="Nombre del contacto"
                  />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="text"
                    value={nuevoCliente.telefono}
                    onChange={(e) =>
                      setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })
                    }
                    placeholder="Teléfono"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={nuevoCliente.email}
                    onChange={(e) =>
                      setNuevoCliente({ ...nuevoCliente, email: e.target.value })
                    }
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <button className="btn btn-primary" onClick={handleAgregarCliente}>
                ➕ Agregar Cliente
              </button>
            </div>

            <div className="list-section">
              <h3>Clientes Activos</h3>
              {clientesActivos.length === 0 ? (
                <p className="empty-msg">No hay clientes registrados</p>
              ) : (
                <div className="clientes-list">
                  {clientesActivos.map((c) => (
                    <div key={c.id} className="cliente-item">
                      <div>
                        <h4>{c.nombre}</h4>
                        {c.contacto && <p><strong>Contacto:</strong> {c.contacto}</p>}
                        {c.telefono && <p><strong>Tel:</strong> {c.telefono}</p>}
                        {c.email && <p><strong>Email:</strong> {c.email}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VISTA ASIGNACIONES */}
        {vistaActual === "asignaciones" && (
          <div className="vista-asignaciones">
            <h2>Asignación de Pantallas a Clientes</h2>

            <div className="form-section">
              <h3>Asignar Pantalla</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Pantalla *</label>
                  <select
                    value={asignacion.pantallaId}
                    onChange={(e) =>
                      setAsignacion({ ...asignacion, pantallaId: e.target.value })
                    }
                  >
                    <option value="">-- Seleccionar pantalla --</option>
                    {pantallasActivas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Cliente *</label>
                  <select
                    value={asignacion.clienteId}
                    onChange={(e) =>
                      setAsignacion({ ...asignacion, clienteId: e.target.value })
                    }
                  >
                    <option value="">-- Seleccionar cliente --</option>
                    {clientesActivos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Precio Unitario ($/día) *</label>
                  <input
                    type="number"
                    value={asignacion.precioUnitario}
                    onChange={(e) =>
                      setAsignacion({
                        ...asignacion,
                        precioUnitario: parseFloat(e.target.value),
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
              <button className="btn btn-primary" onClick={handleAsignarPantalla}>
                🔗 Asignar Pantalla
              </button>
            </div>

            <div className="list-section">
              <h3>Pantallas Asignadas</h3>
              {asignacionesActivas.length === 0 ? (
                <p className="empty-msg">No hay asignaciones</p>
              ) : (
                <div className="asignaciones-list">
                  {asignacionesActivas.map((a) => (
                    <div key={a.id} className="asignacion-item">
                      <div>
                        <h4>{obtenerNombrePantalla(a.pantallaId)}</h4>
                        <p>
                          <strong>Cliente:</strong> {obtenerNombreCliente(a.clienteId)}
                        </p>
                        <p>
                          <strong>Precio:</strong> ${a.precioUnitario.toFixed(2)}/día
                        </p>
                        <p className="date">
                          Asignada: {new Date(a.fechaAsignacion).toLocaleDateString("es-MX")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
