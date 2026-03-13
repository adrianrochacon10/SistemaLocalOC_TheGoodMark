// src/components/ventas/components/VentasGraficas.tsx
import React, { useMemo } from "react";
import { RegistroVenta } from "../../../types";

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
  // ── Agrupar por mes (últimos 6 meses) ─────────────────────────────
  const datos = useMemo(() => {
    const hoy = new Date();
    const result = [];

    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const mes = fecha.getMonth();
      const año = fecha.getFullYear();

      const ventasDelMes = ventasRegistradas.filter((v) => {
        const f = new Date(v.fechaRegistro);
        return f.getMonth() === mes && f.getFullYear() === año;
      });

      const ingreso = ventasDelMes.reduce(
        (s, v) => s + (v.precioGeneral ?? 0),
        0,
      );
      const costos = ventasDelMes.reduce((s, v) => s + (v.costos ?? 0), 0);
      const comision = ventasDelMes.reduce((s, v) => s + (v.comision ?? 0), 0);
      const utilidad = ingreso - costos - comision;

      result.push({ label: MESES[mes], ingreso, costos, comision, utilidad });
    }

    return result;
  }, [ventasRegistradas]);

  // ── Totales para las tarjetas KPI ──────────────────────────────────
  const totales = useMemo(
    () => ({
      ingreso: datos.reduce((s, d) => s + d.ingreso, 0),
      costos: datos.reduce((s, d) => s + d.costos, 0),
      comision: datos.reduce((s, d) => s + d.comision, 0),
      utilidad: datos.reduce((s, d) => s + d.utilidad, 0),
    }),
    [datos],
  );

  const maxIngreso = Math.max(...datos.map((d) => d.ingreso), 1);

  const fmt = (n: number) =>
    n.toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      maximumFractionDigits: 0,
    });

  return (
    <div className="ventas-graficas">
      {/* ── KPI Cards ── */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-ingreso">
          <span className="kpi-icon">💰</span>
          <div>
            <p className="kpi-label">Ingreso total</p>
            <p className="kpi-valor">{fmt(totales.ingreso)}</p>
          </div>
        </div>
        <div className="kpi-card kpi-utilidad">
          <span className="kpi-icon">📈</span>
          <div>
            <p className="kpi-label">Utilidad neta</p>
            <p className="kpi-valor">{fmt(totales.utilidad)}</p>
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
          </div>
        </div>
      </div>

      {/* ── Gráfica de barras apiladas ── */}
      <div className="grafica-card">
        <h4>📊 Desglose mensual de ingresos</h4>
        <div className="grafica-barras">
          {datos.map((d) => (
            <div key={d.label} className="barra-col">
              {/* Barra apilada */}
              <div
                className="barra-stack"
                style={{ height: "160px", position: "relative" }}
              >
                {/* Utilidad */}
                <div
                  className="seg-utilidad"
                  style={{ height: `${(d.utilidad / maxIngreso) * 100}%` }}
                  title={`Utilidad: ${fmt(d.utilidad)}`}
                />
                {/* Comisión */}
                <div
                  className="seg-comision"
                  style={{ height: `${(d.comision / maxIngreso) * 100}%` }}
                  title={`Comisión: ${fmt(d.comision)}`}
                />
                {/* Costos */}
                <div
                  className="seg-costos"
                  style={{ height: `${(d.costos / maxIngreso) * 100}%` }}
                  title={`Costos: ${fmt(d.costos)}`}
                />
              </div>
              <span className="barra-label">{d.label}</span>
            </div>
          ))}
        </div>

        {/* Leyenda */}
        <div className="grafica-leyenda">
          <span className="leyenda-item">
            <span className="dot dot-utilidad" /> Utilidad
          </span>
          <span className="leyenda-item">
            <span className="dot dot-comision" /> Comisiones
          </span>
          <span className="leyenda-item">
            <span className="dot dot-costos" /> Costos
          </span>
        </div>
      </div>

      {/* ── Gráfica de línea: tendencia ── */}
      {/* ── Gráfica de línea: tendencia ── */}
      <div className="grafica-card">
        <h4>📉 Tendencia — Ingreso vs Egresos</h4>
        <div className="grafica-linea-wrap">
          <svg
            viewBox={`0 0 ${datos.length * 90 + 60} 220`}
            className="grafica-svg"
          >
            {/* ── Líneas de guía horizontales + valores eje Y ── */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const y = 20 + (1 - pct) * 150;
              const val = maxIngreso * pct;
              const label =
                val >= 1_000_000
                  ? `$${(val / 1_000_000).toFixed(1)}M`
                  : val >= 1_000
                    ? `$${(val / 1_000).toFixed(0)}k`
                    : `$${val.toFixed(0)}`;
              return (
                <g key={pct}>
                  <line
                    x1={52}
                    y1={y}
                    x2={datos.length * 90 + 55}
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                  <text
                    x={48}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="10"
                    fill="#9ca3af"
                  >
                    {label}
                  </text>
                </g>
              );
            })}

            {/* ── Línea ingresos ── */}
            <polyline
              fill="none"
              stroke="#20c997"
              strokeWidth="2.5"
              points={datos
                .map((d, i) => {
                  const x = i * 90 + 90;
                  const y = 20 + (1 - d.ingreso / maxIngreso) * 150;
                  return `${x},${y}`;
                })
                .join(" ")}
            />

            {/* ── Línea egresos ── */}
            <polyline
              fill="none"
              stroke="#e74c3c"
              strokeWidth="2.5"
              strokeDasharray="6 3"
              points={datos
                .map((d, i) => {
                  const egreso = d.costos + d.comision;
                  const x = i * 90 + 90;
                  const y = 20 + (1 - egreso / maxIngreso) * 150;
                  return `${x},${y}`;
                })
                .join(" ")}
            />

            {/* ── Puntos + etiquetas de valor + mes ── */}
            {datos.map((d, i) => {
              const egreso = d.costos + d.comision;
              const x = i * 90 + 90;
              const yI = 20 + (1 - d.ingreso / maxIngreso) * 150;
              const yE = 20 + (1 - egreso / maxIngreso) * 150;

              const fmtCorto = (n: number) =>
                n >= 1_000_000
                  ? `$${(n / 1_000_000).toFixed(1)}M`
                  : n >= 1_000
                    ? `$${(n / 1_000).toFixed(0)}k`
                    : `$${n.toFixed(0)}`;

              return (
                <g key={d.label}>
                  {/* Punto ingreso */}
                  <circle cx={x} cy={yI} r="5" fill="#20c997" />
                  {/* Valor ingreso — encima del punto */}
                  <text
                    x={x}
                    y={yI - 9}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill="#059669"
                  >
                    {fmtCorto(d.ingreso)}
                  </text>

                  {/* Punto egreso */}
                  <circle cx={x} cy={yE} r="5" fill="#e74c3c" />
                  {/* Valor egreso — debajo del punto (si no choca con ingreso) */}
                  <text
                    x={x}
                    y={yE + 18}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill="#dc2626"
                  >
                    {fmtCorto(egreso)}
                  </text>

                  {/* Etiqueta mes */}
                  <text
                    x={x}
                    y={195}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#6b7280"
                  >
                    {d.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="grafica-leyenda">
          <span className="leyenda-item">
            <span className="dot dot-utilidad" /> Ingreso total
          </span>
          <span className="leyenda-item">
            <span className="dot dot-costos" /> Costos + Comisiones
          </span>
        </div>
      </div>
    </div>
  );
};
