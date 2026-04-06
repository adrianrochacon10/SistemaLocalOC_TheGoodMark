import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { Line, Pie } from "react-chartjs-2";
import { backendApi } from "../../lib/backendApi";
import "../ventas/RegistroVentasNuevo.css";
import "./CostosAdministrativos.css";

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
);

export interface CostoAdministrativoRow {
  id: string;
  fecha: string;
  mes: number;
  anio: number;
  importe: number;
  categoria: string;
  nota?: string | null;
  created_at?: string;
  updated_at?: string;
}

const MESES_CORTOS = [
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

const PIE_BG = [
  "rgba(255, 99, 132, 0.35)",
  "rgba(54, 162, 235, 0.35)",
  "rgba(255, 206, 86, 0.35)",
  "rgba(75, 192, 192, 0.35)",
  "rgba(153, 102, 255, 0.35)",
  "rgba(255, 159, 64, 0.35)",
  "rgba(199, 199, 199, 0.35)",
  "rgba(83, 102, 255, 0.35)",
];

const PIE_BORDER = [
  "rgba(255, 99, 132, 1)",
  "rgba(54, 162, 235, 1)",
  "rgba(255, 206, 86, 1)",
  "rgba(75, 192, 192, 1)",
  "rgba(153, 102, 255, 1)",
  "rgba(255, 159, 64, 1)",
  "rgba(120, 120, 120, 1)",
  "rgba(83, 102, 255, 1)",
];

function mesAnioDesdeFechaISO(fecha: string): { mes: number; anio: number } | null {
  const d = new Date(`${fecha}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return { mes: d.getMonth() + 1, anio: d.getFullYear() };
}

function normalizarListaCostos(raw: unknown): CostoAdministrativoRow[] {
  if (Array.isArray(raw)) return raw as CostoAdministrativoRow[];
  if (raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown }).data)) {
    return (raw as { data: CostoAdministrativoRow[] }).data;
  }
  return [];
}

function datosPiePorCategoria(filas: CostoAdministrativoRow[]) {
  const porCat = new Map<string, number>();
  for (const r of filas) {
    const c = String(r.categoria ?? "").trim() || "Sin categoría";
    const imp = Number(r.importe) || 0;
    porCat.set(c, (porCat.get(c) ?? 0) + imp);
  }
  const labels = [...porCat.keys()];
  const data = labels.map((k) => porCat.get(k) ?? 0);
  return {
    labels,
    datasets: [
      {
        label: "Importe",
        data,
        backgroundColor: labels.map((_, i) => PIE_BG[i % PIE_BG.length]),
        borderColor: labels.map((_, i) => PIE_BORDER[i % PIE_BORDER.length]),
        borderWidth: 1,
      },
    ],
  };
}

function datosLineaPorMes(filas: CostoAdministrativoRow[]) {
  const porMes = new Array(12).fill(0) as number[];
  for (const r of filas) {
    const m = Math.trunc(Number(r.mes));
    if (m >= 1 && m <= 12) {
      porMes[m - 1] += Number(r.importe) || 0;
    }
  }
  return {
    labels: MESES_CORTOS,
    datasets: [
      {
        fill: true,
        label: "Importe (mes)",
        data: porMes,
        borderColor: "rgb(53, 162, 235)",
        backgroundColor: "rgba(53, 162, 235, 0.35)",
        tension: 0.25,
      },
    ],
  };
}

const opcionesLinea = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "top" as const },
    title: {
      display: true,
      text: "Total por mes (importe)",
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value: string | number) =>
          Number(value).toLocaleString("es-MX", {
            style: "currency",
            currency: "MXN",
            maximumFractionDigits: 0,
          }),
      },
    },
  },
};

const opcionesPie = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "right" as const },
    title: {
      display: true,
      text: "Por categoría (importe)",
    },
    tooltip: {
      callbacks: {
        label: (ctx: { label?: string; parsed: number }) => {
          const v = ctx.parsed;
          return `${ctx.label ?? ""}: ${Number(v).toLocaleString("es-MX", {
            style: "currency",
            currency: "MXN",
          })}`;
        },
      },
    },
  },
};

export const CostosAdministrativos: React.FC = () => {
  const [filas, setFilas] = useState<CostoAdministrativoRow[]>([]);
  const [cargando, setCargando] = useState(false);
  const [filtroMes, setFiltroMes] = useState<string>("");
  const [filtroAnio, setFiltroAnio] = useState<string>(String(new Date().getFullYear()));
  const [filtroCategoria, setFiltroCategoria] = useState<string>("");

  const [fecha, setFecha] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
  const [categoria, setCategoria] = useState("");
  const [importe, setImporte] = useState<number>(0);
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);

  type FiltrosCarga = { mes: string; anio: string; categoria: string };

  const cargar = useCallback(
    async (overrides?: Partial<FiltrosCarga>) => {
      const mesVal = overrides?.mes !== undefined ? overrides.mes : filtroMes;
      const anioVal = overrides?.anio !== undefined ? overrides.anio : filtroAnio;
      const catVal = overrides?.categoria !== undefined ? overrides.categoria : filtroCategoria;

      setCargando(true);
      try {
        const params = new URLSearchParams();
        const m = Number(mesVal);
        const y = Number(anioVal);
        if (Number.isFinite(m) && m >= 1 && m <= 12) params.set("mes", String(m));
        if (Number.isFinite(y) && y >= 2000 && y <= 3000) params.set("anio", String(y));
        const cat = catVal.trim();
        if (cat) params.set("categoria", cat);
        const qs = params.toString();
        const raw = await backendApi.get(`/api/costos-administrativos${qs ? `?${qs}` : ""}`);
        setFilas(normalizarListaCostos(raw));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Error al cargar costos";
        toast.error(msg);
        setFilas([]);
      } finally {
        setCargando(false);
      }
    },
    [filtroMes, filtroAnio, filtroCategoria],
  );

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const dataPie = useMemo(() => datosPiePorCategoria(filas), [filas]);
  const dataLinea = useMemo(() => datosLineaPorMes(filas), [filas]);
  const hayDatosGraficas = filas.length > 0;

  const handleCrear = async () => {
    const ma = mesAnioDesdeFechaISO(fecha);
    if (!ma) {
      toast.warning("Fecha no válida.");
      return;
    }
    if (!categoria.trim()) {
      toast.warning("La categoría es obligatoria.");
      return;
    }
    if (!Number.isFinite(importe) || importe < 0) {
      toast.warning("El importe debe ser un número ≥ 0.");
      return;
    }
    setGuardando(true);
    try {
      await backendApi.post("/api/costos-administrativos", {
        fecha,
        mes: ma.mes,
        anio: ma.anio,
        importe,
        categoria: categoria.trim(),
        nota: nota.trim() || null,
      });
      toast.success("Costo registrado.");
      setCategoria("");
      setImporte(0);
      setNota("");
      const anioStr = String(ma.anio);
      setFiltroCategoria("");
      setFiltroMes("");
      setFiltroAnio(anioStr);
      await cargar({ mes: "", categoria: "", anio: anioStr });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id: string) => {
    if (!window.confirm("¿Eliminar este registro?")) return;
    try {
      await backendApi.del(`/api/costos-administrativos/${encodeURIComponent(id)}`);
      toast.success("Eliminado.");
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  };

  const fmtMoney = (n: number) =>
    Number(n).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

  return (
    <div className="registro-ventas-nuevo costos-administrativos">
      <div className="formulario-section">
        <h3>Costos administrativos</h3>
        <h4>Nuevo costo</h4>
        <div className="form-row">
          <div className="form-group">
            <label>Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Categoría</label>
            <input
              type="text"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="Ej. Nómina, Servicios, etc."
            />
          </div>
          <div className="form-group">
            <label>Importe</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={importe}
              onChange={(e) => setImporte(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
        </div>
        <div className="form-group">
          <label>Nota (opcional)</label>
          <input
            type="text"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Detalle breve"
          />
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={guardando}
          onClick={() => void handleCrear()}
        >
          {guardando ? "Guardando…" : "Registrar costo"}
        </button>
      </div>

      <div className="formulario-section costos-administrativos__graficas">
        <h4>Resumen</h4>
        {!hayDatosGraficas && !cargando ? (
          <p className="costos-administrativos__vacio">
            Sin datos para graficar con el filtro actual. Registra un costo o ajusta los filtros del listado.
          </p>
        ) : (
          <div className="costos-administrativos__charts-grid">
            <div className="costos-administrativos__chart-box">
              {hayDatosGraficas && dataPie.labels.length > 0 ? (
                <Pie data={dataPie} options={opcionesPie} />
              ) : (
                <p className="costos-administrativos__vacio">—</p>
              )}
            </div>
            <div className="costos-administrativos__chart-box costos-administrativos__chart-box--wide">
              {hayDatosGraficas ? (
                <Line data={dataLinea} options={opcionesLinea} />
              ) : (
                <p className="costos-administrativos__vacio">—</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="formulario-section costos-administrativos__filtros-listado">
        <h4>Filtrar listado</h4>
        <div className="form-row costos-administrativos__filtros-row">
          <div className="form-group">
            <label>Mes</label>
            <select
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              aria-label="Filtrar por mes"
            >
              <option value="">Todos</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>
                  {MESES_CORTOS[i]} ({i + 1})
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Año</label>
            <input
              type="number"
              min={2000}
              max={3000}
              value={filtroAnio}
              onChange={(e) => setFiltroAnio(e.target.value)}
            />
          </div>
          <div className="form-group costos-administrativos__filtro-categoria">
            <label>Categoría</label>
            <input
              type="text"
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              placeholder="Contiene… (ej. Nómina)"
              aria-label="Filtrar por categoría"
            />
          </div>
        </div>
        <p className="costos-administrativos__hint-filtro">
          Gráficos y tabla usan estos filtros (mes opcional, año y texto de categoría opcional). Al
          registrar un costo se ajusta el año al del gasto y se quitan mes y categoría del filtro
          para que el nuevo registro aparezca en el listado.
        </p>
      </div>

      <div className="registro-section">
        <h4>Listado</h4>
        {cargando ? (
          <p>Cargando…</p>
        ) : filas.length === 0 ? (
          <p className="costos-administrativos__vacio">No hay registros para este filtro.</p>
        ) : (
          <div className="costos-administrativos__tabla-wrap">
            <table className="costos-administrativos__tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Mes / Año</th>
                  <th>Categoría</th>
                  <th>Importe</th>
                  <th>Nota</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {filas.map((r) => (
                  <tr key={r.id}>
                    <td>{r.fecha}</td>
                    <td>
                      {r.mes} / {r.anio}
                    </td>
                    <td>{r.categoria}</td>
                    <td>{fmtMoney(Number(r.importe) || 0)}</td>
                    <td className="costos-administrativos__nota">{r.nota ?? "—"}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => void handleEliminar(r.id)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
