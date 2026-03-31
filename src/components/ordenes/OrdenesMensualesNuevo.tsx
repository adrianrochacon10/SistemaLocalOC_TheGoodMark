import React, { useState } from "react";
import {
  RegistroVenta,
  OrdenDeCompra,
  ConfiguracionEmpresa,
  Usuario,
  Pantalla,
  Colaborador,
} from "../../types";
import "./OrdenesMensualesNuevo.css";
import { SelectorPeriodo } from "./components/SelectorPeriodo";
import { OrdenesGrid } from "./components/OrdenesGrid";
import { ModalCrearOrden } from "./components/ModalCrearOrden";
import type { CrearOrdenPayload } from "../../utils/ordenCompraLineas";
import { ordenApareceEnMesVista } from "../../utils/ordenUtils";

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
  onCrearOrdenEnBackend: (payload: CrearOrdenPayload) => Promise<void>;
  onEliminarOrden: (ordenId: string) => Promise<void>;
  onRecargarColaboradores?: () => Promise<void>;
}

export const OrdenesMensualesNuevo: React.FC<Props> = ({
  ordenes,
  ventasRegistradas,
  config,
  usuarioActual,
  clientes,
  pantallas,
  onCrearOrdenEnBackend,
  onEliminarOrden,
  onRecargarColaboradores,
}) => {
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth());
  const [año, setAño] = useState(hoy.getFullYear());
  const [expandidoId, setExpandido] = useState<string | null>(null);
  const [modalAbierto, setModal] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [colaboradorFiltroId, setColaboradorFiltroId] = useState<string>("");

  const ordenesEsteMes = ordenes.filter((o) => {
    if (!ordenApareceEnMesVista(o, mes, año)) return false;
    if (!colaboradorFiltroId) return true;
    return String(o.colaboradorId ?? "") === String(colaboradorFiltroId);
  });

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
      setError(
        e instanceof Error ? e.message : "No se pudo guardar la orden",
      );
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
          colaboradorFiltroId={colaboradorFiltroId}
          onCambiarColaborador={setColaboradorFiltroId}
          clientes={clientes}
        />

        {error && !modalAbierto && (
          <div className="orden-error-banner" role="alert">
            {error}
          </div>
        )}

      </div>

      <div className="ordenes-generadas-section">
        <h3>
          Órdenes de {MESES[mes]} {año}
        </h3>
        <OrdenesGrid
          ordenes={ordenesEsteMes}
          vacioMensaje={`Todavía no hay órdenes para ${MESES[mes]} ${año}. Usa «Crear orden» para añadir una.`}
          clientes={clientes}
          pantallas={pantallas}
          config={config}
          usuarioActual={usuarioActual}
          expandidoId={expandidoId}
          onToggle={(id) => setExpandido(expandidoId === id ? null : id)}
          onEliminarOrden={onEliminarOrden}
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
