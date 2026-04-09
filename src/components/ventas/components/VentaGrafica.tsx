import React, { useEffect, useMemo, useState } from "react";
import { Colaborador, RegistroVenta } from "../../../types";
import { backendApi } from "../../../lib/backendApi";
import { registroSolapaMesCalendario } from "../../../utils/ordenUtils";
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
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import { GraficasEmptyMes } from "../../common/GraficasEmptyMes";
import "../RegistroVentasNuevo.css";

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
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

/** `filtroMes`: 1–12 o 0 (todos); `filtroAnio`: año o 0; `d.mes` en filas: 0–11. */
function mesFilaCoincideFiltro(
  d: { año: number; mes: number },
  filtroMes: number,
  filtroAnio: number,
): boolean {
  if (filtroMes === 0 && filtroAnio === 0) return true;
  if (filtroMes > 0 && filtroAnio > 0) {
    return d.año === filtroAnio && d.mes === filtroMes - 1;
  }
  if (filtroMes > 0 && filtroAnio === 0) {
    return d.mes === filtroMes - 1;
  }
  if (filtroMes === 0 && filtroAnio > 0) {
    return d.año === filtroAnio;
  }
  return true;
}

export const VentasGraficas: React.FC<Props> = ({
  ventasRegistradas,
  colaboradores,
}) => {
  const [filtroMes, setFiltroMes] = useState<number>(0);
  const [filtroAnio, setFiltroAnio] = useState<number>(0);
  const [gastosAdministrativosRows, setGastosAdministrativosRows] = useState<
    Array<{ mes: number; anio: number; importe: number }>
  >([]);

  useEffect(() => {
    let cancelado = false;
    void (async () => {
      try {
        const data = await backendApi.get("/api/costos-administrativos");
        const rows = (Array.isArray(data) ? data : []).map((r: any) => ({
          mes: Number(r?.mes ?? 0) || 0,
          anio: Number(r?.anio ?? 0) || 0,
          importe: Number(r?.importe ?? 0) || 0,
        }));
        if (!cancelado) setGastosAdministrativosRows(rows);
      } catch {
        if (!cancelado) setGastosAdministrativosRows([]);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, []);

  const esAceptada = (v: RegistroVenta) =>
    String(v.estadoVenta ?? "").toLowerCase() === "aceptado";

  const gastoAdicionalVenta = (v: RegistroVenta) =>
    Number(v.gastosAdicionales ?? 0) || 0;

  const comisionVenta = (v: RegistroVenta) => Number(v.comision ?? 0) || 0;
  const utilidadBaseVenta = (v: RegistroVenta) =>
    utilidadNetaContratoParaKpi(v, colaboradores);

  const mapaGastosAdmin = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of gastosAdministrativosRows) {
      const key = `${r.anio}-${String(r.mes).padStart(2, "0")}`;
      m.set(key, (m.get(key) ?? 0) + (Number(r.importe) || 0));
    }
    return m;
  }, [gastosAdministrativosRows]);

  /** Ventas aceptadas cuyo contrato **solapa** el mes/año elegido (no solo fecha de inicio). */
  const datosFiltrados = useMemo(() => {
    return ventasRegistradas.filter((v) => {
      if (!esAceptada(v)) return false;
      const fi = new Date(v.fechaInicio as Date | string);
      const ff = new Date(v.fechaFin as Date | string);
      if (Number.isNaN(fi.getTime()) || Number.isNaN(ff.getTime())) return false;

      if (filtroMes === 0 && filtroAnio === 0) return true;

      if (filtroMes > 0 && filtroAnio > 0) {
        return registroSolapaMesCalendario(fi, ff, filtroMes - 1, filtroAnio);
      }
      if (filtroMes > 0 && filtroAnio === 0) {
        const yMin = Math.min(fi.getFullYear(), ff.getFullYear());
        const yMax = Math.max(fi.getFullYear(), ff.getFullYear());
        for (let y = yMin; y <= yMax; y++) {
          if (registroSolapaMesCalendario(fi, ff, filtroMes - 1, y)) return true;
        }
        return false;
      }
      if (filtroMes === 0 && filtroAnio > 0) {
        for (let m = 0; m < 12; m++) {
          if (registroSolapaMesCalendario(fi, ff, m, filtroAnio)) return true;
        }
        return false;
      }
      return true;
    });
  }, [ventasRegistradas, filtroMes, filtroAnio]);

  // ── Por mes natural del contrato (prorrateo) ──────────────────────────
  const datosMes = useMemo(() => {
    const result: Array<{
      label: string;
      año: number;
      mes: number;
      utilidadNeta: number;
      costos: number;
      gastosVenta: number;
      comision: number;
      precioVentaTotal: number;
      ventasAceptadas: number;
    }> = [];
    const buckets = new Map<string, {
      año: number;
      mes: number;
      utilidadNeta: number;
      costos: number;
      gastosVenta: number;
      comision: number;
      precioVentaTotal: number;
      ventasAceptadas: number;
    }>();

    const ensureBucket = (key: string, año: number, mes0: number) => {
      const prev = buckets.get(key);
      if (prev) return prev;
      const init = {
        año,
        mes: mes0,
        utilidadNeta: 0,
        costos: 0,
        gastosVenta: 0,
        comision: 0,
        precioVentaTotal: 0,
        ventasAceptadas: 0,
      };
      buckets.set(key, init);
      return init;
    };

    const addProrrateo = (
      v: RegistroVenta,
      monto: number,
      field: "utilidadNeta" | "costos" | "comision" | "precioVentaTotal",
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

    const addGastoVentaEnMesElegido = (v: RegistroVenta, monto: number) => {
      if (!(monto > 0)) return;
      for (const [key, val] of bucketCalendarioGastoAdicional(v, monto)) {
        const [ys, ms] = key.split("-");
        const año = Number(ys);
        const mes0 = Number(ms) - 1;
        const curr = ensureBucket(key, año, mes0);
        curr.gastosVenta += val;
      }
    };

    for (const v of datosFiltrados) {
      const utilidadNetaVenta = utilidadBaseVenta(v) - gastoAdicionalVenta(v);
      addProrrateo(v, utilidadNetaVenta, "utilidadNeta");
      addProrrateo(v, costoVentaTotalAgregados(v), "costos");
      addGastoVentaEnMesElegido(v, gastoAdicionalVenta(v));
      addProrrateo(v, comisionVenta(v), "comision");
      addProrrateo(v, precioVentaTotalContratoParaKpi(v), "precioVentaTotal");
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
        gastosVenta: d.gastosVenta,
        comision: d.comision,
        utilidadNeta: d.utilidadNeta,
        ventasAceptadas: d.ventasAceptadas,
      });
    }
    return result;
  }, [datosFiltrados, colaboradores]);

  const datosMesConAdmin = useMemo(() => {
    return datosMes.map((d) => {
      const key = `${d.año}-${String(d.mes + 1).padStart(2, "0")}`;
      return {
        ...d,
        gastosAdministrativos: Number(mapaGastosAdmin.get(key) ?? 0) || 0,
      };
    });
  }, [datosMes, mapaGastosAdmin]);

  const aniosDisponibles = useMemo(() => {
    const set = new Set<number>();
    ventasRegistradas.forEach((v) => {
      const fi = new Date(v.fechaInicio as Date | string);
      const ff = new Date(v.fechaFin as Date | string);
      if (Number.isNaN(fi.getTime()) || Number.isNaN(ff.getTime())) return;
      const y0 = Math.min(fi.getFullYear(), ff.getFullYear());
      const y1 = Math.max(fi.getFullYear(), ff.getFullYear());
      for (let y = y0; y <= y1; y++) set.add(y);
    });
    gastosAdministrativosRows.forEach((r) => {
      if (Number.isFinite(r.anio) && r.anio > 0) set.add(r.anio);
    });
    return [...set].sort((a, b) => b - a);
  }, [ventasRegistradas, gastosAdministrativosRows]);

  // ── KPI: sin filtro = totales del contrato; con filtro = suma prorrateada solo en meses que coinciden ──
  const totales = useMemo(() => {
    const aceptadas = datosFiltrados;
    const sinFiltroTiempo = filtroMes === 0 && filtroAnio === 0;

    if (sinFiltroTiempo) {
      let utilidadBase = 0;
      let costos = 0;
      let gastosVenta = 0;
      let comision = 0;
      let precioVenta = 0;
      for (const v of aceptadas) {
        utilidadBase += utilidadBaseVenta(v);
        costos += costoVentaTotalAgregados(v);
        gastosVenta += gastoAdicionalVenta(v);
        comision += comisionVenta(v);
        precioVenta += precioVentaTotalContratoParaKpi(v);
      }
      const utilidadNeta = utilidadBase - gastosVenta;
      let gastosAdministrativos = 0;
      for (const [, val] of mapaGastosAdmin) {
        gastosAdministrativos += Number(val) || 0;
      }
      return {
        utilidadNeta,
        utilidadBase,
        costos,
        gastosVenta,
        comision,
        precioVenta,
        gastosAdministrativos,
        ventasAceptadas: aceptadas.length,
      };
    }

    let precioVenta = 0;
    let utilidadNeta = 0;
    let costos = 0;
    let gastosVenta = 0;
    let comision = 0;
    let gastosAdministrativos = 0;
    for (const d of datosMesConAdmin) {
      if (!mesFilaCoincideFiltro(d, filtroMes, filtroAnio)) continue;
      precioVenta += d.precioVentaTotal;
      utilidadNeta += d.utilidadNeta;
      costos += d.costos;
      gastosVenta += d.gastosVenta;
      comision += d.comision;
      gastosAdministrativos += d.gastosAdministrativos;
    }
    return {
      utilidadNeta,
      utilidadBase: utilidadNeta + gastosVenta,
      costos,
      gastosVenta,
      comision,
      precioVenta,
      gastosAdministrativos,
      ventasAceptadas: aceptadas.length,
    };
  }, [datosFiltrados, datosMesConAdmin, colaboradores, mapaGastosAdmin, filtroMes, filtroAnio]);

  const fmt = (n: number) =>
    n.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    });

  const filtroCalendarioActivo = filtroMes > 0 || filtroAnio > 0;
  const sinVentasEnFiltro = filtroCalendarioActivo && datosFiltrados.length === 0;

  const opcionesTendencia = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top" as const },
        title: {
          display: true,
          text: "Precio de la venta vs gastos administrativos",
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxRotation: 45, minRotation: 0 },
        },
        y: {
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

  const dataTendencia = useMemo(
    () => ({
      labels: datosMesConAdmin.map((d) => d.label),
      datasets: [
        {
          label: "Precio de la venta",
          data: datosMesConAdmin.map((d) => d.precioVentaTotal),
          backgroundColor: "rgba(2, 132, 199, 0.5)",
        },
        {
          label: "Gastos administrativos",
          data: datosMesConAdmin.map((d) => d.gastosAdministrativos),
          backgroundColor: "rgba(239, 68, 68, 0.5)",
        },
      ],
    }),
    [datosMesConAdmin],
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
        "Precio de venta",
        "Utilidad neta",
        "Costos de la venta",
        "Gastos adicionales",
        "Comisiones",
      ],
      datasets: [
        {
          data: [
            totales.precioVenta,
            totales.utilidadNeta,
            totales.costos,
            totales.gastosVenta,
            totales.comision,
          ],
          backgroundColor: [
            "rgba(2,132,199,0.28)",
            "rgba(16,185,129,0.28)",
            "rgba(245,158,11,0.28)",
            "rgba(239,68,68,0.28)",
            "rgba(99,102,241,0.28)",
          ],
          borderColor: [
            "rgba(2,132,199,1)",
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
          text: "Utilidad neta vs gastos de venta",
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
      labels: datosMesConAdmin.map((d) => d.label),
      datasets: [
        {
          label: "Utilidad neta",
          data: datosMesConAdmin.map((d) => d.utilidadNeta),
          borderColor: "rgb(16, 185, 129)",
          backgroundColor: "rgba(16, 185, 129, 0.45)",
        },
        {
          label: "Gastos de venta",
          data: datosMesConAdmin.map((d) => d.gastosVenta),
          borderColor: "rgb(239, 68, 68)",
          backgroundColor: "rgba(239, 68, 68, 0.45)",
        },
      ],
    }),
    [datosMesConAdmin],
  );

  return (
    <div className="ventas-graficas">
      <div className="form-row" style={{ marginBottom: 12 }}>
        <div className="form-group">
          <label>Mes</label>
          <select value={String(filtroMes)} onChange={(e) => setFiltroMes(Number(e.target.value) || 0)}>
            <option value="0">Todos</option>
            {MESES.map((m, i) => (
              <option key={m} value={String(i + 1)}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Año</label>
          <select value={String(filtroAnio)} onChange={(e) => setFiltroAnio(Number(e.target.value) || 0)}>
            <option value="0">Todos</option>
            {aniosDisponibles.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-icon">💵</span>
          <div>
            <p className="kpi-label">Precio de venta</p>
            <p className="kpi-valor">{fmt(totales.precioVenta)}</p>
          </div>
        </div>
        <div className="kpi-card kpi-utilidad">
          <span className="kpi-icon">💰</span>
          <div>
            <p className="kpi-label">Utilidad neta</p>
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
            <p className="kpi-label">Gastos de venta</p>
            <p className="kpi-valor">{fmt(totales.gastosVenta)}</p>
          </div>
        </div>
        <div className="kpi-card kpi-comision">
          <span className="kpi-icon">🤝</span>
          <div>
            <p className="kpi-label">Comisiones</p>
            <p className="kpi-valor">{fmt(totales.comision)}</p>
          </div>
        </div>
        <div className="kpi-card kpi-gastos-admin">
          <span className="kpi-icon">🏢</span>
          <div>
            <p className="kpi-label">Gastos administrativos</p>
            <p className="kpi-valor">{fmt(totales.gastosAdministrativos)}</p>
          </div>
        </div>
      </div>

      {sinVentasEnFiltro ? (
        <GraficasEmptyMes
          titulo="No hay ventas aceptadas en este periodo"
          hint="Ningún contrato solapa el mes o año elegido. Cambia el filtro arriba o revisa fechas de inicio y fin de las ventas."
        />
      ) : (
        <>
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
          <div className="grafica-card grafica-card-tendencia grafica-card-tendencia--full">
            <h4>📉 Tendencia — Precio de la venta vs gastos administrativos</h4>
            <div className="grafica-linea-wrap grafica-linea-chartjs grafica-tendencia-barras-wrap">
              <Bar options={opcionesTendencia} data={dataTendencia} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
