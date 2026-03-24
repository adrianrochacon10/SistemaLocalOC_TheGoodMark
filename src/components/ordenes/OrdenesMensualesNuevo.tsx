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

    const nueva: OrdenDeCompra = {
      id: `OC-${año}${String(mes + 1).padStart(2, "0")}-${Date.now()}`,
      numeroOrden: `OC-${año}${String(mes + 1).padStart(2, "0")}-${Date.now()}`,
      fecha: new Date(),
      estado: "generada",
      mes,
      año,
      registrosVenta: registrosDelMes,
      subtotal,
      ivaPercentaje: config.ivaPercentaje,
      ivaTotal: iva,
      total,
    };

    onGenerarOrden(nueva);
    setExito("Orden generada exitosamente");
    setTimeout(() => setExito(""), 3000);
  };

  const handleConfirmarModal = (
    colaboradorId: string,
    mesOrden: number,
    añoOrden: number,
  ) => {
    const registros = ventasRegistradas.filter((v) => {
      const fecha = new Date(v.fechaInicio);
      return (
        v.colaboradorId === colaboradorId &&
        fecha.getMonth() === mesOrden &&
        fecha.getFullYear() === añoOrden
      );
    });

    const sub = registros.reduce((s, v) => s + v.precioGeneral, 0);
    const ivaCalc = sub * (config.ivaPercentaje / 100);
    const totalCalc = sub + ivaCalc;

    const nueva: OrdenDeCompra = {
      id: `OC-${añoOrden}${String(mesOrden + 1).padStart(2, "0")}-${Date.now()}`,
      numeroOrden: `OC-${añoOrden}${String(mesOrden + 1).padStart(2, "0")}-${Date.now()}`,
      fecha: new Date(),
      estado: "generada",
      mes: mesOrden,
      año: añoOrden,
      registrosVenta: registros,
      subtotal: sub,
      ivaPercentaje: config.ivaPercentaje,
      ivaTotal: ivaCalc,
      total: totalCalc,
    };

    onGenerarOrden(nueva);
    setModal(false);
    setExito("✅ Orden generada exitosamente");
    setTimeout(() => setExito(""), 3000);
  };

  return (
    <div className="ordenes-mensuales-nuevo">
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
