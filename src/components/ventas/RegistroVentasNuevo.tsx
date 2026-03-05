import React, { useState } from "react";
import {
  RegistroVenta,
  Pantalla,
  AsignacionPantalla,
  Cliente,
  Usuario,
} from "../../types";
import "./RegistroVentasNuevo.css";

interface RegistroVentasNuevoProps {
  pantallas: Pantalla[];
  asignaciones: AsignacionPantalla[];
  clientes: Cliente[];
  ventasRegistradas: RegistroVenta[];
  usuarioActual: Usuario;
  onRegistrarVenta: (venta: RegistroVenta) => void;
  errorExterno?: string | null;
}

export const RegistroVentasNuevo: React.FC<RegistroVentasNuevoProps> = ({
  asignaciones,
  clientes,
  ventasRegistradas,
  usuarioActual,
  onRegistrarVenta,
  pantallas,
  errorExterno = null,
}) => {
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>("");
  const [pantallasSeleccionadas, setPantallasSeleccionadas] = useState<
    string[]
  >([]);
  const [vendidoA, setVendidoA] = useState<string>("");
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [mesesRenta, setMesesRenta] = useState<number>(1);
  const [precioGeneral, setPrecioGeneral] = useState<number>(0);
  const [porcentajeSocio, setPorcentajeSocio] = useState<number>(30); // Por defecto 30%
  const [montoSocio, setMontoSocio] = useState<number>(0);
  const [error, setError] = useState<string>("");
  const [exito, setExito] = useState<string>("");
  const [mostrarModalVenta, setMostrarModalVenta] = useState(false);
  const [busquedaVenta, setBusquedaVenta] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const ventasPorPagina = 20;

  const ventasFiltradas = ventasRegistradas.filter((venta) => {
    const cliente = clientes.find((c) => c.id === venta.clienteId);
    return (
      busquedaVenta === "" ||
      (cliente &&
        cliente.nombre.toLowerCase().includes(busquedaVenta.toLowerCase())) ||
      venta.vendidoA.toLowerCase().includes(busquedaVenta.toLowerCase())
    );
  });
  const totalPaginas = Math.ceil(ventasFiltradas.length / ventasPorPagina);
  const ventasPagina = ventasFiltradas.slice(
    (paginaActual - 1) * ventasPorPagina,
    paginaActual * ventasPorPagina,
  );

  // Obtener pantallas asignadas al cliente seleccionado
  const pantallasDelCliente = asignaciones.filter(
    (a) => a.clienteId === clienteSeleccionado && a.activa,
  );

  // Obtener el cliente
  const clienteActual = clientes.find((c) => c.id === clienteSeleccionado);

  // Obtener información de las pantallas seleccionadas
  const pantallasActuales = pantallasSeleccionadas
    .map((id) => pantallas.find((p) => p.id === id))
    .filter((p) => p !== undefined) as Pantalla[];

  // Parsear fecha correctamente (evita problema de zona horaria)
  const parsearFecha = (fechaString: string): Date => {
    const [año, mes, día] = fechaString.split("-").map(Number);
    return new Date(año, mes - 1, día);
  };

  // Calcular fecha fin basada en meses
  const calcularFechaFin = () => {
    if (!fechaInicio || !mesesRenta) return "";
    const inicio = parsearFecha(fechaInicio);
    const fin = new Date(inicio);
    fin.setMonth(fin.getMonth() + mesesRenta);
    return fin.toISOString().split("T")[0];
  };

  const fechaFin = calcularFechaFin();
  // Calcular monto del socio en tiempo real
  React.useEffect(() => {
    const precioTotal = precioGeneral * mesesRenta; // ← precio × meses
    if (clienteActual && typeof clienteActual.porcentajeSocio === "number") {
      setPorcentajeSocio(clienteActual.porcentajeSocio);
      setMontoSocio(
        Math.round(
          ((precioTotal * clienteActual.porcentajeSocio) / 100) * 100,
        ) / 100,
      );
    } else {
      setMontoSocio(
        Math.round(((precioTotal * porcentajeSocio) / 100) * 100) / 100,
      );
    }
  }, [precioGeneral, mesesRenta, porcentajeSocio, clienteActual]);

  const importeTotal = montoSocio;

  // Validar y registrar venta
  const handleRegistrarVenta = () => {
    setError("");
    setExito("");

    if (!clienteSeleccionado) {
      setError("Selecciona un cliente");
      return;
    }
    if (pantallasSeleccionadas.length === 0) {
      setError("Selecciona al menos una pantalla");
      return;
    }
    if (!vendidoA.trim()) {
      setError("Especifica a quién se vendió/rentó");
      return;
    }
    if (!fechaInicio) {
      setError("Selecciona una fecha de inicio");
      return;
    }
    if (mesesRenta < 1) {
      setError("La duración debe ser al menos 1 mes");
      return;
    }
    if (precioGeneral <= 0) {
      setError("El precio debe ser mayor a 0");
      return;
    }

    const nuevaVenta: RegistroVenta = {
      id: "v" + Date.now(),
      pantallasIds: pantallasSeleccionadas,
      clienteId: clienteSeleccionado,
      vendidoA: vendidoA.trim(),
      precioGeneral: precioGeneral * mesesRenta,
      fechaRegistro: new Date(),
      fechaInicio: parsearFecha(fechaInicio),
      fechaFin: parsearFecha(fechaFin),
      mesesRenta,
      importeTotal,
      activo: true,
      usuarioRegistroId: usuarioActual.id,
    };

    onRegistrarVenta(nuevaVenta);
    setExito("✅ Venta registrada correctamente");
    setClienteSeleccionado("");
    setPantallasSeleccionadas([]);
    setVendidoA("");
    setFechaInicio("");
    setMesesRenta(1);
    setPrecioGeneral(0);

    setTimeout(() => setExito(""), 3000);
  };

  // Manejar selección múltiple de pantallas
  const togglePantalla = (pantallaId: string) => {
    setPantallasSeleccionadas((prev) =>
      prev.includes(pantallaId)
        ? prev.filter((id) => id !== pantallaId)
        : [...prev, pantallaId],
    );
  };

  // Formatear moneda con separadores de miles
  const formatearMoneda = (valor: number): string => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);
  };

  // Obtener ventas del mes actual
  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const añoActual = hoy.getFullYear();

  const ventasDelMes = ventasRegistradas.filter((v) => {
    const fecha = new Date(v.fechaRegistro);
    return (
      fecha.getMonth() === mesActual &&
      fecha.getFullYear() === añoActual &&
      v.activo
    );
  });

  const ventasDelClienteHoy = ventasDelMes.filter(
    (v) => v.clienteId === clienteSeleccionado,
  );

  return (
    <div className="registro-ventas-nuevo">
      <div className="ventas-header">
        <button
          className="btn btn-flotante"
          onClick={() => setMostrarModalVenta(true)}
        >
          <span style={{ fontSize: "1.3em", marginRight: 6 }}>＋</span>{" "}
          Registrar Venta
        </button>
        <input
          type="text"
          placeholder="Buscar cliente o receptor..."
          value={busquedaVenta}
          onChange={(e) => {
            setBusquedaVenta(e.target.value);
            setPaginaActual(1);
          }}
          className="buscador-ventas"
        />
      </div>
      <h2>
        📅 Registros de{" "}
        {new Date(mesActual + 1, 0).toLocaleString("es-ES", { month: "long" })}{" "}
        de {añoActual}
      </h2>
      <div className="estadisticas">
        <div className="stat-card">
          <span className="stat-number">{ventasFiltradas.length}</span>
          <span className="stat-label">Ventas del mes</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">
            {formatearMoneda(
              ventasFiltradas.reduce((sum, v) => sum + v.importeTotal, 0),
            )}
          </span>
          <span className="stat-label">Ingresos totales</span>
        </div>
      </div>
      <div className="ventas-list ventas-compacta">
        {ventasPagina.map((venta) => {
          const cliente = clientes.find((c) => c.id === venta.clienteId);
          const pantallasNombres = venta.pantallasIds
            .map((id) => pantallas.find((p) => p.id === id)?.nombre)
            .join(", ");
          return (
            <div key={venta.id} className="venta-item venta-reducida">
              <div className="venta-header">
                <span className="venta-titulo">
                  {cliente?.nombre} - {pantallasNombres}
                </span>
                <span className="venta-importe">
                  {formatearMoneda(venta.importeTotal)}
                </span>
              </div>
              <span className="venta-detalle">
                {venta.vendidoA} |{" "}
                {new Date(venta.fechaInicio).toLocaleDateString()} a{" "}
                {new Date(venta.fechaFin).toLocaleDateString()} (
                {venta.mesesRenta} mes{venta.mesesRenta !== 1 ? "es" : ""})
              </span>
            </div>
          );
        })}
      </div>
      <div className="paginacion-ventas">
        <button
          disabled={paginaActual === 1}
          onClick={() => setPaginaActual(paginaActual - 1)}
        >
          ◀
        </button>
        <span>
          Página {paginaActual} de {totalPaginas}
        </span>
        <button
          disabled={paginaActual === totalPaginas}
          onClick={() => setPaginaActual(paginaActual + 1)}
        >
          ▶
        </button>
      </div>
      {/* MODAL REGISTRO VENTA */}
      {mostrarModalVenta && (
        <div
          className="modal-overlay"
          onClick={() => setMostrarModalVenta(false)}
        >
          <div className="modal-contenido" onClick={(e) => e.stopPropagation()}>
            <h3>Registrar Venta/Renta</h3>
            {/* Aquí puedes reutilizar el formulario de registro actual, o crear uno simplificado */}
            <div className="formulario-section">
              <div className="form-group">
                <label>Cliente *</label>
                <select
                  value={clienteSeleccionado}
                  onChange={(e) => {
                    setClienteSeleccionado(e.target.value);
                    setPantallaSeleccionada("");
                  }}
                  className="select-lg"
                >
                  <option value="">-- Seleccionar cliente --</option>
                  {clientes
                    .filter((c) => c.activo)
                    .map((c) => {
                      const numPantallas = asignaciones.filter(
                        (a) => a.clienteId === c.id && a.activa,
                      ).length;
                      return (
                        <option key={c.id} value={c.id}>
                          {c.nombre} ({numPantallas} pantalla
                          {numPantallas !== 1 ? "s" : ""})
                        </option>
                      );
                    })}
                </select>
              </div>

              {pantallasDelCliente.length > 0 && (
                <>
                  {/* SELECTOR DE MÚLTIPLES PANTALLAS */}
                  <div className="form-group">
                    <label className="label-pantallas">
                      📺 Pantallas seleccionadas:{" "}
                      <span className="badge-cantidad">
                        {pantallasSeleccionadas.length}
                      </span>
                    </label>
                    <div className="pantallas-checkbox-group">
                      {pantallasDelCliente.map((asignacion) => {
                        const pantalla = pantallas.find(
                          (p) => p.id === asignacion.pantallaId,
                        );
                        const isSelected = pantallasSeleccionadas.includes(
                          asignacion.pantallaId,
                        );
                        return (
                          <label
                            key={asignacion.pantallaId}
                            className={`checkbox-item ${isSelected ? "selected" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() =>
                                togglePantalla(asignacion.pantallaId)
                              }
                            />
                            <span className="checkbox-visual"></span>
                            <span className="checkbox-label">
                              <span className="pantalla-nombre">
                                {pantalla?.nombre}
                              </span>
                              {pantalla?.ubicacion && (
                                <span className="pantalla-mini-ubicacion">
                                  {pantalla.ubicacion}
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {pantallasSeleccionadas.length === 0 && (
                      <div className="hint-text">
                        ⚠️ Selecciona al menos una pantalla
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Vendido a (Nombre del receptor) *</label>
                    <input
                      type="text"
                      value={vendidoA}
                      onChange={(e) => setVendidoA(e.target.value)}
                      placeholder="Ej: ABC Company, Juan Pérez, Empresa XYZ"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Fecha de Inicio *</label>
                      <input
                        type="date"
                        value={fechaInicio}
                        onChange={(e) => setFechaInicio(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Duración (meses) *</label>
                      <input
                        type="number"
                        min="1"
                        value={mesesRenta || ""}
                        onChange={(e) =>
                          setMesesRenta(
                            e.target.value === ""
                              ? 0
                              : parseInt(e.target.value) || 0,
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Precio General (precio total de la venta) *</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={precioGeneral || ""}
                      onChange={(e) =>
                        setPrecioGeneral(
                          e.target.value === ""
                            ? 0
                            : parseFloat(e.target.value) || 0,
                        )
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group">
                    <label>Porcentaje para socio/dueño (%) *</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={porcentajeSocio}
                      onChange={(e) =>
                        setPorcentajeSocio(
                          e.target.value === ""
                            ? 0
                            : parseInt(e.target.value) || 0,
                        )
                      }
                      placeholder="Ej: 30"
                    />
                  </div>
                  <div className="form-group">
                    <label>Monto para socio/dueño</label>
                    <input
                      type="number"
                      value={montoSocio}
                      readOnly
                      style={{ background: "#f5f5f5" }}
                    />
                  </div>

                  {/* RESUMEN DE LA VENTA */}
                  {fechaInicio &&
                    mesesRenta &&
                    pantallasSeleccionadas.length > 0 && (
                      <div className="resumen-venta">
                        <h4>📋 Resumen de la Venta</h4>
                        <div className="resumen-grid">
                          <div className="resumen-item">
                            <span className="label">Pantallas:</span>
                            <span className="valor">
                              {pantallasActuales
                                .map((p) => p.nombre)
                                .join(", ")}
                            </span>
                          </div>
                          <div className="resumen-item">
                            <span className="label">Cantidad:</span>
                            <span className="valor">
                              {pantallasSeleccionadas.length} pantalla
                              {pantallasSeleccionadas.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="resumen-item">
                            <span className="label">Vendido a:</span>
                            <span className="valor">{vendidoA || "-"}</span>
                          </div>
                          <div className="resumen-item">
                            <span className="label">Fecha inicio:</span>
                            <span className="valor">
                              {parsearFecha(fechaInicio).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="resumen-item">
                            <span className="label">Fecha fin:</span>
                            <span className="valor">
                              {parsearFecha(fechaFin).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="resumen-item">
                            <span className="label">Duración:</span>
                            <span className="valor">
                              {mesesRenta} mes{mesesRenta !== 1 ? "es" : ""}
                            </span>
                          </div>
                          <div className="resumen-item total">
                            <span className="label">PRECIO GENERAL:</span>
                            <span className="valor">
                              {formatearMoneda(precioGeneral * mesesRenta)}
                            </span>
                          </div>
                          <div className="resumen-item total">
                            <span className="label">Porcentaje socio:</span>
                            <span className="valor">{porcentajeSocio}%</span>
                          </div>
                          <div className="resumen-item total">
                            <span className="label">Monto socio:</span>
                            <span className="valor">
                              {formatearMoneda(montoSocio)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                  {error && <div className="error-message">{error}</div>}
                  {errorExterno && (
                    <div className="error-message">{errorExterno}</div>
                  )}
                  {exito && <div className="success-message">{exito}</div>}

                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleRegistrarVenta}
                  >
                    ✅ Registrar Venta
                  </button>
                </>
              )}

              {clienteSeleccionado && pantallasDelCliente.length === 0 && (
                <div className="error-message">
                  Este cliente no tiene pantallas asignadas. Asigna pantallas
                  desde la sección de Gestión.
                </div>
              )}
            </div>
            <button
              className="btn btn-outline"
              onClick={() => setMostrarModalVenta(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
