import React, { useEffect, useMemo, useState } from "react";
import {
  RegistroVenta,
  Pantalla,
  AsignacionPantalla,
  Colaborador,
  Usuario,
} from "../../../types";
import { backendApi } from "../../../lib/backendApi";
import { ventaSolapaMesCalendario } from "../../../utils/ventaFiltroPeriodo";
import { FiltrosVentas, type FilaClienteCompradorFiltro } from "./filtrosVentas";
import { EstadisticasVentas } from "./EstadisticasVenta";
import { VentaCard } from "./VentaCard";
import { VentaDetalleModal } from "./VentaDetalleModal";

interface RegistroVentasListaProps {
  pantallas: Pantalla[];
  asignaciones: AsignacionPantalla[];
  colaboradores: Colaborador[];
  usuarios: Usuario[];
  ventasRegistradas: RegistroVenta[];
  /** Si es true, muestra el resumen numérico (solo administradores). */
  esAdmin?: boolean;
  onVentasFiltradasChange?: (ventas: RegistroVenta[]) => void;
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
  colaboradores = [],
  usuarios = [],
  ventasRegistradas,
  esAdmin = false,
  onVentasFiltradasChange,
  onEliminarVenta,
  onNuevaVenta,
  onEditarVenta,
}) => {
  const [busquedaVenta, setBusquedaVenta] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("Todos");
  const [filtroCliente, setFiltroCliente] = useState<string>("Todos");
  const [filtroCompradorCliente, setFiltroCompradorCliente] =
    useState<string>("Todos");
  const [catalogoClientesComprador, setCatalogoClientesComprador] = useState<
    FilaClienteCompradorFiltro[]
  >([]);
  const [filtroVendedor, setFiltroVendedor] = useState<string>("Todos");
  const [filtroMes, setFiltroMes] = useState<number>(-1);
  const [filtroAnio, setFiltroAnio] = useState<number>(-1);
  const [paginaActual, setPaginaActual] = useState(1);
  const [ventaDetalle, setVentaDetalle] = useState<RegistroVenta | null>(null);

  const ventasPorPagina = 20;

  useEffect(() => {
    let cancel = false;
    void (async () => {
      try {
        const rows = (await backendApi.get("/api/clients")) as {
          id: string;
          nombre: string;
        }[];
        if (cancel || !Array.isArray(rows)) return;
        setCatalogoClientesComprador(
          rows.map((r) => ({ id: String(r.id), nombre: String(r.nombre ?? "") })),
        );
      } catch {
        if (!cancel) setCatalogoClientesComprador([]);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const aniosDisponibles = useMemo(() => {
    const set = new Set<number>();
    for (const v of ventasRegistradas) {
      const fi = new Date(v.fechaInicio);
      const ff = new Date(v.fechaFin);
      if (Number.isNaN(fi.getTime()) || Number.isNaN(ff.getTime())) continue;
      const y1 = fi.getFullYear();
      const y2 = ff.getFullYear();
      const a = Math.min(y1, y2);
      const b = Math.max(y1, y2);
      for (let y = a; y <= b; y += 1) set.add(y);
    }
    const arr = Array.from(set).sort((a, b) => b - a);
    const yNow = new Date().getFullYear();
    if (!arr.includes(yNow)) arr.unshift(yNow);
    return arr;
  }, [ventasRegistradas]);

  const ventasFiltradas = useMemo(() => {
    return ventasRegistradas.filter((venta) => {
      const colaborador = colaboradores.find(
        (c) => c.id === venta.colaboradorId,
      );

      const q = busquedaVenta.trim().toLowerCase();
      const vendido = (venta.vendidoA ?? "").toLowerCase();
      const nombreColab = (colaborador?.nombre ?? "").toLowerCase();
      const aliasTexto = String(
        colaborador?.alias ?? venta.colaboradorAlias ?? "",
      ).toLowerCase();
      const coincideBusqueda =
        q === "" ||
        nombreColab.includes(q) ||
        aliasTexto.includes(q) ||
        vendido.includes(q);

      // Filtro por estado
      const coincideEstado =
        filtroEstado === "Todos" ||
        (venta.estadoVenta ?? "Prospecto") === filtroEstado;

      const coincideColaborador =
        filtroCliente === "Todos" || venta.colaboradorId === filtroCliente;

      const cid = String(venta.clientId ?? "").trim();
      const sinCatalogo = !cid;
      const coincideCompradorFiltro =
        filtroCompradorCliente === "Todos" ||
        (filtroCompradorCliente === "__legacy__" && sinCatalogo) ||
        (filtroCompradorCliente !== "__legacy__" &&
          filtroCompradorCliente !== "Todos" &&
          cid === filtroCompradorCliente);

      const coincideVendedor =
        filtroVendedor === "Todos" ||
        String(venta.vendedorId ?? "") === String(filtroVendedor);

      const coincideMesAnio = ventaSolapaMesCalendario(
        venta.fechaInicio,
        venta.fechaFin,
        filtroMes,
        filtroAnio,
      );

      return (
        coincideBusqueda &&
        coincideEstado &&
        coincideColaborador &&
        coincideCompradorFiltro &&
        coincideVendedor &&
        coincideMesAnio
      );
    });
  }, [
    ventasRegistradas,
    busquedaVenta,
    filtroEstado,
    filtroCliente,
    filtroCompradorCliente,
    filtroMes,
    filtroAnio,
    filtroVendedor,
    colaboradores,
  ]);

  const totalPaginas = Math.ceil(ventasFiltradas.length / ventasPorPagina);
  const ventasPagina = ventasFiltradas.slice(
    (paginaActual - 1) * ventasPorPagina,
    paginaActual * ventasPorPagina,
  );

  const resetPagina = () => setPaginaActual(1);

  useEffect(() => {
    onVentasFiltradasChange?.(ventasFiltradas);
  }, [ventasFiltradas, onVentasFiltradasChange]);

  return (
    <>
      <FiltrosVentas
        busquedaVenta={busquedaVenta}
        filtroEstado={filtroEstado}
        filtroCliente={filtroCliente}
        filtroCompradorCliente={filtroCompradorCliente}
        filtroVendedor={filtroVendedor}
        filtroMes={filtroMes}
        filtroAnio={filtroAnio}
        aniosDisponibles={aniosDisponibles}
        colaboradores={colaboradores}
        catalogoClientesComprador={catalogoClientesComprador}
        usuarios={usuarios}
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
        onFiltroCompradorCliente={(v) => {
          setFiltroCompradorCliente(v);
          resetPagina();
        }}
        onFiltroVendedor={(v) => {
          setFiltroVendedor(v);
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
        📅{" "}
        {filtroMes < 0 && filtroAnio < 0
          ? "Todas las ventas"
          : filtroMes < 0
            ? `Ventas con contrato en ${filtroAnio}`
            : filtroAnio < 0
              ? `Ventas que pasan por ${MESES[filtroMes]} (cualquier año)`
              : `Ventas que pasan por ${MESES[filtroMes]} de ${filtroAnio}`}
      </h2>

      {esAdmin ? (
        <EstadisticasVentas ventasFiltradas={ventasFiltradas} />
      ) : null}

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
