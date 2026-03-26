import React from "react";
import { Colaborador, AsignacionPantalla, Usuario } from "../../../types";

interface FiltrosVentasProps {
  busquedaVenta: string;
  filtroEstado: string;
  filtroCliente: string;
  filtroVendedor: string;
  filtroMes: number;
  filtroAnio: number;
  aniosDisponibles: number[];
  colaboradores: Colaborador[];
  usuarios: Usuario[];
  asignaciones: AsignacionPantalla[];
  onBusqueda: (valor: string) => void;
  onFiltroEstado: (estado: string) => void;
  onFiltroCliente: (clienteId: string) => void;
  onFiltroVendedor: (vendedorId: string) => void;
  onFiltroMes: (mes: number) => void;
  onFiltroAnio: (anio: number) => void;
  onNuevaVenta: () => void;
}

const ESTADOS = ["Todos", "Prospecto", "Aceptado", "Rechazado"];

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

const colorEstadoActivo = (estado: string): string => {
  if (estado === "Aceptado") return "#22c55e";
  if (estado === "Rechazado") return "#ef4444";
  if (estado === "Prospecto") return "#eab308";
  return "#1461a1";
};

export const FiltrosVentas: React.FC<FiltrosVentasProps> = ({
  busquedaVenta,
  filtroEstado,
  filtroCliente,
  filtroVendedor,
  filtroMes,
  filtroAnio,
  aniosDisponibles,
  colaboradores,
  usuarios,
  asignaciones,
  onBusqueda,
  onFiltroEstado,
  onFiltroCliente,
  onFiltroVendedor,
  onFiltroMes,
  onFiltroAnio,
  onNuevaVenta,
}) => {
  return (
    <>
      <div className="ventas-header">
        <button className="btn btn-flotante" onClick={onNuevaVenta}>
          <span style={{ fontSize: "1.3em", marginRight: 6 }}>＋</span>{" "}
          Registrar Venta
        </button>
        <input
          type="text"
          placeholder="Buscar Colaborador..."
          value={busquedaVenta}
          onChange={(e) => onBusqueda(e.target.value)}
          className="buscador-ventas"
        />
      </div>

      <div className="ventas-filtros">
        {/* Filtro por Estado */}
        <div className="filtro-grupo">
          <label>Estado:</label>
          <div className="filtro-botones">
            {ESTADOS.map((estado) => {
              const activo = filtroEstado === estado;
              return (
                <button
                  key={estado}
                  onClick={() => onFiltroEstado(estado)}
                  className="filtro-btn"
                  style={{
                    background: activo
                      ? colorEstadoActivo(estado)
                      : "transparent",
                    color: activo
                      ? estado === "Prospecto"
                        ? "#000"
                        : "#fff"
                      : "#555",
                    border: activo ? "2px solid transparent" : "2px solid #ddd",
                    borderRadius: "20px",
                    padding: "4px 14px",
                    cursor: "pointer",
                    fontWeight: activo ? 700 : 400,
                    transition: "all 0.2s",
                  }}
                >
                  {estado}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filtro por Colaborador */}
        <div className="filtro-grupo">
          <label>Colaborador:</label>
          <select
            value={filtroCliente}
            onChange={(e) => onFiltroCliente(e.target.value)}
            className="select-filtro"
            style={{
              borderLeft:
                filtroCliente !== "Todos"
                  ? `5px solid ${colaboradores.find((c) => c.id === filtroCliente)?.color || "#1461a1"}`
                  : undefined,
            }}
          >
            <option value="Todos">— Todos los colaboradores —</option>
            {colaboradores
              .filter((c) =>
                asignaciones.some((a) => a.clienteId === c.id && a.activa),
              )
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
          </select>
        </div>

        <div className="filtro-grupo">
          <label>Vendedor:</label>
          <select
            value={filtroVendedor}
            onChange={(e) => onFiltroVendedor(e.target.value)}
            className="select-filtro"
          >
            <option value="Todos">— Todos los vendedores —</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro por Periodo */}
        <div className="filtro-grupo">
          <label>Periodo:</label>
          <div className="filtro-periodo">
            <select
              value={filtroMes}
              onChange={(e) => onFiltroMes(Number(e.target.value))}
              className="select-filtro"
            >
              <option value={-1}>Todos los meses</option>
              {MESES.map((m, i) => (
                <option key={i} value={i}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={filtroAnio}
              onChange={(e) => onFiltroAnio(Number(e.target.value))}
              className="select-filtro"
            >
              <option value={-1}>Todos los años</option>
              {aniosDisponibles.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </>
  );
};
