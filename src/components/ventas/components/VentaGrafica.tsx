// src/components/ventas/components/VentasGraficas.tsx
import React, { useMemo } from "react";
import { RegistroVenta } from "../../../types";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Pie, Line, Bar } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

interface Props {
  ventasRegistradas: RegistroVenta[];
}

const MESES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export const VentasGraficas: React.FC<Props> = ({ ventasRegistradas }) => {
  const esAceptada = (v: RegistroVenta) =>
    String(v.estadoVenta ?? "").toLowerCase() === "aceptado";

  const utilidadNetaVenta = (v: RegistroVenta) =>
    Number(v.utilidadNeta ?? 0) || 0;

  const costoVenta = (v: RegistroVenta) =>
    Number(v.costoVenta ?? v.costos ?? 0) || 0;

  const gastoAdicionalVenta = (v: RegistroVenta) =>
    Number(v.gastosAdicionales ?? 0) || 0;

  const comisionVenta = (v: RegistroVenta) => Number(v.comision ?? 0) || 0;

  // ── Agrupar por mes/año (todas las aceptadas, incluyendo años pasados) ──
  const datos = useMemo(() => {
    const result: Array<{
      label: string;
      año: number;
      mes: number;
      utilidadNeta: number;
      costos: number;
      gastos: number;
      comision: number;
      egresos: number;
      ventasAceptadas: number;
    }> = [];
    const buckets = new Map<string, {
      año: number;
      mes: number;
      utilidadNeta: number;
      costos: number;
      gastos: number;
      comision: number;
      ventasAceptadas: number;
    }>();

    for (const v of ventasRegistradas) {
      if (!esAceptada(v)) continue;
      const f = new Date(v.fechaRegistro);
      if (Number.isNaN(f.getTime())) continue;
      const año = f.getFullYear();
      const mes = f.getMonth();
      const key = `${año}-${String(mes + 1).padStart(2, "0")}`;
      const curr = buckets.get(key) ?? {
        año,
        mes,
        utilidadNeta: 0,
        costos: 0,
        gastos: 0,
        comision: 0,
        ventasAceptadas: 0,
      };
      curr.utilidadNeta += utilidadNetaVenta(v);
      curr.costos += costoVenta(v);
      curr.gastos += gastoAdicionalVenta(v);
      curr.comision += comisionVenta(v);
      curr.ventasAceptadas += 1;
      buckets.set(key, curr);
    }

    const ordenados = Array.from(buckets.values()).sort(
      (a, b) => a.año - b.año || a.mes - b.mes,
    );
    for (const d of ordenados) {
      result.push({
        label: `${MESES[d.mes]} ${d.año}`,
        año: d.año,
        mes: d.mes,
        utilidadNeta: d.utilidadNeta,
        costos: d.costos,
        gastos: d.gastos,
        comision: d.comision,
        egresos: d.costos + d.gastos + d.comision,
        ventasAceptadas: d.ventasAceptadas,
      });
    }
    return result;
  }, [ventasRegistradas]);

  // Si hay 0/1 puntos, completar ventana de 6 meses para que la gráfica se vea.
  const datosTendencia = useMemo(() => {
    if (datos.length >= 2) return datos;
    const base =
      datos[0] ??
      ({
        label: "",
        año: new Date().getFullYear(),
        mes: new Date().getMonth(),
        utilidadNeta: 0,
        costos: 0,
        gastos: 0,
        comision: 0,
        egresos: 0,
        ventasAceptadas: 0,
      } as (typeof datos)[number]);
    const map = new Map<string, (typeof datos)[number]>();
    for (const d of datos) map.set(`${d.año}-${d.mes}`, d);
    const out: typeof datos = [];
    for (let i = 5; i >= 0; i--) {
      const dt = new Date(base.año, base.mes - i, 1);
      const y = dt.getFullYear();
      const m = dt.getMonth();
      const hit = map.get(`${y}-${m}`);
      out.push(
        hit ?? {
          label: `${MESES[m]} ${y}`,
          año: y,
          mes: m,
          utilidadNeta: 0,
          costos: 0,
          gastos: 0,
          comision: 0,
          egresos: 0,
          ventasAceptadas: 0,
        },
      );
    }
    return out;
  }, [datos]);

  // ── Totales para las tarjetas KPI ──────────────────────────────────
  const totales = useMemo(
    () => ({
      utilidadNeta: datos.reduce((s, d) => s + d.utilidadNeta, 0),
      costos: datos.reduce((s, d) => s + d.costos, 0),
      gastos: datos.reduce((s, d) => s + d.gastos, 0),
      comision: datos.reduce((s, d) => s + d.comision, 0),
      egresos: datos.reduce((s, d) => s + d.egresos, 0),
      ventasAceptadas: datos.reduce((s, d) => s + d.ventasAceptadas, 0),
    }),
    [datos],
  );

  const fmt = (n: number) =>
    n.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    });

  const opcionesTendencia = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index" as const, intersect: false },
      stacked: false,
      plugins: {
        legend: {
          position: "bottom" as const,
          labels: { usePointStyle: true, pointStyle: "circle" as const, padding: 18 },
        },
        tooltip: {
          callbacks: {
            label: (ctx: any) => `${ctx.dataset.label}: ${fmt(Number(ctx.parsed?.y ?? 0))}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#6b7280", font: { size: 12 } },
        },
        y: {
          type: "linear" as const,
          display: true,
          position: "left" as const,
          beginAtZero: true,
          ticks: {
            color: "#6b7280",
            callback: (value: any) => {
              const n = Number(value) || 0;
              return n.toLocaleString("es-MX", {
                style: "currency",
                currency: "MXN",
                maximumFractionDigits: 0,
              });
            },
          },
        },
        y1: {
          type: "linear" as const,
          display: true,
          position: "right" as const,
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          ticks: {
            color: "#6b7280",
            callback: (value: any) => {
              const n = Number(value) || 0;
              return n.toLocaleString("es-MX", {
                style: "currency",
                currency: "MXN",
                maximumFractionDigits: 0,
              });
            },
          },
        },
      },
    }),
    [],
  );

  const dataTendencia = useMemo(
    () => ({
      labels: datosTendencia.map((d) => d.label),
      datasets: [
        {
          label: "Utilidad neta",
          data: datosTendencia.map((d) => d.utilidadNeta),
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,0.10)",
          pointBackgroundColor: "#10b981",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.35,
          fill: true,
          borderWidth: 3,
          yAxisID: "y",
        },
        {
          label: "Egresos (costos + gastos adicionales + comisiones)",
          data: datosTendencia.map((d) => d.egresos),
          borderColor: "#ef4444",
          backgroundColor: "rgba(239,68,68,0.2)",
          pointBackgroundColor: "#ef4444",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderDash: [5, 4],
          tension: 0.35,
          fill: false,
          borderWidth: 3,
          yAxisID: "y1",
        },
      ],
    }),
    [datosTendencia],
  );
  const opcionesPie = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom" as const,
          labels: { usePointStyle: true, pointStyle: "circle" as const, padding: 14 },
        },
        tooltip: {
          callbacks: {
            label: (ctx: any) =>
              `${ctx.label}: ${fmt(Number(ctx.parsed ?? 0))}`,
          },
        },
      },
    }),
    [],
  );

  const dataPie = useMemo(
    () => ({
      labels: ["Utilidad neta", "Costos de la venta", "Gastos adicionales", "Comisiones"],
      datasets: [
        {
          data: [
            totales.utilidadNeta,
            totales.costos,
            totales.gastos,
            totales.comision,
          ],
          backgroundColor: [
            "rgba(16,185,129,0.28)",
            "rgba(245,158,11,0.28)",
            "rgba(239,68,68,0.28)",
            "rgba(99,102,241,0.28)",
          ],
          borderColor: [
            "rgba(16,185,129,1)",
            "rgba(245,158,11,1)",
            "rgba(239,68,68,1)",
            "rgba(99,102,241,1)",
          ],
          borderWidth: 1,
        },
      ],
    }),
    [totales],
  );

  const opcionesBarrasHoriz = useMemo(
    () => ({
      indexAxis: "y" as const,
      elements: { bar: { borderWidth: 2 } },
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "right" as const },
        title: {
          display: true,
          text: "Utilidad neta vs gastos adicionales",
        },
        tooltip: {
          callbacks: {
            label: (ctx: any) =>
              `${ctx.dataset.label}: ${fmt(Number(ctx.parsed?.x ?? 0))}`,
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            callback: (value: any) =>
              Number(value || 0).toLocaleString("es-MX", {
                style: "currency",
                currency: "MXN",
                maximumFractionDigits: 0,
              }),
          },
        },
      },
    }),
    [],
  );

  const dataBarrasHoriz = useMemo(
    () => ({
      labels: datos.map((d) => d.label),
      datasets: [
        {
          label: "Utilidad neta",
          data: datos.map((d) => d.utilidadNeta),
          borderColor: "rgb(16, 185, 129)",
          backgroundColor: "rgba(16, 185, 129, 0.45)",
        },
        {
          label: "Gastos adicionales",
          data: datos.map((d) => d.gastos),
          borderColor: "rgb(239, 68, 68)",
          backgroundColor: "rgba(239, 68, 68, 0.45)",
        },
      ],
    }),
    [datos],
  );

  return (
    <div className="ventas-graficas">
      {/* ── KPI Cards ── */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-ingreso">
          <span className="kpi-icon">💰</span>
          <div>
            <p className="kpi-label">Utilidad neta</p>
            <p className="kpi-valor">{fmt(totales.utilidadNeta)}</p>
            <p className="kpi-hint">Suma de utilidad neta en ventas aceptadas.</p>
          </div>
        </div>
        <div className="kpi-card kpi-costos">
          <span className="kpi-icon">🧾</span>
          <div>
            <p className="kpi-label">Costos de la venta</p>
            <p className="kpi-valor">{fmt(totales.costos)}</p>
            <p className="kpi-hint">Costo de la venta registrado por operación.</p>
          </div>
        </div>
        <div className="kpi-card kpi-costos">
          <span className="kpi-icon">💸</span>
          <div>
            <p className="kpi-label">Gastos adicionales</p>
            <p className="kpi-valor">{fmt(totales.gastos)}</p>
            <p className="kpi-hint">Gastos adicionales registrados en ventas aceptadas.</p>
          </div>
        </div>
        <div className="kpi-card kpi-comision">
          <span className="kpi-icon">🤝</span>
          <div>
            <p className="kpi-label">Comisiones</p>
            <p className="kpi-valor">{fmt(totales.comision)}</p>
            <p className="kpi-hint">
              Suma de comisiones registradas en cada venta aceptada.
            </p>
          </div>
        </div>
      </div>

      {/* ── Fila superior: pie a la izquierda + barras horizontales ── */}
      <div style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
        <div className="grafica-card" style={{ flex: 1 }}>
          <div className="grafica-linea-wrap" style={{ height: 240 }}>
            <Pie options={opcionesPie} data={dataPie} />
          </div>
        </div>
        <div className="grafica-card" style={{ flex: 1 }}>
          <div className="grafica-linea-wrap" style={{ height: 240 }}>
            <Bar options={opcionesBarrasHoriz} data={dataBarrasHoriz} />
          </div>
        </div>
      </div>

      {/* ── Gráfica de línea: tendencia (Chart.js multi-axis) ── */}
      <div className="grafica-card grafica-card-tendencia">
        <h4>📉 Tendencia — Utilidad neta vs egresos (multi-eje)</h4>
        <div className="grafica-linea-wrap grafica-linea-chartjs" style={{ height: 260 }}>
          <Line options={opcionesTendencia} data={dataTendencia} />
        </div>
      </div>
    </div>
  );
};
