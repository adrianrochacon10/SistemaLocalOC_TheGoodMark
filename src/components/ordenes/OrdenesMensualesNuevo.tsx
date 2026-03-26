import React, { useState } from "react";
import {
  RegistroVenta,
  OrdenDeCompra,
  ConfiguracionEmpresa,
  Usuario,
  Pantalla,
  Producto,
  Colaborador,
} from "../../types";
import "./OrdenesMensualesNuevo.css";
import { SelectorPeriodo } from "./components/SelectorPeriodo";
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
  productos: Producto[];
  config: ConfiguracionEmpresa;
  usuarioActual: Usuario;
  clientes: Colaborador[];
  pantallas: Pantalla[];
  onCrearOrdenEnBackend: (payload: CrearOrdenPayload) => Promise<void>;
  onRecargarColaboradores?: () => Promise<void>;
}

export const OrdenesMensualesNuevo: React.FC<Props> = ({
  ordenes,
  ventasRegistradas,
  config,
  productos,
  usuarioActual,
  clientes,
  pantallas,
  onCrearOrdenEnBackend,
  onRecargarColaboradores,
}) => {
  console.log("productos en OrdenesMensualesNuevo:", productos);
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth());
  const [año, setAño] = useState(hoy.getFullYear());
  const [expandidoId, setExpandido] = useState<string | null>(null);
  const [modalAbierto, setModal] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const ordenesEsteMes = ordenes.filter((o) => o.mes === mes && o.año === año);

  const handleConfirmarModal = async (payload: CrearOrdenPayload) => {
    setError("");
    setExito("");
    try {
      await onCrearOrdenEnBackend(payload);
      setMes(payload.mes);
      setAño(payload.año);
      setModal(false);
      setExito(
        "Orden guardada. Se añadió a la lista de abajo; las anteriores del mismo mes se mantienen.",
      );
      setTimeout(() => setExito(""), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la orden");
    }
  };

  return (
    <div className="ordenes-mensuales-nuevo">
      <div className="ordenes-header ordenes-header-bar">
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
            <strong>{ordenesEsteMes.length}</strong> orden
            {ordenesEsteMes.length === 1 ? "" : "es"} guardada
            {ordenesEsteMes.length === 1 ? "" : "s"} para {MESES[mes]} {año}.
            Puedes crear otra con «Crear orden» sin perder las demás.
          </div>
        )}
      </div>

      <div className="ordenes-generadas-section">
        <h3>
          Órdenes de {MESES[mes]} {año}
        </h3>
        <p className="ordenes-bd-hint">
          Aquí ves las órdenes de compra de este mes y año (el selector está
          arriba). Cada vez que guardas una nueva, se suma a la lista.
        </p>
        <OrdenesGrid
          ordenes={ordenesEsteMes}
          vacioMensaje={`Todavía no hay órdenes para ${MESES[mes]} ${año}. Usa «Crear orden» para añadir una.`}
          clientes={clientes}
          pantallas={pantallas}
          config={config}
          usuarioActual={usuarioActual}
          productos={productos}
          expandidoId={expandidoId}
          onToggle={(id) => setExpandido(expandidoId === id ? null : id)}
        />
      </div>

      {modalAbierto && (
        <ModalCrearOrden
          clientes={clientes}
          pantallas={pantallas}
          ventasRegistradas={ventasRegistradas}
          productos={productos}
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
