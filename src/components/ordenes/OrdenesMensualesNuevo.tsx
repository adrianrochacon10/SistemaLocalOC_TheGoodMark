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

function colaboradorTextoCoincide(
  colaboradorId: string | undefined,
  busqNorm: string,
  clientes: Colaborador[] | undefined,
  nombreFallback?: string,
): boolean {
  if (!busqNorm) return true;
  const list = clientes ?? [];
  const c = list.find((x) => String(x.id) === String(colaboradorId ?? ""));
  if (c) {
    const n = String(c.nombre ?? "").toLowerCase();
    const a = String(c.alias ?? "").toLowerCase();
    return n.includes(busqNorm) || a.includes(busqNorm);
  }
  const fb = String(nombreFallback ?? "").toLowerCase().trim();
  return fb.length > 0 && fb.includes(busqNorm);
}

function ventaCoincideBusquedaNombre(
  v: RegistroVenta,
  busqNorm: string,
  clientes: Colaborador[] | undefined,
): boolean {
  if (!busqNorm) return true;
  const vendido = String(v.vendidoA ?? "").toLowerCase().trim();
  if (vendido.includes(busqNorm)) return true;
  return colaboradorTextoCoincide(v.colaboradorId, busqNorm, clientes);
}

/** Colaborador (nombre/alias) de la orden o ventas, o texto vendido en alguna venta. */
function ordenCoincideBusquedaTexto(
  o: OrdenDeCompra,
  busqNorm: string,
  clientes: Colaborador[] | undefined,
): boolean {
  if (!busqNorm) return true;
  if (
    colaboradorTextoCoincide(
      o.colaboradorId,
      busqNorm,
      clientes,
      o.colaboradorNombre,
    )
  )
    return true;
  const regs = o.registrosVenta ?? [];
  return regs.some((v) => ventaCoincideBusquedaNombre(v, busqNorm, clientes));
}

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
  const [identificadorFiltro, setIdentificadorFiltro] = useState("");
  const [busquedaTexto, setBusquedaTexto] = useState("");

  const idBusq = identificadorFiltro.trim();
  const textoBusq = busquedaTexto.trim().toLowerCase();
  const busquedaSinMes = idBusq.length > 0 || textoBusq.length > 0;
  const identificadorNorm = idBusq.toUpperCase();

  const ordenesMostradas = ordenes.filter((o) => {
    if (!ordenCoincideBusquedaTexto(o, textoBusq, clientes)) return false;

    if (busquedaSinMes) {
      const regs = o.registrosVenta ?? [];
      if (idBusq && textoBusq) {
        const ok = regs.some((v) => {
          const idV = String(v.identificadorVenta ?? "").trim().toUpperCase();
          return (
            idV.length > 0 &&
            idV.includes(identificadorNorm) &&
            ventaCoincideBusquedaNombre(v, textoBusq, clientes)
          );
        });
        if (!ok) return false;
      } else if (idBusq) {
        const okId = regs.some((v) => {
          const idV = String(v.identificadorVenta ?? "").trim().toUpperCase();
          return idV.length > 0 && idV.includes(identificadorNorm);
        });
        if (!okId) return false;
      }
    } else {
      if (!ordenApareceEnMesVista(o, mes, año)) return false;
    }
    return true;
  });

  const handleConfirmarModal = async (payload: CrearOrdenPayload) => {
    setError("");
    try {
      await onCrearOrdenEnBackend(payload);
      setMes(payload.mes);
      setAño(payload.año);
      setModal(false);
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
          <h2>📋 Ordenes de Compra</h2>
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

      <div className="contenido-ordenes">
        <SelectorPeriodo
          mesSeleccionado={mes}
          añoSeleccionado={año}
          onCambiarMes={setMes}
          onCambiarAño={setAño}
          identificadorFiltro={identificadorFiltro}
          onCambiarIdentificador={setIdentificadorFiltro}
          busquedaTexto={busquedaTexto}
          onCambiarBusquedaTexto={setBusquedaTexto}
        />

        {error && !modalAbierto && (
          <div className="orden-error-banner" role="alert">
            {error}
          </div>
        )}

      </div>

      <div className="ordenes-generadas-section">
        <h3>
          {busquedaSinMes ? (
            <>
              Órdenes
              {idBusq ? <> · {idBusq}</> : null}
              {textoBusq ? <> · {busquedaTexto.trim()}</> : null}
            </>
          ) : (
            <>
              Órdenes de {MESES[mes]} {año}
              {textoBusq ? <> · {busquedaTexto.trim()}</> : null}
            </>
          )}
        </h3>
        <OrdenesGrid
          ordenes={ordenesMostradas}
          vacioMensaje={
            busquedaSinMes
              ? "Sin resultados."
              : `Todavía no hay órdenes para ${MESES[mes]} ${año}. Usa «Crear orden» para añadir una.`
          }
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
