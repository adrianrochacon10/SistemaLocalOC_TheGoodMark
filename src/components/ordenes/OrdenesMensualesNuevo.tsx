import React, { useState } from "react";
import {
  RegistroVenta,
  OrdenDeCompra,
  ConfiguracionEmpresa,
  Usuario,
  Pantalla,
  Cliente,
} from "../../types";
import {
  generarOrdenDelMes,
  obtenerRegistrosDelMes,
  obtenerOrdenDelMes,
} from "../../utils/ordenUtils";
import { generarPDFOrden } from "../../utils/pdfGenerator";
import "./OrdenesMensualesNuevo.css";

interface OrdenesMensualesNuevoProps {
  ordenes: OrdenDeCompra[];
  ventasRegistradas: RegistroVenta[];
  config: ConfiguracionEmpresa;
  usuarioActual: Usuario;
  clientes: Cliente[];
  pantallas: Pantalla[];
  onGenerarOrden: (orden: OrdenDeCompra) => void;
}

export const OrdenesMensualesNuevo: React.FC<OrdenesMensualesNuevoProps> = ({
  ordenes,
  ventasRegistradas,
  config,
  usuarioActual,
  clientes,
  pantallas,
  onGenerarOrden,
}) => {
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth());
  const [añoSeleccionado, setAñoSeleccionado] = useState(
    new Date().getFullYear(),
  );
  const [mostrarDetalles, setMostrarDetalles] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [exito, setExito] = useState<string>("");

  // Obtener registros activos del mes seleccionado
  const registrosDelMes = obtenerRegistrosDelMes(
    ventasRegistradas,
    mesSeleccionado,
    añoSeleccionado,
  );

  // Verificar si ya existe orden para este mes
  const ordenExistente = obtenerOrdenDelMes(
    ordenes,
    mesSeleccionado,
    añoSeleccionado,
  );

  // Calcular subtotal - suma directa de precios generales
  const subtotalCalculado = registrosDelMes.reduce((total, v) => {
    return total + v.precioGeneral;
  }, 0);

  const ivaCalculado = subtotalCalculado * (config.ivaPercentaje / 100);
  const totalCalculado = subtotalCalculado + ivaCalculado;

  // Meses y años disponibles
  const hoy = new Date();
  const meses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  const años = [];
  for (let i = hoy.getFullYear() - 2; i <= hoy.getFullYear() + 1; i++) {
    años.push(i);
  }

  // Generar nueva orden
  const handleGenerarOrden = () => {
    setError("");
    setExito("");

    if (registrosDelMes.length === 0) {
      setError("No hay ventas registradas para este mes");
      return;
    }

    if (ordenExistente) {
      setError("Ya existe una orden generada para este mes");
      return;
    }

    const nuevaOrden = generarOrdenDelMes(
      ventasRegistradas,
      config,
      usuarioActual.id,
      mesSeleccionado,
      añoSeleccionado,
    );

    onGenerarOrden(nuevaOrden);
    setExito("✅ Orden de compra generada exitosamente");
    setTimeout(() => setExito(""), 3000);
  };

  // Descargar PDF
  const handleDescargarPDF = (orden: OrdenDeCompra) => {
    generarPDFOrden(orden, config, usuarioActual.nombre);
    setExito("✅ PDF descargado exitosamente");
    setTimeout(() => setExito(""), 3000);
  };

  return (
    <div className="ordenes-mensuales-nuevo">
      <h2>📋 Órdenes de Compra Mensuales</h2>

      <div className="contenido-ordenes">
        {/* SELECTOR DE MES */}
        <div className="selector-mes-section">
          <h3>Seleccionar Período</h3>
          <div className="selector-row">
            <div className="selector-group">
              <label>Mes:</label>
              <select
                value={mesSeleccionado}
                onChange={(e) => setMesSeleccionado(parseInt(e.target.value))}
              >
                {meses.map((mes, idx) => (
                  <option key={idx} value={idx}>
                    {mes}
                  </option>
                ))}
              </select>
            </div>
            <div className="selector-group">
              <label>Año:</label>
              <select
                value={añoSeleccionado}
                onChange={(e) => setAñoSeleccionado(parseInt(e.target.value))}
              >
                {años.map((año) => (
                  <option key={año} value={año}>
                    {año}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ESTADO DE LA ORDEN */}
        {ordenExistente ? (
          <div className="orden-existente-section">
            <div className="orden-existente-box">
              <h3>✅ Orden Existente</h3>
              <p>
                Se encontró una orden generada para{" "}
                <strong>
                  {meses[mesSeleccionado]} {añoSeleccionado}
                </strong>
              </p>
              <button
                className="btn btn-secondary"
                onClick={() => setMostrarDetalles(ordenExistente.id)}
              >
                Ver Detalles
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* REGISTROS DEL MES */}
            <div className="registros-section">
              <h3>
                📅 Registros de Ventas - {meses[mesSeleccionado]}{" "}
                {añoSeleccionado}
              </h3>

              {registrosDelMes.length === 0 ? (
                <div className="no-registros">
                  <p>No hay ventas registradas para este mes</p>
                </div>
              ) : (
                <>
                  <div className="registros-list">
                    {registrosDelMes.map((venta) => {
                      const cliente = clientes.find(
                        (c) => c.id === venta.clienteId,
                      );
                      const pantallasNombres = venta.pantallasIds
                        .map((id) => pantallas.find((p) => p.id === id)?.nombre)
                        .join(", ");

                      const fechaInicio = new Date(venta.fechaInicio);
                      const fechaFin = new Date(venta.fechaFin);
                      const primerDiaDelMes = new Date(
                        añoSeleccionado,
                        mesSeleccionado,
                        1,
                      );
                      const ultimoDiaDelMes = new Date(
                        añoSeleccionado,
                        mesSeleccionado + 1,
                        0,
                      );

                      const inicioEnMes =
                        fechaInicio > primerDiaDelMes
                          ? fechaInicio
                          : primerDiaDelMes;
                      const finEnMes =
                        fechaFin < ultimoDiaDelMes ? fechaFin : ultimoDiaDelMes;
                      const diasActivos = Math.max(
                        0,
                        Math.floor(
                          (finEnMes.getTime() - inicioEnMes.getTime()) /
                            (1000 * 60 * 60 * 24),
                        ) + 1,
                      );

                      return (
                        <div key={venta.id} className="registro-item">
                          <div className="registro-header">
                            <div>
                              <h5>
                                {cliente?.nombre} - {pantallasNombres}
                              </h5>
                              <p className="vendido-a">
                                Vendido a: {venta.vendidoA}
                              </p>
                            </div>
                            <span className="importe">
                              ${venta.precioGeneral.toFixed(2)}
                            </span>
                          </div>
                          <div className="registro-detalles">
                            <span>
                              Período:{" "}
                              {new Date(venta.fechaInicio).toLocaleDateString()}{" "}
                              - {new Date(venta.fechaFin).toLocaleDateString()}
                            </span>
                            <span>Días activos este mes: {diasActivos}</span>
                            <span>
                              Período:{" "}
                              {new Date(venta.fechaInicio).toLocaleDateString()}{" "}
                              - {new Date(venta.fechaFin).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* CÁLCULOS */}
                  <div className="calculos-section">
                    <div className="calculo-item">
                      <span className="label">Subtotal:</span>
                      <span className="valor">
                        ${subtotalCalculado.toFixed(2)}
                      </span>
                    </div>
                    <div className="calculo-item">
                      <span className="label">
                        IVA ({config.ivaPercentaje}%):
                      </span>
                      <span className="valor">${ivaCalculado.toFixed(2)}</span>
                    </div>
                    <div className="calculo-item total">
                      <span className="label">TOTAL:</span>
                      <span className="valor">
                        ${totalCalculado.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* BOTONES DE ACCIÓN */}
                  {error && <div className="error-message">{error}</div>}
                  {exito && <div className="success-message">{exito}</div>}

                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleGenerarOrden}
                  >
                    📄 Generar Orden de Compra
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* LISTA DE ÓRDENES GENERADAS */}
      <div className="ordenes-generadas-section">
        <h3>📚 Órdenes Generadas</h3>

        {ordenes.length === 0 ? (
          <p className="no-ordenes">No hay órdenes generadas aún</p>
        ) : (
          <div className="ordenes-grid">
            {ordenes
              .sort((a, b) => {
                const dateA = new Date(a.fecha);
                const dateB = new Date(b.fecha);
                return dateB.getTime() - dateA.getTime();
              })
              .map((orden) => (
                <div
                  key={orden.id}
                  className={`orden-card ${
                    mostrarDetalles === orden.id ? "expandido" : ""
                  }`}
                >
                  <div
                    className="orden-header cursor-pointer"
                    onClick={() =>
                      setMostrarDetalles(
                        mostrarDetalles === orden.id ? null : orden.id,
                      )
                    }
                  >
                    <h4>{orden.numeroOrden}</h4>
                    <span className={`estado-badge ${orden.estado}`}>
                      {orden.estado.charAt(0).toUpperCase() +
                        orden.estado.slice(1)}
                    </span>
                  </div>

                  <div className="orden-info">
                    <p>
                      <p>
                        <strong>Mes:</strong> {meses[orden.mes ?? 0]}{" "}
                        {orden.año ?? ""}
                      </p>
                    </p>
                    <p>
                      <strong>Registros:</strong>{" "}
                      {(orden.registrosVenta ?? []).length}
                    </p>
                    <p className="total-linea">
                      <strong>TOTAL:</strong> ${(orden.total ?? 0).toFixed(2)}
                    </p>
                  </div>

                  {mostrarDetalles === orden.id && (
                    <div className="orden-detalles">
                      <h5>Detalles de la Orden</h5>
                      <div className="detalles-list">
                        {(orden.registrosVenta ?? []).map((venta) => {
                          const cliente = clientes.find(
                            (c) => c.id === venta.clienteId,
                          );
                          const pantalla = pantallas.find(
                            (p) => p.id === venta.pantallasIds[0],
                          );
                          return (
                            <div key={venta.id} className="detalle-item">
                              <p>
                                <strong>
                                  {cliente?.nombre} - {pantalla?.nombre}
                                </strong>
                              </p>
                              <p>Vendido a: {venta.vendidoA}</p>
                              <p>Importe: ${venta.importeTotal.toFixed(2)}</p>
                            </div>
                          );
                        })}
                      </div>

                      <div className="detalles-calculos">
                        <p>
                          <strong>Subtotal:</strong> $
                          {(orden.subtotal ?? 0).toFixed(2)}
                        </p>
                        <p>
                          <strong>IVA ({orden.ivaPercentaje ?? 0}%):</strong> $
                          {(orden.ivaTotal ?? 0).toFixed(2)}
                        </p>
                        <p className="total-linea">
                          <strong>TOTAL:</strong> $
                          {(orden.total ?? 0).toFixed(2)}
                        </p>
                      </div>

                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleDescargarPDF(orden)}
                      >
                        📥 Descargar PDF
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
