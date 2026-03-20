import React, { useMemo, useState } from "react";
import {
  RegistroVenta,
  Pantalla,
  AsignacionPantalla,
  Colaborador,
  Usuario,
} from "../../../types";
import { FiltrosVentas } from "./filtrosVentas";
import { EstadisticasVentas } from "./EstadisticasVenta";
import { VentaCard } from "./VentaCard";
import { VentaDetalleModal } from "./VentaDetalleModal";

interface RegistroVentasListaProps {
  pantallas: Pantalla[];
  asignaciones: AsignacionPantalla[];
  colaboradores: Colaborador[];
  usuarios: Usuario[];
  ventasRegistradas: RegistroVenta[];
  onEliminarVenta: (ventaId: string) => void;
  onNuevaVenta: () => void;
  onEditarVenta: (venta: RegistroVenta) => void;
}

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export const RegistroVentasLista: React.FC<RegistroVentasListaProps> = ({
  pantallas,
  asignaciones,
  colaboradores,
  usuarios = [],
  ventasRegistradas,
  onEliminarVenta,
  onNuevaVenta,
  onEditarVenta,
}) => {
  const hoy = new Date();

  const [busquedaVenta, setBusquedaVenta] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("Todos");
  const [filtroCliente, setFiltroCliente] = useState<string>("Todos");
  const [filtroMes, setFiltroMes] = useState<number>(hoy.getMonth());
  const [filtroAnio, setFiltroAnio] = useState<number>(hoy.getFullYear());
  const [paginaActual, setPaginaActual] = useState(1);
  const [ventaDetalle, setVentaDetalle] = useState<RegistroVenta | null>(null);

  const ventasPorPagina = 20;

  // Años disponibles derivados de las ventas
  const aniosDisponibles = useMemo(() => {
    const set = new Set(
      ventasRegistradas.map((v) => new Date(v.fechaInicio).getFullYear()),
    );
    const arr = Array.from(set).sort((a, b) => b - a);
    if (!arr.includes(hoy.getFullYear())) arr.unshift(hoy.getFullYear());
    return arr;
  }, [ventasRegistradas]);

  const ventasFiltradas = useMemo(() => {
    return ventasRegistradas.filter((venta) => {
      const colaborador = colaboradores.find((c) => c.id === venta.colaboradorId);
      const fecha = new Date(venta.fechaInicio);

      const coincideBusqueda =
        busquedaVenta === "" ||
        colaborador?.nombre.toLowerCase().includes(busquedaVenta.toLowerCase()) ||
        venta.vendidoA.toLowerCase().includes(busquedaVenta.toLowerCase());

      const coincideEstado =
        filtroEstado === "Todos" ||
        (venta.estadoVenta ?? "Prospecto") === filtroEstado;

      const coincideCliente =
        filtroCliente === "Todos" || venta.colaboradorId === filtroCliente;

      const coincideMes = fecha.getMonth() === filtroMes;
      const coincideAnio = fecha.getFullYear() === filtroAnio;

      return (
        coincideBusqueda &&
        coincideEstado &&
        coincideCliente &&
        coincideMes &&
        coincideAnio
      );
    });
  }, [
    ventasRegistradas,
    busquedaVenta,
    filtroEstado,
    filtroCliente,
    filtroMes,
    filtroAnio,
  ]);

  const totalPaginas = Math.ceil(ventasFiltradas.length / ventasPorPagina);
  const ventasPagina = ventasFiltradas.slice(
    (paginaActual - 1) * ventasPorPagina,
    paginaActual * ventasPorPagina,
  );

  const resetPagina = () => setPaginaActual(1);

  return (
    <>
      <FiltrosVentas
        busquedaVenta={busquedaVenta}
        filtroEstado={filtroEstado}
        filtroCliente={filtroCliente}
        filtroMes={filtroMes}
        filtroAnio={filtroAnio}
        aniosDisponibles={aniosDisponibles}
        colaboradores={colaboradores}
        asignaciones={asignaciones}
        onBusqueda={(v) => {
          setBusquedaVenta(v);
          resetPagina();
        }}
        onFiltroEstado={(v) => {
          setFiltroEstado(v);
          resetPagina();
        }}
        onFiltroCliente={(v) => {
          setFiltroCliente(v);
          resetPagina();
        }}
        onFiltroMes={(v) => {
          setFiltroMes(v);
          resetPagina();
        }}
        onFiltroAnio={(v) => {
          setFiltroAnio(v);
          resetPagina();
        }}
        onNuevaVenta={onNuevaVenta}
      />

      <h2>
        📅 Registros de {MESES[filtroMes]} de {filtroAnio}
      </h2>

      <EstadisticasVentas ventasFiltradas={ventasFiltradas} />

      <div className="ventas-list ventas-compacta">
        {ventasPagina.map((venta) => (
          <VentaCard
            key={venta.id}
            venta={venta}
            colaboradores={colaboradores}
            pantallas={pantallas}
            onEditar={onEditarVenta}
            onEliminar={onEliminarVenta}
            onClick={() => setVentaDetalle(venta)}
          />
        ))}
      </div>

      {/* Paginación */}
      <div className="paginacion-ventas">
        <button
          disabled={paginaActual === 1}
          onClick={() => setPaginaActual(paginaActual - 1)}
        >
          ◀
        </button>
        <span>
          Página {paginaActual} de {totalPaginas || 1}
        </span>
        <button
          disabled={paginaActual === totalPaginas || totalPaginas === 0}
          onClick={() => setPaginaActual(paginaActual + 1)}
        >
          ▶
        </button>
      </div>

      {ventaDetalle && (
        <VentaDetalleModal
          venta={ventaDetalle}
          colaboradores={colaboradores}
          pantallas={pantallas}
          usuarios={usuarios}
          onCerrar={() => setVentaDetalle(null)}
          onEditar={(v) => {
            onEditarVenta(v);
            setVentaDetalle(null);
          }}
        />
      )}
    </>
  );
};
