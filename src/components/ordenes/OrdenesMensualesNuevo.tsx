  import React, { useState } from "react";
  import {
    RegistroVenta,
    OrdenDeCompra,
    ConfiguracionEmpresa,
    Usuario,
    Pantalla,
    Colaborador,
  } from "../../types";
  import {
    generarOrdenDelMes,
    obtenerRegistrosDelMes,
    obtenerOrdenDelMes,
  } from "../../utils/ordenUtils";
  import "./OrdenesMensualesNuevo.css";
  import { SelectorPeriodo } from "./components/SelectorPeriodo";
  import { RegistrosDelMes } from "./components/RegistrosDelMes";
  import { OrdenesGrid } from "./components/OrdenesGrid";
  import { ModalCrearOrden } from "./components/ModalCrearOrden";

  interface Props {
    ordenes: OrdenDeCompra[];
    ventasRegistradas: RegistroVenta[];
    config: ConfiguracionEmpresa;
    usuarioActual: Usuario;
    clientes: Colaborador[];
    pantallas: Pantalla[];
    onGenerarOrden: (orden: OrdenDeCompra) => void;
  }

  export const OrdenesMensualesNuevo: React.FC<Props> = ({
    ordenes,
    ventasRegistradas,
    config,
    usuarioActual,
    clientes,
    pantallas,
    onGenerarOrden,
  }) => {
    const hoy = new Date();
    const [mes, setMes] = useState(hoy.getMonth());
    const [año, setAño] = useState(hoy.getFullYear());
    const [expandidoId, setExpandido] = useState<string | null>(null);
    const [modalAbierto, setModal] = useState(false);
    const [error, setError] = useState("");
    const [exito, setExito] = useState("");

    const registrosDelMes = obtenerRegistrosDelMes(ventasRegistradas, mes, año);
    const ordenExistente = obtenerOrdenDelMes(ordenes, mes, año);
    const subtotal = registrosDelMes.reduce((s, v) => s + v.precioGeneral, 0);
    const iva = subtotal * (config.ivaPercentaje / 100);
    const total = subtotal + iva;

    const handleGenerarOrden = () => {
      setError("");
      setExito("");
      if (registrosDelMes.length === 0) {
        setError("No hay ventas registradas para este mes");
        return;
      }
      if (ordenExistente) {
        setError("Ya existe una orden para este mes");
        return;
      }
      const nueva = generarOrdenDelMes(
        ventasRegistradas,
        config,
        usuarioActual.id,
        mes,
        año,
      );
      onGenerarOrden(nueva);
      setExito("✅ Orden generada exitosamente");
      setTimeout(() => setExito(""), 3000);
    };

    // Confirmación desde el modal
    const handleConfirmarModal = (
      colaboradorId: string,
      mesOrden: number,
      añoOrden: number,
    ) => {
      const nueva = generarOrdenDelMes(
        ventasRegistradas,
        config,
        usuarioActual.id,
        mesOrden,
        añoOrden,
      );
      onGenerarOrden(nueva);
      setModal(false);
      setExito("✅ Orden generada exitosamente");
      setTimeout(() => setExito(""), 3000);
    };

    return (
      <div className="ordenes-mensuales-nuevo">
        {/* Encabezado con botón Crear */}
        <div className="ordenes-header">
          <h2>📋 Órdenes de Compra Mensuales</h2>
          <button className="btn btn-primary" onClick={() => setModal(true)}>
            ➕ Crear Orden de Compra
          </button>
        </div>

        <div className="contenido-ordenes">
          <SelectorPeriodo
            mesSeleccionado={mes}
            añoSeleccionado={año}
            onCambiarMes={setMes}
            onCambiarAño={setAño}
          />

          {ordenExistente ? (
            <div className="orden-existente-box">
              <h3>✅ Ya existe una orden para este mes</h3>
              <button
                className="btn btn-secondary"
                onClick={() => setExpandido(ordenExistente.id)}
              >
                Ver Detalles
              </button>
            </div>
          ) : (
            <RegistrosDelMes
              registros={registrosDelMes}
              clientes={clientes}
              pantallas={pantallas}
              mes={mes}
              año={año}
              subtotal={subtotal}
              iva={iva}
              total={total}
              ivaPercentaje={config.ivaPercentaje}
              onGenerar={handleGenerarOrden}
              error={error}
              exito={exito}
            />
          )}
        </div>

        <div className="ordenes-generadas-section">
          <h3>📚 Órdenes Generadas</h3>
          <OrdenesGrid
            ordenes={ordenes}
            clientes={clientes}
            pantallas={pantallas}
            config={config}
            usuarioActual={usuarioActual}
            expandidoId={expandidoId}
            onToggle={(id) => setExpandido(expandidoId === id ? null : id)}
          />
        </div>

        {/* Modal */}
        {modalAbierto && (
          <ModalCrearOrden
            clientes={clientes}
            pantallas={pantallas}
            ventasRegistradas={ventasRegistradas}
            config={config}
            onConfirmar={handleConfirmarModal}
            onCancelar={() => setModal(false)}
          />
        )}
      </div>
    );
  };
