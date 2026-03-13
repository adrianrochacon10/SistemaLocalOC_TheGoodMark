// src/components/ventas/RegistroVentasLista.tsx
import React, { useState } from "react";
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
import { VentaDetalleModal } from "./VentaDetalleModal"; // ← nuevo

interface RegistroVentasListaProps {
  pantallas: Pantalla[];
  asignaciones: AsignacionPantalla[];
  clientes: Colaborador[];
  usuarios: Usuario[]; // ← nuevo
  ventasRegistradas: RegistroVenta[];
  onEliminarVenta: (ventaId: string) => void;
  onNuevaVenta: () => void;
  onEditarVenta: (venta: RegistroVenta) => void;
}

export const RegistroVentasLista: React.FC<RegistroVentasListaProps> = ({
  pantallas,
  asignaciones,
  clientes,
  usuarios = [], // ← nuevo
  ventasRegistradas,
  onEliminarVenta,
  onNuevaVenta,
  onEditarVenta,
}) => {
  const [busquedaVenta, setBusquedaVenta] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("Todos");
  const [filtroCliente, setFiltroCliente] = useState<string>("Todos");
  const [paginaActual, setPaginaActual] = useState(1);
  const [ventaDetalle, setVentaDetalle] = useState<RegistroVenta | null>(null); // ← nuevo

  const ventasPorPagina = 20;

  const ventasFiltradas = ventasRegistradas.filter((venta) => {
    const cliente = clientes.find((c) => c.id === venta.clienteId);
    const coincideBusqueda =
      busquedaVenta === "" ||
      (cliente &&
        cliente.nombre.toLowerCase().includes(busquedaVenta.toLowerCase())) ||
      venta.vendidoA.toLowerCase().includes(busquedaVenta.toLowerCase());
    const coincideEstado =
      filtroEstado === "Todos" || venta.estadoVenta === filtroEstado;
    const coincideCliente =
      filtroCliente === "Todos" || venta.clienteId === filtroCliente;
    return coincideBusqueda && coincideEstado && coincideCliente;
  });

  const totalPaginas = Math.ceil(ventasFiltradas.length / ventasPorPagina);
  const ventasPagina = ventasFiltradas.slice(
    (paginaActual - 1) * ventasPorPagina,
    paginaActual * ventasPorPagina,
  );

  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const añoActual = hoy.getFullYear();

  return (
    <>
      <FiltrosVentas
        busquedaVenta={busquedaVenta}
        filtroEstado={filtroEstado}
        filtroCliente={filtroCliente}
        clientes={clientes}
        asignaciones={asignaciones}
        onBusqueda={(v) => {
          setBusquedaVenta(v);
          setPaginaActual(1);
        }}
        onFiltroEstado={(v) => {
          setFiltroEstado(v);
          setPaginaActual(1);
        }}
        onFiltroCliente={(v) => {
          setFiltroCliente(v);
          setPaginaActual(1);
        }}
        onNuevaVenta={onNuevaVenta}
      />

      <h2>
        📅 Registros de{" "}
        {new Date(añoActual, mesActual).toLocaleString("es-ES", {
          month: "long",
        })}{" "}
        de {añoActual}
      </h2>

      <EstadisticasVentas ventasFiltradas={ventasFiltradas} />

      <div className="ventas-list ventas-compacta">
        {ventasPagina.map((venta) => (
          <VentaCard
            key={venta.id}
            venta={venta}
            clientes={clientes}
            pantallas={pantallas}
            onEditar={onEditarVenta}
            onEliminar={onEliminarVenta}
            onClick={() => setVentaDetalle(venta)} // ← nuevo
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

      {/* Modal de detalle ← nuevo */}
      {ventaDetalle && (
        <VentaDetalleModal
          venta={ventaDetalle}
          clientes={clientes}
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
