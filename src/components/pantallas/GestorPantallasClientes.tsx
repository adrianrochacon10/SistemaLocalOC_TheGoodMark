import React, { useState } from "react";
import { ColorPicker } from "../ui/ColorPicker";
import { Pantalla, Cliente, AsignacionPantalla } from "../../types";
import "./GestorPantallasClientes.css";

interface GestorPantallasClientesProps {
  pantallas: Pantalla[];
  clientes: Cliente[];
  asignaciones: AsignacionPantalla[];
  onAgregarPantalla: (pantalla: Pantalla) => void;
  onActualizarPantalla: (pantalla: Pantalla) => void;
  onEliminarPantalla: (pantallaId: string) => void;
  onAgregarCliente: (cliente: Cliente) => void;
  onActualizarCliente: (cliente: Cliente) => void;
  onAsignarPantalla: (asignacion: AsignacionPantalla) => void;
  onEliminarPantallasYAsignaciones: (colaboradorId: string) => void;
  onDesasignarPantalla: (clienteId: string, pantallaId: string) => void;
}

export const GestorPantallasClientes: React.FC<
  GestorPantallasClientesProps
> = ({
  pantallas,
  clientes,
  asignaciones,
  onAgregarPantalla,
  onActualizarPantalla,
  onEliminarPantalla,
  onAgregarCliente,
  onActualizarCliente,
  onAsignarPantalla,
  onDesasignarPantalla, // ✅
  onEliminarPantallasYAsignaciones, // ✅
}) => {
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [colaboradorEditando, setColaboradorEditando] = useState<string | null>(
    null,
  );
  const [nuevoColaboradorNombre, setNuevoColaboradorNombre] = useState("");
  const [nuevoColaboradorContacto, setNuevoColaboradorContacto] = useState("");
  const [nuevoColaboradorTel, setNuevoColaboradorTel] = useState("");
  const [nuevoColaboradorEmail, setNuevoColaboradorEmail] = useState("");
  const [nuevoColaboradorColor, setNuevoColaboradorColor] = useState("");
  const [nuevoColaboradorPorcentajeSocio, setNuevoColaboradorPorcentajeSocio] =
    useState<number>(30);
  const [errorColaborador, setErrorColaborador] = useState("");
  // ✅ FIX 2: eliminadas las líneas incorrectas de useState para pantallas/asignaciones
  const [pantallasAgregar, setPantallasAgregar] = useState<
    Array<{ nombre: string; ubicacion: string; tempId: string }>
  >([
    {
      nombre: "",
      ubicacion: "",
      tempId: Math.random().toString(36).substring(2, 15),
    },
  ]);
  const [errorPantalla, setErrorPantalla] = useState("");

  const handleAgregarColaborador = () => {
    setErrorColaborador("");
    setErrorPantalla("");

    if (!nuevoColaboradorNombre.trim()) {
      setErrorColaborador("El nombre del colaborador es requerido");
      return;
    }

    const pantallasValidas = pantallasAgregar.filter((p) => p.nombre.trim());
    if (pantallasValidas.length === 0) {
      setErrorPantalla("Debe agregar al menos una pantalla");
      return;
    }

    const nuevoColaborador: Cliente = {
      id:
        modoEdicion && colaboradorEditando
          ? colaboradorEditando
          : "c" + Date.now() + Math.floor(Math.random() * 10000),
      nombre: nuevoColaboradorNombre,
      contacto: nuevoColaboradorContacto || undefined,
      telefono: nuevoColaboradorTel || undefined,
      email: nuevoColaboradorEmail || undefined,
      color: nuevoColaboradorColor || undefined,
      porcentajeSocio: nuevoColaboradorPorcentajeSocio,
      activo: true,
      fechaCreacion: new Date(),
    };

    if (modoEdicion && colaboradorEditando) {
      onActualizarCliente(nuevoColaborador);
    } else {
      onAgregarCliente(nuevoColaborador);
    }

    if (modoEdicion && colaboradorEditando) {
      const idsOriginales = asignaciones
        .filter((a) => a.clienteId === colaboradorEditando && a.activa)
        .map((a) => a.pantallaId);

      const idsEnForm = pantallasValidas
        .filter((p) => pantallas.some((existing) => existing.id === p.tempId))
        .map((p) => p.tempId);

      idsOriginales.forEach((pantallaId) => {
        if (!idsEnForm.includes(pantallaId)) {
          onEliminarPantalla(pantallaId); // ✅ FIX 3: llamar prop directamente
        }
      });

      pantallasValidas.forEach((pantallaData, idx) => {
        const pantallaExistente = pantallas.find(
          (p) => p.id === pantallaData.tempId,
        );

        if (pantallaExistente) {
          onActualizarPantalla({
            // ✅ FIX 3: llamar prop directamente
            ...pantallaExistente,
            nombre: pantallaData.nombre,
            ubicacion: pantallaData.ubicacion || undefined,
          });
        } else {
          const uniqueId = Date.now() + idx + Math.floor(Math.random() * 10000);
          const nuevaPantalla: Pantalla = {
            id: "p" + uniqueId,
            nombre: pantallaData.nombre,
            ubicacion: pantallaData.ubicacion || undefined,
            plaza: undefined,
            precioUnitario: 0,
            activa: true,
            fechaCreacion: new Date(),
          };
          onAgregarPantalla(nuevaPantalla);
          onAsignarPantalla({
            id: "a" + uniqueId,
            pantallaId: nuevaPantalla.id,
            clienteId: nuevoColaborador.id,
            precioUnitario: 0,
            activa: true,
            fechaAsignacion: new Date(),
          });
        }
      });
    } else {
      pantallasValidas.forEach((pantallaData, idx) => {
        const uniqueId = Date.now() + idx + Math.floor(Math.random() * 10000);
        const nuevaPantalla: Pantalla = {
          id: "p" + uniqueId,
          nombre: pantallaData.nombre,
          ubicacion: pantallaData.ubicacion || undefined,
          plaza: undefined,
          precioUnitario: 0,
          activa: true,
          fechaCreacion: new Date(),
        };
        onAgregarPantalla(nuevaPantalla);
        onAsignarPantalla({
          id: "a" + uniqueId,
          pantallaId: nuevaPantalla.id,
          clienteId: nuevoColaborador.id,
          precioUnitario: 0,
          activa: true,
          fechaAsignacion: new Date(),
        });
      });
    }

    setNuevoColaboradorNombre("");
    setNuevoColaboradorContacto("");
    setNuevoColaboradorTel("");
    setNuevoColaboradorEmail("");
    setNuevoColaboradorColor("");
    setNuevoColaboradorPorcentajeSocio(30);
    setPantallasAgregar([
      {
        nombre: "",
        ubicacion: "",
        tempId: Math.random().toString(36).substring(2, 15),
      },
    ]);
    setMostrarModal(false);
    setModoEdicion(false);
    setColaboradorEditando(null);
  };

  // ✅ FIX 4: renombrada para actualizar campos del formulario (sin conflicto)
  const handleActualizarCampoPantalla = (
    idx: number,
    campo: string,
    valor: string,
  ) => {
    const nuevas = [...pantallasAgregar];
    nuevas[idx] = { ...nuevas[idx], [campo]: valor };
    setPantallasAgregar(nuevas);
  };

  const handleEliminarFilaPantalla = (idx: number) => {
    if (pantallasAgregar.length > 1) {
      setPantallasAgregar(pantallasAgregar.filter((_, i) => i !== idx));
    }
  };

  const handleAgregarFilaPantalla = () => {
    setPantallasAgregar([
      ...pantallasAgregar,
      {
        nombre: "",
        ubicacion: "",
        tempId: Math.random().toString(36).substring(2, 15),
      },
    ]);
  };

  const handleEditarColaborador = (colaborador: Cliente) => {
    setNuevoColaboradorNombre(colaborador.nombre);
    setNuevoColaboradorContacto(colaborador.contacto || "");
    setNuevoColaboradorTel(colaborador.telefono || "");
    setNuevoColaboradorEmail(colaborador.email || "");
    setNuevoColaboradorColor(colaborador.color || "");
    setNuevoColaboradorPorcentajeSocio(colaborador.porcentajeSocio || 30);
    const pantallasAsociadas = asignaciones
      .filter((a) => a.clienteId === colaborador.id && a.activa)
      .map((a) => {
        const pantalla = pantallas.find((p) => p.id === a.pantallaId);
        return pantalla
          ? {
              nombre: pantalla.nombre,
              ubicacion: pantalla.ubicacion || "",
              tempId: pantalla.id,
            }
          : null;
      })
      .filter((p) => p !== null) as Array<{
      nombre: string;
      ubicacion: string;
      tempId: string;
    }>;
    setPantallasAgregar(
      pantallasAsociadas.length > 0
        ? pantallasAsociadas
        : [
            {
              nombre: "",
              ubicacion: "",
              tempId: Math.random().toString(36).substring(2, 15),
            },
          ],
    );
    setModoEdicion(true);
    setColaboradorEditando(colaborador.id);
    setMostrarModal(true);
  };

  const handleEliminarColaborador = (colaboradorId: string) => {
    if (
      confirm(
        "¿Está seguro de que desea eliminar este colaborador y todas sus pantallas asociadas?",
      )
    ) {
      onEliminarPantallasYAsignaciones(colaboradorId);
    }
  };

  const colaboradoresActivos = clientes.filter((c) => c.activo);

  const obtenerPantallasDelColaborador = (colaboradorId: string) => {
    return asignaciones
      .filter((a) => a.clienteId === colaboradorId && a.activa)
      .map((a) => pantallas.find((p) => p.id === a.pantallaId))
      .filter((p) => p !== undefined) as Pantalla[];
  };

  return (
    <div className="gestor-pantallas-clientes">
      <h2>📺 Gestión de Colaboradores y Pantallas</h2>

      {colaboradoresActivos.length === 0 ? (
        <div className="estado-vacio">
          <div className="estado-vacio-contenido">
            <div className="icono-grande">👥</div>
            <h3>No hay colaboradores registrados</h3>
            <p>
              Comienza agregando tu primer colaborador y sus pantallas
              asociadas.
            </p>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => setMostrarModal(true)}
            >
              ➕ Agregar Colaborador
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="header-colaboradores">
            <button
              className="btn btn-flotante-mini"
              onClick={() => setMostrarModal(true)}
            >
              <span style={{ fontSize: "1.1em", marginRight: 6 }}>＋</span>{" "}
              Agregar Colaborador
            </button>
          </div>

          <div className="colaboradores-grid">
            {colaboradoresActivos.map((colaborador) => {
              const pantallasDelCol = obtenerPantallasDelColaborador(
                colaborador.id,
              );
              return (
                <div key={colaborador.id} className="colaborador-card">
                  <div className="colaborador-header">
                    <h4>{colaborador.nombre}</h4>
                    <span className="badge-pantallas">
                      {pantallasDelCol.length} pantalla
                      {pantallasDelCol.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {colaborador.contacto && (
                    <p>
                      <strong>Contacto:</strong> {colaborador.contacto}
                    </p>
                  )}
                  {colaborador.telefono && (
                    <p>
                      <strong>Teléfono:</strong> {colaborador.telefono}
                    </p>
                  )}
                  {colaborador.email && (
                    <p>
                      <strong>Email:</strong> {colaborador.email}
                    </p>
                  )}
                  {pantallasDelCol.length > 0 && (
                    <div className="pantallas-asociadas">
                      <h5>Pantallas Asociadas</h5>
                      <ul className="pantallas-list">
                        {pantallasDelCol.map((pantalla) => (
                          <li key={pantalla.id}>
                            <span className="pantalla-nombre">
                              {pantalla.nombre}
                            </span>
                            {pantalla.ubicacion && (
                              <span className="pantalla-ubicacion">
                                {pantalla.ubicacion}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="colaborador-acciones">
                    <button
                      className="btn btn-accion btn-editar"
                      onClick={() => handleEditarColaborador(colaborador)}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      className="btn btn-accion btn-eliminar"
                      onClick={() => handleEliminarColaborador(colaborador.id)}
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {mostrarModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setMostrarModal(false);
            setModoEdicion(false);
            setColaboradorEditando(null);
          }}
        >
          <div className="modal-contenido" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modoEdicion
                  ? "Editar Colaborador"
                  : "Agregar Nuevo Colaborador"}
              </h3>
              <button
                className="modal-close"
                onClick={() => setMostrarModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="seccion-formulario">
                <h4>Datos del Colaborador</h4>
                <div className="form-group">
                  <label>Nombre del Colaborador *</label>
                  <input
                    type="text"
                    value={nuevoColaboradorNombre}
                    onChange={(e) => setNuevoColaboradorNombre(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Contacto</label>
                    <input
                      type="text"
                      value={nuevoColaboradorContacto}
                      onChange={(e) =>
                        setNuevoColaboradorContacto(e.target.value)
                      }
                      placeholder="Nombre del contacto"
                    />
                  </div>
                  <div className="form-group">
                    <label>Teléfono</label>
                    <input
                      type="text"
                      value={nuevoColaboradorTel}
                      onChange={(e) => setNuevoColaboradorTel(e.target.value)}
                      placeholder="555-1234-5678"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={nuevoColaboradorEmail}
                    onChange={(e) => setNuevoColaboradorEmail(e.target.value)}
                    placeholder="correo@colaborador.com"
                  />
                </div>
                <div className="form-group">
                  <label>Color para identificar colaborador</label>
                  <ColorPicker
                    value={nuevoColaboradorColor}
                    onChange={setNuevoColaboradorColor}
                  />
                </div>
                <div className="form-group">
                  <label>Porcentaje para socio/dueño (%) *</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={nuevoColaboradorPorcentajeSocio}
                    onChange={(e) =>
                      setNuevoColaboradorPorcentajeSocio(
                        e.target.value === ""
                          ? 0
                          : parseInt(e.target.value) || 0,
                      )
                    }
                    placeholder="Ej: 30"
                  />
                </div>
                {errorColaborador && (
                  <div className="error-message">{errorColaborador}</div>
                )}
              </div>

              <div className="seccion-formulario">
                <h4>Pantallas Asociadas *</h4>
                <div className="pantallas-formulario">
                  {pantallasAgregar.map((pantalla, idx) => (
                    <div key={pantalla.tempId} className="pantalla-fila">
                      <div className="form-group">
                        <label>Nombre de Pantalla</label>
                        {/* ✅ FIX 4: usando el nombre correcto handleActualizarCampoPantalla */}
                        <input
                          type="text"
                          value={pantalla.nombre}
                          onChange={(e) =>
                            handleActualizarCampoPantalla(
                              idx,
                              "nombre",
                              e.target.value,
                            )
                          }
                          placeholder="Ej: Pantalla Principal"
                        />
                      </div>
                      <div className="form-group">
                        <label>Ubicación</label>
                        <input
                          type="text"
                          value={pantalla.ubicacion}
                          onChange={(e) =>
                            handleActualizarCampoPantalla(
                              idx,
                              "ubicacion",
                              e.target.value,
                            )
                          }
                          placeholder="Ej: Centro Comercial"
                        />
                      </div>
                      {pantallasAgregar.length > 1 && (
                        <button
                          className="btn-eliminar-fila"
                          onClick={() => handleEliminarFilaPantalla(idx)}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleAgregarFilaPantalla}
                >
                  ➕ Agregar otra Pantalla
                </button>
                {errorPantalla && (
                  <div className="error-message">{errorPantalla}</div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-outline"
                onClick={() => {
                  setMostrarModal(false);
                  setModoEdicion(false);
                  setColaboradorEditando(null);
                }}
              >
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAgregarColaborador}
              >
                ✅ {modoEdicion ? "Guardar Cambios" : "Guardar Colaborador"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
