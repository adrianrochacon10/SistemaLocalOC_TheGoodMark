import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { CostosCategoriasPanel, type CostoCategoria } from "./CostosCategoriasPanel";
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
  categoria_id: string;
  asociado_id?: string | null;
  /** Texto combinado para listados y gráficas */
  categoria: string;
  categoria_tipo?: string;
  asociado_nombre?: string | null;
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

/** Años mostrados en el filtro (orden descendente). */
function aniosParaFiltro(): number[] {
  const now = new Date().getFullYear();
  const desde = Math.max(2000, now - 15);
  const hasta = Math.min(3000, now + 3);
  const out: number[] = [];
  for (let y = hasta; y >= desde; y -= 1) out.push(y);
  return out;
}

function SelectAnioCostos({
  id,
  value,
  onChange,
  label = "Año",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <div className="form-group costos-administrativos__select-anio">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      >
        <option value="">Todos los años</option>
        {aniosParaFiltro().map((y) => (
          <option key={y} value={String(y)}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}

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
    const c = String(r.categoria ?? r.categoria_tipo ?? "").trim() || "Sin categoría";
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

/** Sin animación al actualizar datos: evita “temblor” visual del layout. */
const opcionesLinea = {
  animation: false as const,
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
  animation: false as const,
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

function normalizarListaCategorias(raw: unknown): CostoCategoria[] {
  if (!Array.isArray(raw)) return [];
  return raw as CostoCategoria[];
}

export const CostosAdministrativos: React.FC = () => {
  const [filas, setFilas] = useState<CostoAdministrativoRow[]>([]);
  const [categorias, setCategorias] = useState<CostoCategoria[]>([]);
  const [cargandoCategorias, setCargandoCategorias] = useState(false);
  const categoriasYaSolicitadasRef = useRef(false);
  const [panelNuevoCostoAbierto, setPanelNuevoCostoAbierto] = useState(false);
  const [panelGestionCategoriasAbierto, setPanelGestionCategoriasAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [filtroMes, setFiltroMes] = useState<string>("");
  /** Vacío = todos los años (carga completa por defecto). */
  const [filtroAnio, setFiltroAnio] = useState<string>("");
  /** Filtro listado: primero categoría, luego asociado (vacío = todos en esa categoría). */
  const [filtroListadoCategoriaId, setFiltroListadoCategoriaId] = useState<string>("");
  /** "" = todos los asociados de la categoría; "__sin__" = solo filas sin asociado; uuid = ese asociado. */
  const [filtroListadoAsociado, setFiltroListadoAsociado] = useState<string>("");

  const [fecha, setFecha] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });
  const [categoriaId, setCategoriaId] = useState("");
  const [asociadoId, setAsociadoId] = useState("");
  const [importe, setImporte] = useState<number>(0);
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);

  type FiltrosCarga = {
    mes: string;
    anio: string;
    categoriaId: string;
    asociado: string;
  };

  const cargar = useCallback(
    async (overrides?: Partial<FiltrosCarga>) => {
      const mesVal = overrides?.mes !== undefined ? overrides.mes : filtroMes;
      const anioVal = overrides?.anio !== undefined ? overrides.anio : filtroAnio;
      const catIdVal =
        overrides?.categoriaId !== undefined ? overrides.categoriaId : filtroListadoCategoriaId;
      const asocVal =
        overrides?.asociado !== undefined ? overrides.asociado : filtroListadoAsociado;

      setCargando(true);
      try {
        const params = new URLSearchParams();
        const m = Number(String(mesVal ?? "").trim());
        const y = Number(String(anioVal ?? "").trim());
        if (Number.isFinite(m) && m >= 1 && m <= 12) params.set("mes", String(m));
        if (Number.isFinite(y) && y >= 2000 && y <= 3000) params.set("anio", String(y));
        const cid = String(catIdVal ?? "").trim();
        if (cid) {
          params.set("categoria_id", cid);
          const asoc = String(asocVal ?? "").trim();
          if (asoc === "__sin__") params.set("sin_asociado", "1");
          else if (asoc) params.set("asociado_id", asoc);
        }
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
    [filtroMes, filtroAnio, filtroListadoCategoriaId, filtroListadoAsociado],
  );

  const cargarCategorias = useCallback(async (forzar = false) => {
    if (!forzar && categoriasYaSolicitadasRef.current) return;
    setCargandoCategorias(true);
    try {
      const raw = await backendApi.get("/api/costos-categorias");
      setCategorias(normalizarListaCategorias(raw));
      categoriasYaSolicitadasRef.current = true;
    } catch {
      setCategorias([]);
    } finally {
      setCargandoCategorias(false);
    }
  }, []);

  const abrirRegistrarNuevoCosto = useCallback(() => {
    setPanelNuevoCostoAbierto(true);
    void cargarCategorias(false);
  }, [cargarCategorias]);

  const abrirGestionCategorias = useCallback(() => {
    setPanelGestionCategoriasAbierto(true);
    void cargarCategorias(false);
  }, [cargarCategorias]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const asociadosDeCategoria = useMemo(() => {
    const c = categorias.find((x) => x.id === categoriaId);
    return c?.asociados ?? [];
  }, [categorias, categoriaId]);

  const asociadosFiltroListado = useMemo(() => {
    const c = categorias.find((x) => x.id === filtroListadoCategoriaId);
    return c?.asociados ?? [];
  }, [categorias, filtroListadoCategoriaId]);

  const dataPie = useMemo(() => datosPiePorCategoria(filas), [filas]);
  const dataLinea = useMemo(() => datosLineaPorMes(filas), [filas]);
  const hayDatosGraficas = filas.length > 0;

  const sufijoTituloAnio = filtroAnio.trim() ? ` — ${filtroAnio}` : " — todos los años";
  const opcionesLineaDinamicas = useMemo(
    () => ({
      ...opcionesLinea,
      plugins: {
        ...opcionesLinea.plugins,
        title: {
          display: true as const,
          text: `Total por mes (importe)${sufijoTituloAnio}`,
        },
      },
    }),
    [sufijoTituloAnio],
  );
  const opcionesPieDinamicas = useMemo(
    () => ({
      ...opcionesPie,
      plugins: {
        ...opcionesPie.plugins,
        title: {
          display: true as const,
          text: `Por categoría (importe)${sufijoTituloAnio}`,
        },
      },
    }),
    [sufijoTituloAnio],
  );

  const handleCrear = async () => {
    const ma = mesAnioDesdeFechaISO(fecha);
    if (!ma) {
      toast.warning("Fecha no válida.");
      return;
    }
    if (!categoriaId.trim()) {
      toast.warning("Elige una categoría.");
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
        categoria_id: categoriaId.trim(),
        asociado_id: asociadoId.trim() || null,
        nota: nota.trim() || null,
      });
      toast.success("Costo registrado.");
      setCategoriaId("");
      setAsociadoId("");
      setImporte(0);
      setNota("");
      const anioStr = String(ma.anio);
      setFiltroListadoCategoriaId("");
      setFiltroListadoAsociado("");
      setFiltroMes("");
      setFiltroAnio(anioStr);
      await cargar({ mes: "", categoriaId: "", asociado: "", anio: anioStr });
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

        <div className="costos-administrativos__bloque-colapsable">
          <button
            type="button"
            className="costos-administrativos__toggle-seccion"
            aria-expanded={panelGestionCategoriasAbierto}
            onClick={() =>
              panelGestionCategoriasAbierto
                ? setPanelGestionCategoriasAbierto(false)
                : abrirGestionCategorias()
            }
          >
            {panelGestionCategoriasAbierto ? "▼" : "▸"} Gestionar categorías y asociados
          </button>
          {panelGestionCategoriasAbierto ? (
            <>
              {cargandoCategorias && categorias.length === 0 ? (
                <p className="costos-administrativos__cargando-cats">Cargando categorías y asociados…</p>
              ) : null}
              <CostosCategoriasPanel
                categorias={categorias}
                onRecargar={() => void cargarCategorias(true)}
              />
            </>
          ) : null}
        </div>

        <div className="costos-administrativos__bloque-colapsable">
          <button
            type="button"
            className="costos-administrativos__toggle-seccion"
            aria-expanded={panelNuevoCostoAbierto}
            onClick={() =>
              panelNuevoCostoAbierto ? setPanelNuevoCostoAbierto(false) : abrirRegistrarNuevoCosto()
            }
          >
            {panelNuevoCostoAbierto ? "▼" : "▸"} Registrar nuevo costo
          </button>
          {panelNuevoCostoAbierto ? (
            <>
              {cargandoCategorias && categorias.length === 0 ? (
                <p className="costos-administrativos__cargando-cats">Cargando categorías y asociados…</p>
              ) : null}
              <h4 className="costos-administrativos__subtitulo-form">Nuevo costo</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Fecha</label>
                  <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Categoría (tipo)</label>
                  <select
                    value={categoriaId}
                    onChange={(e) => {
                      setCategoriaId(e.target.value);
                      setAsociadoId("");
                    }}
                    aria-label="Categoría"
                    disabled={cargandoCategorias && categorias.length === 0}
                  >
                    <option value="">Elige…</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.tipo}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Asociado (opcional)</label>
                  <select
                    value={asociadoId}
                    onChange={(e) => setAsociadoId(e.target.value)}
                    aria-label="Asociado a la categoría"
                    disabled={!categoriaId}
                  >
                    <option value="">Ninguno</option>
                    {asociadosDeCategoria.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                      </option>
                    ))}
                  </select>
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
                disabled={guardando || (cargandoCategorias && categorias.length === 0)}
                onClick={() => void handleCrear()}
              >
                {guardando ? "Guardando…" : "Registrar costo"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="formulario-section costos-administrativos__graficas">
        <div className="costos-administrativos__resumen-header">
          <h4>Resumen</h4>
          <SelectAnioCostos
            id="costos-resumen-anio"
            value={filtroAnio}
            onChange={setFiltroAnio}
            label="Año"
          />
        </div>
        {!hayDatosGraficas && !cargando ? (
          <p className="costos-administrativos__vacio">
            Sin datos para graficar con el año (y demás filtros) elegidos. Prueba otro año arriba,
            registra un costo o ajusta mes / categoría / asociado en &quot;Filtrar listado&quot;.
          </p>
        ) : (
          <div className="costos-administrativos__charts-grid">
            <div className="costos-administrativos__chart-box">
              {hayDatosGraficas && dataPie.labels.length > 0 ? (
                <Pie data={dataPie} options={opcionesPieDinamicas} />
              ) : (
                <p className="costos-administrativos__vacio">—</p>
              )}
            </div>
            <div className="costos-administrativos__chart-box costos-administrativos__chart-box--wide">
              {hayDatosGraficas ? (
                <Line data={dataLinea} options={opcionesLineaDinamicas} />
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
              <option value="">Todos los meses</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>
                  {MESES_CORTOS[i]} ({i + 1})
                </option>
              ))}
            </select>
          </div>
          <SelectAnioCostos
            id="costos-listado-anio"
            value={filtroAnio}
            onChange={setFiltroAnio}
            label="Año"
          />
          <div className="form-group">
            <label>Categoría</label>
            <select
              value={filtroListadoCategoriaId}
              onFocus={() => {
                void cargarCategorias(false);
              }}
              onChange={(e) => {
                setFiltroListadoCategoriaId(e.target.value);
                setFiltroListadoAsociado("");
              }}
              aria-label="Filtrar listado por categoría"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.tipo}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Asociado</label>
            <select
              value={filtroListadoAsociado}
              onChange={(e) => setFiltroListadoAsociado(e.target.value)}
              aria-label="Filtrar listado por asociado dentro de la categoría"
              disabled={!filtroListadoCategoriaId}
            >
              <option value="">Todos (en esa categoría)</option>
              <option value="__sin__">Solo sin asociado</option>
              {asociadosFiltroListado.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="costos-administrativos__hint-filtro">
          Por defecto se cargan todos los años en el listado. Las categorías y asociados se cargan al abrir
          «Registrar nuevo costo» o «Gestionar categorías»; al enfocar el filtro de categoría también se
          cargan si aún no lo estaban. Elige categoría y luego asociado para acotar listado y gráficas.
        </p>
      </div>

      <div className="registro-section costos-administrativos__listado">
        <h4>Listado</h4>
        {cargando && filas.length === 0 ? (
          <p>Cargando…</p>
        ) : filas.length === 0 ? (
          <p className="costos-administrativos__vacio">No hay registros para este filtro.</p>
        ) : (
          <div
            className={`costos-administrativos__tabla-wrap${cargando ? " costos-administrativos__tabla-wrap--actualizando" : ""}`}
          >
            {cargando ? (
              <span className="costos-administrativos__refrescando" aria-live="polite">
                Actualizando…
              </span>
            ) : null}
            <table className="costos-administrativos__tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Mes / Año</th>
                  <th>Categoría</th>
                  <th>Asociado</th>
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
                    <td>{r.categoria_tipo ?? "—"}</td>
                    <td>{r.asociado_nombre?.trim() ? r.asociado_nombre : "—"}</td>
                    <td>{fmtMoney(Number(r.importe) || 0)}</td>
                    <td className="costos-administrativos__nota">{r.nota ?? "—"}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={cargando}
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
