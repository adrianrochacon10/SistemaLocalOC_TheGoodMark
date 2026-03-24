import React, { useState } from "react";
import {
  RegistroVenta,
  OrdenDeCompra,
  ConfiguracionEmpresa,
  Usuario,
  Pantalla,
  Colaborador,
} from "../../types";
import { obtenerRegistrosDelMes } from "../../utils/ordenUtils";
import "./OrdenesMensualesNuevo.css";
import { SelectorPeriodo } from "./components/SelectorPeriodo";
import { RegistrosDelMes } from "./components/RegistrosDelMes";
import { OrdenesGrid } from "./components/OrdenesGrid";
import { ModalCrearOrden } from "./components/ModalCrearOrden";
import type { CrearOrdenPayload } from "../../utils/ordenCompraLineas";

const MESES = [
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

interface Props {
  ordenes: OrdenDeCompra[];
  ventasRegistradas: RegistroVenta[];
  config: ConfiguracionEmpresa;
  usuarioActual: Usuario;
  clientes: Colaborador[];
  pantallas: Pantalla[];
  onGenerarOrdenMesEnBackend: (mes: number, año: number) => Promise<void>;
  onCrearOrdenEnBackend: (payload: CrearOrdenPayload) => Promise<void>;
  onRecargarColaboradores?: () => Promise<void>;
}

export const OrdenesMensualesNuevo: React.FC<Props> = ({
  ordenes,
  ventasRegistradas,
  config,
  usuarioActual,
  clientes,
  pantallas,
  onGenerarOrdenMesEnBackend,
  onCrearOrdenEnBackend,
  onRecargarColaboradores,
}) => {
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth());
  const [año, setAño] = useState(hoy.getFullYear());
  const [expandidoId, setExpandido] = useState<string | null>(null);
  const [modalAbierto, setModal] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [generandoMes, setGenerandoMes] = useState(false);

  const registrosDelMes = obtenerRegistrosDelMes(ventasRegistradas, mes, año);
  const ordenesEsteMes = ordenes.filter((o) => o.mes === mes && o.año === año);
  const subtotal = registrosDelMes.reduce((s, v) => s + v.precioGeneral, 0);
  const iva = subtotal * (config.ivaPercentaje / 100);
  const total = subtotal + iva;

  const handleGenerarOrdenMes = async () => {
    setError("");
    setExito("");
    if (registrosDelMes.length === 0) {
      setError("No hay ventas registradas para este mes");
      return;
    }
    setGenerandoMes(true);
    try {
      await onGenerarOrdenMesEnBackend(mes, año);
      setExito(
        "Órdenes del mes guardadas en la base (una por colaborador, ventas que tocan este mes).",
      );
      setTimeout(() => setExito(""), 5000);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudieron guardar las órdenes en el servidor",
      );
    } finally {
      setGenerandoMes(false);
    }
  };

  const handleConfirmarModal = async (payload: CrearOrdenPayload) => {
    setError("");
    setExito("");
    try {
      await onCrearOrdenEnBackend(payload);
      setModal(false);
      setExito("✅ Orden guardada en la base de datos");
      setTimeout(() => setExito(""), 4000);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo guardar la orden",
      );
    }
  };

  return (
    <div className="ordenes-mensuales-nuevo">
      <div className="ordenes-header">
        <div className="ordenes-titulo-row">
          <h2>📋 Órdenes de Compra Mensuales</h2>
          <button
            type="button"
            className="btn btn-primary btn-crear-orden-inline"
            onClick={() => {
              setError("");
              setModal(true);
            }}
          >
            ➕ Crear orden
          </button>
        </div>
      </div>

      {exito ? (
        <div className="orden-exito-banner" role="status">
          {exito}
        </div>
      ) : null}

      <div className="contenido-ordenes">
        <SelectorPeriodo
          mesSeleccionado={mes}
          añoSeleccionado={año}
          onCambiarMes={setMes}
          onCambiarAño={setAño}
        />

        {error && !modalAbierto && (
          <div className="orden-error-banner" role="alert">
            {error}
          </div>
        )}

        {ordenesEsteMes.length > 0 && (
          <div className="orden-ya-en-bd-banner" role="status">
            <strong>{ordenesEsteMes.length}</strong> orden(es) en la base para{" "}
            {MESES[mes]} {año}. Puedes volver a generar desde ventas o crear una
            orden manual con «Crear orden».
          </div>
        )}

        {registrosDelMes.length === 0 ? (
          <div className="registros-section">
            <h3>
              📅 Registros de Ventas - {MESES[mes]} {año}
            </h3>
            <div className="no-registros">
              <p>No hay ventas registradas para este mes</p>
            </div>
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
            onGenerar={handleGenerarOrdenMes}
            generando={generandoMes}
            error={error}
            exito={exito}
          />
        )}
      </div>

      <div className="ordenes-generadas-section">
        <h3>📚 Órdenes en base de datos</h3>
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
          onCancelar={() => {
            setError("");
            setModal(false);
          }}
          mensajeError={error}
          onRecargarColaboradores={onRecargarColaboradores}
        />
      )}
    </div>
  );
};
