import React, { useState } from "react";
import { ColorPicker } from "../ui/ColorPicker";
import {
  Pantalla,
  AsignacionPantalla,
  Colaborador,
  Producto,
  AsignacionProducto,
} from "../../types";
import "./GestorPantallasClientes.css";
import { FilasFormulario } from "./components/FilasFormulario";
import { useFilasFormulario } from "../../hooks/useFormulario";

type TipoComision = "porcentaje" | "ninguno" | "consideracion" | "precio_fijo";

interface GestorPantallasClientesProps {
  tiposPago: { id: string; nombre: string }[];
  pantallas: Pantalla[];
  clientes: Colaborador[];
  asignaciones: AsignacionPantalla[];
  productos?: Producto[]; // ✅ opcional
  asignacionesProductos?: AsignacionProducto[]; // ✅ opcional
  onAgregarPantalla: (pantalla: Pantalla) => void;
  onActualizarPantalla: (pantalla: Pantalla) => void;
  onEliminarPantalla: (pantallaId: string) => void;
  onAgregarCliente: (
    colaborador: Colaborador,
    extras?: { tipo_pago_id: string; pantalla_id: string; producto_id?: string },
  ) => void | Promise<Colaborador | void>;
  onActualizarCliente: (cliente: Colaborador) => void;
  onAsignarPantalla: (asignacion: AsignacionPantalla) => void;
  onEliminarPantallasYAsignaciones: (colaboradorId: string) => void;
  onDesasignarPantalla: (clienteId: string, pantallaId: string) => void;
  onAgregarProducto?: (producto: Producto) => void; // ✅ opcional
  onActualizarProducto?: (producto: Producto) => void; // ✅ opcional
  onEliminarProducto?: (productoId: string) => void; // ✅ opcional
  onAsignarProducto?: (asignacion: AsignacionProducto) => void; // ✅ opcional
}

export const GestorPantallasClientes: React.FC<
  GestorPantallasClientesProps
