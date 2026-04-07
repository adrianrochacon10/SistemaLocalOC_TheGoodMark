// src/components/ventas/components/VentasGraficas.tsx
import React, { useMemo } from "react";
import { Colaborador, RegistroVenta } from "../../../types";
import {
  precioVentaTotalContratoParaKpi,
  prorratearMontoPorMesesContrato,
  bucketCalendarioGastoAdicional,
  costoVentaTotalAgregados,
  utilidadNetaContratoParaKpi,
} from "../../../utils/utilidadVenta";
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
  colaboradores: Colaborador[];
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

export const VentasGraficas: React.FC<Props> = ({
  ventasRegistradas,
  colaboradores,
}) => {
  const esVentaPorDias = (v: RegistroVenta): boolean => {
    const unidad = String((v as { duracionUnidad?: string }).duracionUnidad ?? "")
      .toLowerCase()
      .trim();
    if (["dias", "días", "dia", "día"].includes(unidad)) return true;
    if ((v as { gastoAdicionalEnDias?: boolean }).gastoAdicionalEnDias === true) return true;
    const mr = Math.max(1, Number(v.mesesRenta ?? 1) || 1);
    const fi = new Date(v.fechaInicio as Date | string);
    const ff = new Date(v.fechaFin as Date | string);
    if (Number.isNaN(fi.getTime()) || Number.isNaN(ff.getTime())) return false;
    const dias = Math.max(1, Math.round((ff.getTime() - fi.getTime()) / 86400000) + 1);
    if ([1, 3, 7, 15].includes(mr) && dias <= 31) return true;
    if (mr === dias || Math.abs(dias - mr) <= 1) return true;
    return false;
  };

  const esAceptada = (v: RegistroVenta) =>
    String(v.estadoVenta ?? "").toLowerCase() === "aceptado";

  const gastoAdicionalVenta = (v: RegistroVenta) =>
    Number(v.gastosAdicionales ?? 0) || 0;

  const comisionVenta = (v: RegistroVenta) => Number(v.comision ?? 0) || 0;
  const utilidadBaseVenta = (v: RegistroVenta) =>
    esVentaPorDias(v)
      ? Math.max(0, Number(v.costoVenta ?? v.costos ?? 0) || 0)
      : utilidadNetaContratoParaKpi(v, colaboradores);

  // ── Por mes natural del contrato (prorrateo por días): precio de venta, costos, gastos y comisión por mes que cubre cada venta aceptada ──
  const datos = useMemo(() => {
    const result: Array<{
      label: string;
      año: number;
      mes: number;
      precioVentaTotal: number;
      costos: number;
      gastos: number;
      comision: number;
      ventasAceptadas: number;
    }> = [];
    const buckets = new Map<string, {
      año: number;
      mes: number;
      precioVentaTotal: number;
      costos: number;
      gastos: number;
      comision: number;
      ventasAceptadas: number;
    }>();

    const ensureBucket = (key: string, año: number, mes0: number) => {
      const prev = buckets.get(key);
      if (prev) return prev;
      const init = {
        año,
        mes: mes0,
        precioVentaTotal: 0,
        costos: 0,
        gastos: 0,
        comision: 0,
        ventasAceptadas: 0,
      };
      buckets.set(key, init);
      return init;
    };

    const addProrrateo = (
      v: RegistroVenta,
      monto: number,
      field: "precioVentaTotal" | "costos" | "gastos" | "comision",
    ) => {
      if (!(monto > 0)) return;
      for (const [key, val] of prorratearMontoPorMesesContrato(v, monto)) {
        const [ys, ms] = key.split("-");
        const año = Number(ys);
        const mes0 = Number(ms) - 1;
        const curr = ensureBucket(key, año, mes0);
        curr[field] += val;
      }
    };

    const addGastoEnMesElegido = (v: RegistroVenta, monto: number) => {
      if (!(monto > 0)) return;
      for (const [key, val] of bucketCalendarioGastoAdicional(v, monto)) {
        const [ys, ms] = key.split("-");
        const año = Number(ys);
        const mes0 = Number(ms) - 1;
        const curr = ensureBucket(key, año, mes0);
        curr.gastos += val;
      }
    };

    for (const v of ventasRegistradas) {
      if (!esAceptada(v)) continue;
      const utilidadNetaVenta = utilidadBaseVenta(v) - gastoAdicionalVenta(v);
      addProrrateo(v, utilidadNetaVenta, "precioVentaTotal");
      addProrrateo(v, costoVentaTotalAgregados(v), "costos");
      addGastoEnMesElegido(v, gastoAdicionalVenta(v));
      addProrrateo(v, comisionVenta(v), "comision");
      for (const [key, frac] of prorratearMontoPorMesesContrato(v, 1)) {
        if (!(frac > 0)) continue;
        const [ys, ms] = key.split("-");
        ensureBucket(key, Number(ys), Number(ms) - 1).ventasAceptadas += 1;
      }
    }

    const ordenados = Array.from(buckets.values()).sort(
      (a, b) => a.año - b.año || a.mes - b.mes,
    );
    for (const d of ordenados) {
      result.push({
        label: `${MESES[d.mes]} ${d.año}`,
        año: d.año,
        mes: d.mes,
        precioVentaTotal: d.precioVentaTotal,
        costos: d.costos,
        gastos: d.gastos,
        comision: d.comision,
        ventasAceptadas: d.ventasAceptadas,
      });
    }
    return result;
  }, [ventasRegistradas]);

  // Solo meses con datos reales (sin rellenar meses vacíos: evita que una venta de un mes parezca “todo el año”).
  const datosTendencia = datos;

  // ── KPI: utilidad neta (aceptadas) = utilidad base − gastos adicionales ──
  const totales = useMemo(() => {
    const aceptadas = ventasRegistradas.filter(esAceptada);
    let utilidadBase = 0;
    let costos = 0;
    let gastos = 0;
    let comision = 0;
    for (const v of aceptadas) {
      utilidadBase += utilidadBaseVenta(v);
      costos += costoVentaTotalAgregados(v);
      gastos += gastoAdicionalVenta(v);
      comision += comisionVenta(v);
    }
    const utilidadNeta = utilidadBase - gastos;
    return {
      utilidadNeta,
      utilidadBase,
      costos,
      gastos,
      comision,
      ventasAceptadas: aceptadas.length,
    };
  }, [ventasRegistradas, colaboradores]);

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
          data: datosTendencia.map((d) => d.precioVentaTotal),
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,0.10)",
          pointBackgroundColor: "#10b981",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.2,
          fill: false,
          borderWidth: 3,
          yAxisID: "y",
        },
        {
          label: "Gastos adicionales",
          data: datosTendencia.map((d) => d.gastos),
          borderColor: "#ef4444",
          backgroundColor: "rgba(239,68,68,0.2)",
          pointBackgroundColor: "#ef4444",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderDash: [5, 4],
          tension: 0.2,
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
      labels: [
        "Utilidad neta",
        "Costos de la venta",
        "Gastos adicionales",
        "Comisiones",
      ],
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
          data: datos.map((d) => d.precioVentaTotal),
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
        <div className="kpi-card kpi-utilidad">
          <span className="kpi-icon">💰</span>
          <div>
            <p className="kpi-label">Utilidad neta (aceptadas)</p>
            <p className="kpi-valor">{fmt(totales.utilidadNeta)}</p>
          </div>
        </div>
        <div className="kpi-card kpi-costo-venta">
          <span className="kpi-icon">🧾</span>
          <div>
            <p className="kpi-label">Costos de la venta</p>
            <p className="kpi-valor">{fmt(totales.costos)}</p>
          </div>
        </div>
        <div className="kpi-card kpi-gastos-adicionales">
          <span className="kpi-icon">💸</span>
          <div>
            <p className="kpi-label">Gastos adicionales</p>
            <p className="kpi-valor">{fmt(totales.gastos)}</p>
          </div>
        </div>
        <div className="kpi-card kpi-comision">
          <span className="kpi-icon">🤝</span>
          <div>
            <p className="kpi-label">Comisiones</p>
            <p className="kpi-valor">{fmt(totales.comision)}</p>
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
        <h4>📉 Tendencia — Utilidad neta vs gastos adicionales (multi-eje)</h4>
        <div className="grafica-linea-wrap grafica-linea-chartjs" style={{ height: 260 }}>
          <Line options={opcionesTendencia} data={dataTendencia} />
        </div>
      </div>
    </div>
  );
};
