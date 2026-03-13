import React from "react";
import { Colaborador, Pantalla, RegistroVenta } from "../../../types";
import { colorPorEstado } from "../../../utils/colores";
import { formatearFecha } from "../../../utils/formateoFecha";
import { formatearMoneda } from "../../../utils/formateoMoneda";

interface VentaCardProps {
  venta: RegistroVenta;
  clientes: Colaborador[];
  pantallas: Pantalla[];
  onEditar: (venta: RegistroVenta) => void;
  onEliminar: (id: string) => void;
  onClick?: () => void;
}

export const VentaCard: React.FC<VentaCardProps> = ({
  venta,
  clientes,
  pantallas,
  onEditar,
  onEliminar,
  onClick,
}) => {
  const cliente = clientes.find((c) => c.id === venta.clienteId);
  const pantallasNombres = venta.pantallasIds
    .map((id) => pantallas.find((p) => p.id === id)?.nombre)
    .filter(Boolean)
    .join(", ");

  const colores = colorPorEstado(venta.estadoVenta);
  const colorCliente = cliente?.color || "#1461a1";

  return (
    <div
      key={venta.id}
      className="venta-item venta-reducida cursor-pointer"
      onClick={onClick} // ← abre el detalle
      style={{
        borderLeft: `10px solid ${colorCliente}`,
        borderRadius: "8px",
        position: "relative",
        paddingRight: "90px",
        transition: "box-shadow .18s ease, transform .18s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 4px 16px rgba(0,0,0,.12)";
        (e.currentTarget as HTMLDivElement).style.transform =
          "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "";
        (e.currentTarget as HTMLDivElement).style.transform = "";
      }}
    >
      {/* Botones acción */}
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          display: "flex",
          gap: 6,
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation(); // ← evita abrir el detalle
            onEditar(venta);
          }}
          title="Editar"
          style={{
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "3px 9px",
            cursor: "pointer",
            fontSize: "0.8em",
            fontWeight: 600,
          }}
        >
          ✏️
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation(); // ← evita abrir el detalle
            if (confirm("¿Eliminar esta venta?")) onEliminar(venta.id);
          }}
          title="Eliminar"
          style={{
            background: "#ef4444",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            padding: "3px 9px",
            cursor: "pointer",
            fontSize: "0.8em",
            fontWeight: 600,
          }}
        >
          🗑️
        </button>
      </div>

      {/* Nombre cliente */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <span
          style={{
            background: colorCliente,
            color: "#fff",
            borderRadius: "6px",
            padding: "2px 10px",
            fontWeight: 700,
            fontSize: "0.85em",
            letterSpacing: "0.3px",
            whiteSpace: "nowrap",
          }}
        >
          {cliente?.nombre}
        </span>
        <span style={{ fontWeight: 600, color: "#334155", fontSize: "0.9em" }}>
          {pantallasNombres}
        </span>
      </div>

      {/* Importe + estado */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            background: colores.badge,
            color: venta.estadoVenta === "Prospecto" ? "#000" : "#fff",
            borderRadius: "20px",
            padding: "2px 12px",
            fontWeight: 700,
            fontSize: "1em",
          }}
        >
          {formatearMoneda(venta.precioTotal ?? venta.importeTotal ?? 0)}
        </span>
        <span
          style={{
            background: colores.badge,
            color: venta.estadoVenta === "Prospecto" ? "#000" : "#fff",
            borderRadius: "10px",
            padding: "1px 8px",
            fontSize: "0.75em",
            fontWeight: 600,
            opacity: 0.85,
          }}
        >
          {venta.estadoVenta}
        </span>
      </div>

      {/* Receptor + fechas + duración */}
      <div
        style={{
          fontSize: "0.82em",
          color: "#555",
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
        }}
      >
        <span>👤 {venta.vendidoA}</span>
        <span style={{ color: "#aaa" }}>•</span>
        <span>📅 {formatearFecha(venta.fechaInicio)}</span>
        <span style={{ color: "#aaa" }}>→</span>
        <span>{formatearFecha(venta.fechaFin)}</span>
        <span style={{ color: "#aaa" }}>•</span>
        <span
          style={{
            background: "#e0e7ef",
            borderRadius: "8px",
            padding: "0px 7px",
            fontWeight: 600,
            color: "#1461a1",
          }}
        >
          {venta.mesesRenta} {venta.mesesRenta === 1 ? "mes" : "meses"}
        </span>
      </div>
    </div>
  );
};