> = ({
  pantallas,
  clientes,
  asignaciones,
  productos = [], // ✅ fallback — evita el crash
  asignacionesProductos = [], // ✅ fallback — evita el crash
  onAgregarPantalla,
  onActualizarPantalla,
  onEliminarPantalla,
  onAgregarCliente,
  onActualizarCliente,
  onAsignarPantalla,
  onEliminarPantallasYAsignaciones,
  onAgregarProducto,
  onActualizarProducto,
  onEliminarProducto,
  onAsignarProducto,
}) => {
  // ─── 1. ESTADOS ──────────────────────────────────────────
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [colaboradorEditando, setColaboradorEditando] = useState<string | null>(
    null,
  );
  const [nuevoColaboradorNombre, setNuevoColaboradorNombre] = useState("");
  const [nuevoColaboradorAlias, setNuevoColaboradorAlias] = useState("");
  const [nuevoColaboradorTel, setNuevoColaboradorTel] = useState("");
  const [nuevoColaboradorEmail, setNuevoColaboradorEmail] = useState("");
  const [nuevoColaboradorColor, setNuevoColaboradorColor] = useState("");
  const [tipoComision, setTipoComision] = useState<TipoComision>("ninguno");
  const [nuevoColaboradorPorcentajeSocio, setNuevoColaboradorPorcentajeSocio] =
    useState<number>(30);
  const [errorColaborador, setErrorColaborador] = useState("");
  const [errorPantalla, setErrorPantalla] = useState("");

  // ─── 2. HOOKS DE FILAS ───────────────────────────────────
  const pantallasForm = useFilasFormulario({ nombre: "", ubicacion: "" });
  const productosForm = useFilasFormulario({ nombre: "", precio: 0 });

  // ─── 3. RESET ────────────────────────────────────────────
  const resetFormulario = () => {
    setNuevoColaboradorNombre("");
    setNuevoColaboradorAlias("");
    setNuevoColaboradorTel("");
    setNuevoColaboradorEmail("");
    setNuevoColaboradorColor("");
    setTipoComision("ninguno");
    setNuevoColaboradorPorcentajeSocio(30);
    setErrorColaborador("");
    setErrorPantalla("");
    pantallasForm.resetFilas();
    productosForm.resetFilas();
    setMostrarModal(false);
    setModoEdicion(false);
    setColaboradorEditando(null);
  };

  // ─── 4. HANDLERS ─────────────────────────────────────────
  const handleAgregarColaborador = () => {
    setErrorColaborador("");
    setErrorPantalla("");

    if (!nuevoColaboradorNombre.trim()) {
      setErrorColaborador("El nombre del colaborador es requerido");
      return;
    }

    const pantallasValidas = pantallasForm.filasValidas() as Array<{
      tempId: string;
      nombre: string;
      ubicacion: string;
    }>;

    if (pantallasValidas.length === 0) {
      setErrorPantalla("Debe agregar al menos una pantalla");
      return;
    }

    const productosValidos = productosForm.filasValidas() as Array<{
      tempId: string;
      nombre: string;
      precio: number;
    }>;

    const nuevoColaborador: Colaborador = {
      id:
        modoEdicion && colaboradorEditando
          ? colaboradorEditando
          : "c" + Date.now() + Math.floor(Math.random() * 10000),
      nombre: nuevoColaboradorNombre,
      alias: nuevoColaboradorAlias || undefined,
      telefono: nuevoColaboradorTel || undefined,
      email: nuevoColaboradorEmail || undefined,
      color: nuevoColaboradorColor || undefined,
      tipoComision,
      porcentajeSocio:
        tipoComision === "porcentaje"
          ? nuevoColaboradorPorcentajeSocio
          : undefined,
      activo: true,
      fechaCreacion: new Date(),
    };

    // ─── MODO EDICIÓN ────────────────────────────────────
    if (modoEdicion && colaboradorEditando) {
      onActualizarCliente(nuevoColaborador);

      // Pantallas — eliminar las que ya no están
      const idsOriginales = asignaciones
        .filter((a) => a.clienteId === colaboradorEditando && a.activa)
        .map((a) => a.pantallaId);

      const idsEnForm = pantallasValidas
        .filter((p) => pantallas.some((existing) => existing.id === p.tempId))
        .map((p) => p.tempId);

      idsOriginales.forEach((pantallaId) => {
        if (!idsEnForm.includes(pantallaId)) onEliminarPantalla(pantallaId);
      });

      // Pantallas — actualizar o crear
      pantallasValidas.forEach((pantallaData, idx) => {
        const pantallaExistente = pantallas.find(
          (p) => p.id === pantallaData.tempId,
        );
        if (pantallaExistente) {
          onActualizarPantalla({
            ...pantallaExistente,
            nombre: String(pantallaData.nombre),
            ubicacion: String(pantallaData.ubicacion) || undefined,
          });
        } else {
          const uniqueId = Date.now() + idx + Math.floor(Math.random() * 10000);
          const nuevaPantalla: Pantalla = {
            id: "p" + uniqueId,
            nombre: String(pantallaData.nombre),
            ubicacion: String(pantallaData.ubicacion) || undefined,
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

      // Productos — eliminar los que ya no están
      if (
        onEliminarProducto &&
        onAgregarProducto &&
        onActualizarProducto &&
        onAsignarProducto
      ) {
        const idsProductosOriginales = asignacionesProductos
          .filter((a) => a.clienteId === colaboradorEditando && a.activa)
          .map((a) => a.productoId);

        const idsProductosEnForm = productosValidos
          .filter((p) => productos.some((existing) => existing.id === p.tempId))
          .map((p) => p.tempId);

        idsProductosOriginales.forEach((productoId) => {
          if (!idsProductosEnForm.includes(productoId))
            onEliminarProducto(productoId);
        });

        // Productos — actualizar o crear
        productosValidos.forEach((productoData, idx) => {
          const productoExistente = productos.find(
            (p) => p.id === productoData.tempId,
          );
          if (productoExistente) {
            onActualizarProducto({
              ...productoExistente,
              nombre: String(productoData.nombre),
              precio: Number(productoData.precio),
            });
          } else {
            const uniqueId =
              Date.now() + idx + Math.floor(Math.random() * 10000);
            const nuevoProducto: Producto = {
              id: "prod" + uniqueId,
              nombre: String(productoData.nombre),
              precio: Number(productoData.precio),
              activo: true,
              fechaCreacion: new Date(),
            };
            onAgregarProducto(nuevoProducto);
            onAsignarProducto({
              id: "ap" + uniqueId,
              productoId: nuevoProducto.id,
              clienteId: nuevoColaborador.id,
              activa: true,
              fechaAsignacion: new Date(),
            });
          }
        });
      }

      // ─── MODO CREACIÓN ───────────────────────────────────
    } else {
      onAgregarCliente(nuevoColaborador);

      // Pantallas
      pantallasValidas.forEach((pantallaData, idx) => {
        const uniqueId = Date.now() + idx + Math.floor(Math.random() * 10000);
        const nuevaPantalla: Pantalla = {
          id: "p" + uniqueId,
          nombre: String(pantallaData.nombre),
          ubicacion: String(pantallaData.ubicacion) || undefined,
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

      // Productos
      if (onAgregarProducto && onAsignarProducto) {
        productosValidos.forEach((productoData, idx) => {
          const uniqueId = Date.now() + idx + Math.floor(Math.random() * 10000);
          const nuevoProducto: Producto = {
            id: "prod" + uniqueId,
            nombre: String(productoData.nombre),
            precio: Number(productoData.precio),
            activo: true,
            fechaCreacion: new Date(),
          };
          onAgregarProducto(nuevoProducto);
          onAsignarProducto({
            id: "ap" + uniqueId,
            productoId: nuevoProducto.id,
            clienteId: nuevoColaborador.id,
            activa: true,
            fechaAsignacion: new Date(),
          });
        });
      }
    }

    resetFormulario();
  };

  const handleEditarColaborador = (colaborador: Colaborador) => {
    setNuevoColaboradorNombre(colaborador.nombre);
    setNuevoColaboradorAlias(colaborador.alias || "");
    setNuevoColaboradorTel(colaborador.telefono || "");
    setNuevoColaboradorEmail(colaborador.email || "");
    setNuevoColaboradorColor(colaborador.color || "");
    setTipoComision(colaborador.tipoComision ?? "ninguno");
    setNuevoColaboradorPorcentajeSocio(colaborador.porcentajeSocio ?? 30);

    // Cargar pantallas asociadas
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
      .filter(Boolean) as Array<{
      nombre: string;
      ubicacion: string;
      tempId: string;
    }>;

    pantallasForm.setFilas(
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

    // Cargar productos asociados
    const productosAsociados = asignacionesProductos
      .filter((a) => a.clienteId === colaborador.id && a.activa)
      .map((a) => {
        const producto = productos.find((p) => p.id === a.productoId);
        return producto
          ? {
              nombre: producto.nombre,
              precio: producto.precio,
              tempId: producto.id,
            }
          : null;
      })
      .filter(Boolean) as Array<{
      nombre: string;
      precio: number;
      tempId: string;
    }>;

    productosForm.setFilas(
      productosAsociados.length > 0
        ? productosAsociados
        : [
            {
              nombre: "",
              precio: 0,
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
      resetFormulario();
    }
  };

  // ─── 5. VARIABLES DERIVADAS ──────────────────────────────
  const colaboradoresActivos = clientes.filter((c) => c.activo);

  const obtenerPantallasDelColaborador = (colaboradorId: string): Pantalla[] =>
    asignaciones
      .filter((a) => a.clienteId === colaboradorId && a.activa)
      .map((a) => pantallas.find((p) => p.id === a.pantallaId))
      .filter((p) => p !== undefined) as Pantalla[];

  const obtenerProductosDelColaborador = (colaboradorId: string): Producto[] =>
    asignacionesProductos
      .filter((a) => a.clienteId === colaboradorId && a.activa)
      .map((a) => productos.find((p) => p.id === a.productoId))
      .filter((p) => p !== undefined) as Producto[];

  const etiquetaTipoComision: Record<TipoComision, string> = {
    porcentaje: "Porcentaje",
    ninguno: "Ninguno",
    consideracion: "Consideración",
    precio_fijo: "Precio fijo",
  };

  // ─── 6. JSX ──────────────────────────────────────────────
  return (
    <div className="gestor-pantallas-clientes">
      <h2>Gestión de Colaboradores</h2>

      {colaboradoresActivos.length === 0 ? (
        <div className="estado-vacio">
          <div className="estado-vacio-contenido">
            <div className="icono-grande">👥</div>
            <h3>No hay colaboradores registrados</h3>
            <p>Comienza agregando tu primer colaborador</p>
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
              const productosDelCol = obtenerProductosDelColaborador(
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
                  {colaborador.alias && (
                    <p>
                      <strong>Alias:</strong> {colaborador.alias}
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
                  {colaborador.tipoComision && (
                    <p>
                      <strong>Comisión:</strong>{" "}
                      {etiquetaTipoComision[colaborador.tipoComision]}
                      {colaborador.tipoComision === "porcentaje" &&
                      colaborador.porcentajeSocio !== undefined
                        ? ` — ${colaborador.porcentajeSocio}%`
                        : ""}
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

                  {productosDelCol.length > 0 && (
                    <div className="pantallas-asociadas">
                      <h5>Otros Productos</h5>
                      <ul className="pantallas-list">
                        {productosDelCol.map((producto) => (
                          <li key={producto.id}>
                            <span className="pantalla-nombre">
                              {producto.nombre}
                            </span>
                            <span className="pantalla-ubicacion">
                              $
                              {producto.precio.toLocaleString("es-MX", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
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

      {/* ─── MODAL ───────────────────────────────────────── */}
      {mostrarModal && (
        <div className="modal-overlay" onClick={resetFormulario}>
          <div className="modal-contenido" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modoEdicion
                  ? "Editar Colaborador"
                  : "Agregar Nuevo Colaborador"}
              </h3>
              <button className="modal-close" onClick={resetFormulario}>
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
                    <label>Alias</label>
                    <input
                      type="text"
                      value={nuevoColaboradorAlias}
                      onChange={(e) => setNuevoColaboradorAlias(e.target.value)}
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
                  <label>Tipo de comisión *</label>
                  <select
                    value={tipoComision}
                    onChange={(e) =>
                      setTipoComision(e.target.value as TipoComision)
                    }
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
                  {
                    key: "ubicacion",
                    label: "Ubicación",
                    placeholder: "Ej: Centro Comercial",
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
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={resetFormulario}>
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
