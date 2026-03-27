// src/components/ventas/components/VentasGraficas.tsx
import React, { useMemo } from "react";
import { RegistroVenta } from "../../../types";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
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

  const ingresoVenta = (v: RegistroVenta) =>
    Number(v.precioTotal ?? v.importeTotal ?? 0) || 0;

  const costoAdicionalVenta = (v: RegistroVenta) =>
    Number(v.gastosAdicionales ?? 0) || 0;

  const comisionVenta = (v: RegistroVenta) => Number(v.comision ?? 0) || 0;

  // ── Agrupar por mes (últimos 6 meses) ─────────────────────────────
  const datos = useMemo(() => {
    const hoy = new Date();
    const result: Array<{
      label: string;
      ingreso: number;
      costos: number;
      comision: number;
      egresos: number;
      ventasAceptadas: number;
    }> = [];

    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const mes = fecha.getMonth();
      const año = fecha.getFullYear();

      const ventasDelMes = ventasRegistradas.filter((v) => {
        const f = new Date(v.fechaRegistro);
        return f.getMonth() === mes && f.getFullYear() === año;
      });

      const aceptadas = ventasDelMes.filter(esAceptada);
      const ingreso = aceptadas.reduce((s, v) => s + ingresoVenta(v), 0);
      const costos = aceptadas.reduce((s, v) => s + costoAdicionalVenta(v), 0);
      const comision = aceptadas.reduce((s, v) => s + comisionVenta(v), 0);
      const egresos = costos + comision;

      result.push({
        label: MESES[mes],
        ingreso,
        costos,
        comision,
        egresos,
        ventasAceptadas: aceptadas.length,
      });
    }

    return result;
  }, [ventasRegistradas]);

  // ── Totales para las tarjetas KPI ──────────────────────────────────
  const totales = useMemo(
    () => ({
      ingreso: datos.reduce((s, d) => s + d.ingreso, 0),
      costos: datos.reduce((s, d) => s + d.costos, 0),
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
      },
    }),
    [],
  );

  const dataTendencia = useMemo(
    () => ({
      labels: datos.map((d) => d.label),
      datasets: [
        {
          label: "Ingreso total",
          data: datos.map((d) => d.ingreso),
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
        },
        {
          label: "Egresos (gastos adicionales + comisiones)",
          data: datos.map((d) => d.egresos),
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
        },
      ],
    }),
    [datos],
  );

  const opcionesBarras = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top" as const,
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
          ticks: { color: "#6b7280" },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "#6b7280",
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

  const dataBarras = useMemo(
    () => ({
      labels: datos.map((d) => d.label),
      datasets: [
        {
          label: "Ingreso",
          data: datos.map((d) => d.ingreso),
          backgroundColor: "rgba(16, 185, 129, 0.72)",
          borderRadius: 8,
          maxBarThickness: 38,
        },
        {
          label: "Egresos (gastos adicionales + comisiones)",
          data: datos.map((d) => d.egresos),
          backgroundColor: "rgba(239, 68, 68, 0.72)",
          borderRadius: 8,
          maxBarThickness: 38,
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
            <p className="kpi-label">
              Ingreso total <span className="kpi-label-muted">· utilidad neta</span>
            </p>
            <p className="kpi-valor">{fmt(totales.ingreso)}</p>
            <p className="kpi-hint">
              Mismo monto en ambos conceptos en este resumen.
            </p>
          </div>
        </div>
        <div className="kpi-card kpi-costos">
          <span className="kpi-icon">🧾</span>
          <div>
            <p className="kpi-label">Costos</p>
            <p className="kpi-valor">{fmt(totales.costos)}</p>
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
      <p className="grafica-nota">
        Los totales consideran solo ventas con estado <strong>Aceptado</strong>.
        Costos = <strong>Gastos adicionales</strong>.
      </p>
      <p className="grafica-nota grafica-nota-chico">
        Comisiones (detalle): <strong>{fmt(totales.comision)}</strong>
      </p>

      {/* ── Gráfica mensual comparativa ── */}
      <div className="grafica-card">
        <h4>📊 Desglose mensual (aceptadas)</h4>
        <div className="grafica-linea-wrap grafica-bar-chartjs">
          <Bar options={opcionesBarras} data={dataBarras} />
        </div>
      </div>

      {/* ── Gráfica de línea: tendencia (Chart.js multi-axis) ── */}
      <div className="grafica-card grafica-card-tendencia">
        <h4>📉 Tendencia — Ingreso vs Egresos</h4>
        <div className="grafica-linea-wrap grafica-linea-chartjs">
          <Line options={opcionesTendencia} data={dataTendencia} />
        </div>
      </div>
    </div>
  );
};
