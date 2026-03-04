import React, { useState } from "react";
import { OrdenDeCompra, Cliente, ConfiguracionEmpresa } from "../../types";
import "./CrearOrden.css";

interface ProductoOrden {
  id: string;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  importe: number;
}

interface CrearOrdenProps {
  clientes: Cliente[];
  config: ConfiguracionEmpresa;
  onCrear: (orden: OrdenDeCompra) => void;
  onCancelar: () => void;
}

export const CrearOrden: React.FC<CrearOrdenProps> = ({
  clientes,
  config,
  onCrear,
  onCancelar,
}) => {
  const [clienteId, setClienteId] = useState("");
  const [productos, setProductos] = useState<ProductoOrden[]>([]);
  const [nuevoProducto, setNuevoProducto] = useState({
    descripcion: "",
    cantidad: 1,
    precioUnitario: 0,
  });

  const clienteSeleccionado = clientes.find((c) => c.id === clienteId);

  const handleAgregarProducto = () => {
    if (!nuevoProducto.descripcion || nuevoProducto.precioUnitario <= 0) {
      alert("Completa los campos del producto");
      return;
    }
    const producto: ProductoOrden = {
      id: Math.random().toString(36).substring(2, 9),
      descripcion: nuevoProducto.descripcion,
      cantidad: nuevoProducto.cantidad,
      precioUnitario: nuevoProducto.precioUnitario,
      importe: nuevoProducto.cantidad * nuevoProducto.precioUnitario,
    };
    setProductos((prev) => [...prev, producto]);
    setNuevoProducto({ descripcion: "", cantidad: 1, precioUnitario: 0 });
  };

  const handleEditarProducto = (id: string, campo: string, valor: string) => {
    setProductos((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const actualizado = {
          ...p,
          [campo]: campo === "descripcion" ? valor : parseFloat(valor) || 0,
        };
        actualizado.importe = actualizado.cantidad * actualizado.precioUnitario;
        return actualizado;
      }),
    );
  };

  const handleEliminarProducto = (id: string) => {
    setProductos((prev) => prev.filter((p) => p.id !== id));
  };

  const subtotal = productos.reduce((sum, p) => sum + p.importe, 0);
  const iva = subtotal * ((config.ivaPercentaje || 16) / 100);
  const total = subtotal + iva;

  const handleCrear = () => {
    if (!clienteId) {
      alert("Selecciona un cliente");
      return;
    }
    if (productos.length === 0) {
      alert("Agrega al menos un producto");
      return;
    }

    // ✅ CÓDIGO CORREGIDO:
    const orden: OrdenDeCompra = {
      id: "oc" + Date.now(),
      numeroOrden: `OC-${Date.now()}`, // ✅ campo requerido que faltaba
      fecha: new Date(), // ✅ nombre correcto
      estado: "descargada",
      // Campos del modelo nuevo:
      subtotal,
      ivaTotal: iva, // ✅ nombre correcto
      ivaPercentaje: config.ivaPercentaje,
      total,
      // Cliente va aquí como empresaId o simplemente guardarlo aparte
      empresaId: clienteId, // ✅ mapear al campo correcto
      // Productos como conceptos simples:
      conceptos: productos.map((p) => ({
        id: p.id,
        ordenId: "",
        concepto: p.descripcion,
        precioUnitario: p.precioUnitario,
        cantidad: p.cantidad,
        importeTotal: p.importe,
        fechaInicio: new Date(),
        fechaFin: new Date(),
      })),
    };

    onCrear(orden);
  };

  return (
    <div className="crear-orden-overlay" onClick={onCancelar}>
      <div
        className="crear-orden-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* TÍTULO */}
        <div className="orden-titulo">
          <h2>📋 Crear Orden de Compra</h2>
          <p>Completa los datos para generar la orden</p>
        </div>

        {/* SECCIÓN EMPRESA/CLIENTE */}
        <div className="orden-section">
          <h3>🏢 Cliente</h3>
          <div className="select-with-button">
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
            >
              <option value="">-- Seleccionar cliente --</option>
              {clientes
                .filter((c) => c.activo)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
            </select>
          </div>

          {clienteSeleccionado && (
            <div className="empresa-seleccionada">
              <p>
                <strong>Cliente:</strong> {clienteSeleccionado.nombre}
              </p>
              {clienteSeleccionado.contacto && (
                <p>
                  <strong>Contacto:</strong> {clienteSeleccionado.contacto}
                </p>
              )}
              {clienteSeleccionado.telefono && (
                <p>
                  <strong>Teléfono:</strong> {clienteSeleccionado.telefono}
                </p>
              )}
              {clienteSeleccionado.email && (
                <p>
                  <strong>Email:</strong> {clienteSeleccionado.email}
                </p>
              )}
            </div>
          )}
        </div>

        {/* SECCIÓN PRODUCTOS */}
        <div className="orden-section">
          <h3>📦 Productos / Servicios</h3>

          <div className="producto-form">
            <div className="form-row">
              <div className="form-group">
                <label>Descripción *</label>
                <input
                  type="text"
                  value={nuevoProducto.descripcion}
                  onChange={(e) =>
                    setNuevoProducto({
                      ...nuevoProducto,
                      descripcion: e.target.value,
                    })
                  }
                  placeholder="Ej: Publicidad en pantalla"
                />
              </div>
              <div className="form-group">
                <label>Cantidad</label>
                <input
                  type="number"
                  min="1"
                  value={nuevoProducto.cantidad}
                  onChange={(e) =>
                    setNuevoProducto({
                      ...nuevoProducto,
                      cantidad: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>Precio Unitario *</label>
                <input
                  type="number"
                  min="0"
                  value={nuevoProducto.precioUnitario}
                  onChange={(e) =>
                    setNuevoProducto({
                      ...nuevoProducto,
                      precioUnitario: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>
            <button
              className="btn btn-secondary"
              onClick={handleAgregarProducto}
            >
              ➕ Agregar Producto
            </button>
          </div>

          {/* TABLA DE PRODUCTOS */}
          {productos.length > 0 && (
            <div className="productos-tabla">
              <table>
                <thead>
                  <tr>
                    <th className="desc-cell">Descripción</th>
                    <th>Cantidad</th>
                    <th>Precio Unitario</th>
                    <th>Importe</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((p) => (
                    <tr key={p.id}>
                      <td className="desc-cell">
                        <input
                          className="cell-input"
                          value={p.descripcion}
                          onChange={(e) =>
                            handleEditarProducto(
                              p.id,
                              "descripcion",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="cell-input"
                          type="number"
                          min="1"
                          value={p.cantidad}
                          onChange={(e) =>
                            handleEditarProducto(
                              p.id,
                              "cantidad",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          className="cell-input"
                          type="number"
                          min="0"
                          value={p.precioUnitario}
                          onChange={(e) =>
                            handleEditarProducto(
                              p.id,
                              "precioUnitario",
                              e.target.value,
                            )
                          }
                        />
                      </td>
                      <td className="importe">${p.importe.toFixed(2)}</td>
                      <td>
                        <button
                          className="btn-remove"
                          onClick={() => handleEliminarProducto(p.id)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* TOTALES */}
              <div className="total-section">
                <div className="total-row">
                  <span className="total-label">Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="total-row">
                  <span className="total-label">
                    IVA ({config.ivaPercentaje}%):
                  </span>
                  <span>${iva.toFixed(2)}</span>
                </div>
                <div className="total-row">
                  <span className="total-label">Total:</span>
                  <span className="total-amount">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ACCIONES */}
        <div className="form-actions">
          <button className="btn btn-outline" onClick={onCancelar}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleCrear}>
            ✅ Crear Orden
          </button>
        </div>
      </div>
    </div>
  );
};
