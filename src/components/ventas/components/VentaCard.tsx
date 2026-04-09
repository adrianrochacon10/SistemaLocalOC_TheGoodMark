import { colorPorEstado } from "../../../utils/colores";
import { diasEntreFechasInicioFin, formatearFecha } from "../../../utils/formateoFecha";
import { formatearMoneda } from "../../../utils/formateoMoneda";
import { Colaborador, Pantalla, RegistroVenta } from "../../../types";
import { utilidadNetaContratoParaKpi } from "../../../utils/utilidadVenta";
import { inferirDuracionUnidadVenta } from "../../../utils/duracionVenta";
import { confirmWithToast } from "../../../lib/confirmWithToast";

interface VentaCardProps {
  venta: RegistroVenta;
  colaboradores: Colaborador[];
  pantallas: Pantalla[];
  onEditar: (venta: RegistroVenta) => void;
  onEliminar: (id: string) => void;
  onClick?: () => void;
}

export const VentaCard: React.FC<VentaCardProps> = ({
  venta,
  colaboradores,
  pantallas,
  onEditar,
  onEliminar,
  onClick,
}) => {
  const colaborador = colaboradores.find((c) => c.id === venta.colaboradorId);

  const esVentaPorDias = (v: RegistroVenta): boolean =>
    inferirDuracionUnidadVenta(v as any) === "dias";

  // ✅ Pantallas con recorte
  const todasLasPantallas = venta.pantallasIds
    .map((id) => pantallas.find((p) => p.id === id)?.nombre)
    .filter(Boolean) as string[];
  const MAX_PANTALLAS = 2;
  const pantallasVisibles = todasLasPantallas.slice(0, MAX_PANTALLAS);
  const pantallasExtra = todasLasPantallas.length - MAX_PANTALLAS;

  const colores = colorPorEstado(venta.estadoVenta ?? "Prospecto");
  const colorColaborador =
    (colaborador as { color?: string } | undefined)?.color ?? "#1461a1";

  const meses = Math.max(1, Number(venta.mesesRenta) || 1);
  const precioMes = Number(venta.precioGeneral ?? 0) || 0;
  const precioTotalContrato =
    Number(venta.precioTotal ?? 0) > 0
      ? Number(venta.precioTotal ?? 0)
      : Number(venta.importeTotal ?? 0) > 0
        ? Number(venta.importeTotal ?? 0)
        : precioMes * meses;

  const fi =
    venta.fechaInicio instanceof Date
      ? venta.fechaInicio
      : new Date(venta.fechaInicio);
  const ff =
    venta.fechaFin instanceof Date
      ? venta.fechaFin
      : new Date(venta.fechaFin);
  const diasEnContrato = diasEntreFechasInicioFin(fi, ff);
  const unidadEsDia = esVentaPorDias(venta);

  const precioPorPeriodo =
    precioMes > 0
      ? precioMes
      : meses > 0
        ? precioTotalContrato / meses
        : 0;
  const utilidadNetaCard = unidadEsDia
    ? Math.max(0, Number(venta.costoVenta ?? venta.costos ?? 0) || 0)
    : Math.max(
        0,
        utilidadNetaContratoParaKpi(venta, colaboradores) - (Number(venta.gastosAdicionales ?? 0) || 0),
      );

  return (
    <div
      key={venta.id}
      className="venta-item venta-reducida cursor-pointer"
      onClick={onClick}
      style={{
        borderLeft: `10px solid ${colorColaborador}`,
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
            e.stopPropagation();
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
            e.stopPropagation();
            void (async () => {
              const ok = await confirmWithToast("¿Eliminar esta venta?");
              if (ok) onEliminar(venta.id);
            })();
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

      {/* ✅ Badge colaborador + pantallas en 2 líneas */}
      <div style={{ marginBottom: 4 }}>
        {/* Línea 1: badge */}
        <span
          style={{
            display: "inline-block",
            background: colorColaborador,
            color: "#fff",
            borderRadius: "6px",
            padding: "2px 10px",
            fontWeight: 700,
            fontSize: "0.85em",
            whiteSpace: "nowrap",
            marginBottom: 2,
          }}
        >
          {colaborador?.nombre ?? "Sin colaborador"}
        </span>

        {/* Línea 2: pantallas con ellipsis */}
        {todasLasPantallas.length > 0 && (
          <div
            title={todasLasPantallas.join(", ")}
            style={{
              fontWeight: 600,
              color: "#334155",
              fontSize: "0.85em",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              maxWidth: "calc(100% - 10px)",
            }}
          >
            {pantallasVisibles.join(", ")}
            {pantallasExtra > 0 && (
              <span style={{ color: "#94a3b8", fontWeight: 400 }}>
                {" "}
                +{pantallasExtra} más
              </span>
            )}
          </div>
        )}
      </div>

      {/* Utilidad neta + estado */}
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
          {formatearMoneda(utilidadNetaCard)}
        </span>

        <span
          style={{ color: "#64748b", fontSize: "0.82em", fontWeight: 500 }}
        >
          {unidadEsDia
            ? `Costo fijo por día: ${formatearMoneda(precioPorPeriodo)}`
            : `Utilidad por periodo (por mes): ${formatearMoneda(precioPorPeriodo)}`}
        </span>

        {venta.importeTotal !== venta.precioTotal && venta.precioTotal && (
          <span
            style={{
              textDecoration: "line-through",
              color: "#9ca3af",
              fontSize: "0.82em",
            }}
          >
            {formatearMoneda(venta.precioTotal)}
          </span>
        )}

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
        <span>
          👤{" "}
          {venta.vendidoA && venta.vendidoA !== "-"
            ? venta.vendidoA
            : "Sin receptor"}
        </span>
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
          title={`${diasEnContrato} días calendario en el rango`}
        >
          {unidadEsDia
            ? `${venta.mesesRenta} ${venta.mesesRenta === 1 ? "día" : "días"}`
            : `${venta.mesesRenta} ${venta.mesesRenta === 1 ? "mes" : "meses"}`}
        </span>
      </div>
    </div>
  );
};
