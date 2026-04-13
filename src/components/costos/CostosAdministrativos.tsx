import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { CostosCategoriasPanel, type CostoCategoria } from "./CostosCategoriasPanel";
import { type TooltipItem } from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";
import "../../lib/chartRegisterCostosAdmin";
import { backendApi } from "../../lib/backendApi";
import { confirmWithToast } from "../../lib/confirmWithToast";
import { GraficasEmptyMes } from "../common/GraficasEmptyMes";
import "../ventas/RegistroVentasNuevo.css";
import "./CostosAdministrativos.css";

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

function fmtImporteMx(n: number) {
  return Number(n).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
}

/** Sin animación al actualizar datos: evita “temblor” visual del layout. */
const opcionesLineaBase = {
  animation: false as const,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "top" as const },
    title: {
      display: true,
      text: "Total por mes (importe)",
    },
    tooltip: {
      callbacks: {
        title: (items: { label?: string }[]) => items[0]?.label ?? "",
        label: (ctx: TooltipItem<"line">) => {
          const v = ctx.parsed.y;
          return `Total del mes: ${fmtImporteMx(Number(v) || 0)}`;
        },
      },
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

const opcionesDoughnutBase = {
  animation: false as const,
  responsive: true,
  maintainAspectRatio: false,
  cutout: "58%",
  plugins: {
    legend: { display: false as const },
    title: {
      display: true,
      text: "Por categoría (importe)",
    },
    tooltip: {
      callbacks: {
        title: (items: { label?: string }[]) => items[0]?.label ?? "",
        label: (ctx: { parsed: number }) => {
          const v = ctx.parsed;
          return `Gasto: ${fmtImporteMx(v)}`;
        },
        afterLabel: (ctx: { parsed: number; dataset?: { data?: unknown[] } }) => {
          const values = (ctx.dataset?.data as number[] | undefined) ?? [];
          const total = values.reduce((a, x) => a + (Number(x) || 0), 0);
          if (total <= 0) return "";
          const pct = ((Number(ctx.parsed) || 0) / total) * 100;
          return `${pct.toFixed(1)}% del total`;
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

  /** Opcional; mes/año del costo se eligen aparte (obligatorios). */
  const [fecha, setFecha] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [asociadoId, setAsociadoId] = useState("");
  const [mesNuevoCosto, setMesNuevoCosto] = useState<number>(() => new Date().getMonth() + 1);
  const [anioNuevoCosto, setAnioNuevoCosto] = useState<number>(() => new Date().getFullYear());
  const [importe, setImporte] = useState<number>(0);
  const [nota, setNota] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [edFecha, setEdFecha] = useState("");
  const [edMes, setEdMes] = useState<number>(1);
  const [edAnio, setEdAnio] = useState<number>(new Date().getFullYear());
  const [edCategoriaId, setEdCategoriaId] = useState("");
  const [edAsociadoId, setEdAsociadoId] = useState("");
  const [edImporte, setEdImporte] = useState<number>(0);
  const [edNota, setEdNota] = useState("");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

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

  /** Si el usuario elige una fecha, se pueden alinear mes y año (sigue pudiendo cambiarlos a mano). */
  useEffect(() => {
    const ma = mesAnioDesdeFechaISO(fecha.trim());
    if (!ma) return;
    setMesNuevoCosto(ma.mes);
    setAnioNuevoCosto(ma.anio);
  }, [fecha]);

  const asociadosDeCategoria = useMemo(() => {
    const c = categorias.find((x) => x.id === categoriaId);
    return c?.asociados ?? [];
  }, [categorias, categoriaId]);

  const asociadosFiltroListado = useMemo(() => {
    const c = categorias.find((x) => x.id === filtroListadoCategoriaId);
    return c?.asociados ?? [];
  }, [categorias, filtroListadoCategoriaId]);
  const asociadosDeCategoriaEdicion = useMemo(() => {
    const c = categorias.find((x) => x.id === edCategoriaId);
    return c?.asociados ?? [];
  }, [categorias, edCategoriaId]);

  const dataPie = useMemo(() => datosPiePorCategoria(filas), [filas]);
  const dataLinea = useMemo(() => {
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
  }, [filas]);

  const filtroListadoActivo =
    String(filtroMes ?? "").trim() !== "" ||
    String(filtroAnio ?? "").trim() !== "" ||
    String(filtroListadoCategoriaId ?? "").trim() !== "";

  const hayDatosGraficas = filas.length > 0;

  const sufijoTituloGraficas = useMemo(() => {
    const partes: string[] = [];
    const m = String(filtroMes ?? "").trim();
    const mi = Number(m);
    if (m && Number.isFinite(mi) && mi >= 1 && mi <= 12) {
      partes.push(MESES_CORTOS[mi - 1]);
    }
    const y = String(filtroAnio ?? "").trim();
    if (y) partes.push(`año ${y}`);
    const cat = categorias.find((c) => c.id === filtroListadoCategoriaId);
    if (cat?.tipo) partes.push(String(cat.tipo));
    return partes.length ? ` — ${partes.join(" · ")}` : " — todos los periodos";
  }, [filtroMes, filtroAnio, filtroListadoCategoriaId, categorias]);

  const tituloDoughnutResumen = useMemo(
    () => `Gastos por categoría (importe)${sufijoTituloGraficas}`,
    [sufijoTituloGraficas],
  );

  const tituloLineaResumen = useMemo(
    () => `Total por mes (importe)${sufijoTituloGraficas}`,
    [sufijoTituloGraficas],
  );

  const opcionesDoughnutDinamicas = useMemo(
    () => ({
      ...opcionesDoughnutBase,
      plugins: {
        ...opcionesDoughnutBase.plugins,
        title: {
          display: true as const,
          text: tituloDoughnutResumen,
        },
      },
    }),
    [tituloDoughnutResumen],
  );

  const opcionesLineaDinamicas = useMemo(
    () => ({
      ...opcionesLineaBase,
      plugins: {
        ...opcionesLineaBase.plugins,
        title: {
          display: true as const,
          text: tituloLineaResumen,
        },
      },
    }),
    [tituloLineaResumen],
  );

  const handleCrear = async () => {
    if (!categoriaId.trim()) {
      toast.warning("Elige una categoría.");
      return;
    }
    if (!asociadoId.trim()) {
      toast.warning("La subcategoría es obligatoria.");
      return;
    }
    if (!Number.isFinite(mesNuevoCosto) || mesNuevoCosto < 1 || mesNuevoCosto > 12) {
      toast.warning("El mes es obligatorio (elige un mes entre 1 y 12).");
      return;
    }
    if (!Number.isFinite(anioNuevoCosto) || anioNuevoCosto < 2000 || anioNuevoCosto > 3000) {
      toast.warning("El año está fuera de rango.");
      return;
    }
    if (!Number.isFinite(importe) || importe < 0) {
      toast.warning("El importe debe ser un número ≥ 0.");
      return;
    }
    setGuardando(true);
    try {
      await backendApi.post("/api/costos-administrativos", {
        fecha: fecha.trim() || null,
        mes: mesNuevoCosto,
        anio: anioNuevoCosto,
        importe,
        categoria_id: categoriaId.trim(),
        asociado_id: asociadoId.trim(),
        nota: nota.trim() || null,
      });
      toast.success("Costo registrado.");
      setCategoriaId("");
      setAsociadoId("");
      setImporte(0);
      setNota("");
      const anioStr = String(anioNuevoCosto);
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
    const ok = await confirmWithToast("¿Eliminar este registro?");
    if (!ok) return;
    try {
      await backendApi.del(`/api/costos-administrativos/${encodeURIComponent(id)}`);
      toast.success("Eliminado.");
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar");
    }
  };

  const iniciarEdicion = async (r: CostoAdministrativoRow) => {
    await cargarCategorias(false);
    setEditandoId(r.id);
    setEdFecha(r.fecha ? String(r.fecha).slice(0, 10) : "");
    setEdMes(Math.trunc(Number(r.mes)) || 1);
    setEdAnio(Math.trunc(Number(r.anio)) || new Date().getFullYear());
    setEdCategoriaId(r.categoria_id ?? "");
    setEdAsociadoId(r.asociado_id ?? "");
    setEdImporte(Number(r.importe) || 0);
    setEdNota(r.nota ?? "");
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setEdAsociadoId("");
    setEdCategoriaId("");
  };

  const guardarEdicion = async () => {
    if (!editandoId) return;
    if (!edCategoriaId.trim()) return toast.warning("Elige una categoría.");
    if (!edAsociadoId.trim()) return toast.warning("Elige una subcategoría.");
    if (!Number.isFinite(edMes) || edMes < 1 || edMes > 12) {
      return toast.warning("El mes es obligatorio (elige un mes entre 1 y 12).");
    }
    if (!Number.isFinite(edAnio) || edAnio < 2000 || edAnio > 3000) return toast.warning("Año inválido.");
    if (!Number.isFinite(edImporte) || edImporte < 0) return toast.warning("Importe inválido.");

    setGuardandoEdicion(true);
    try {
      await backendApi.patch(`/api/costos-administrativos/${encodeURIComponent(editandoId)}`, {
        fecha: edFecha.trim() || null,
        mes: edMes,
        anio: edAnio,
        categoria_id: edCategoriaId,
        asociado_id: edAsociadoId,
        importe: edImporte,
        nota: edNota.trim() || null,
      });
      toast.success("Costo actualizado.");
      setEditandoId(null);
      await cargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar");
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const fmtMoney = (n: number) =>
    Number(n).toLocaleString("es-MX", { style: "currency", currency: "MXN" });

  return (
    <div className="registro-ventas-nuevo costos-administrativos">
      <div className="formulario-section">
        <h3>Gastos administrativos</h3>

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
            {panelGestionCategoriasAbierto ? "▼" : "▸"} Gestionar categorías y subcategorías
          </button>
          {panelGestionCategoriasAbierto ? (
            <>
              {cargandoCategorias && categorias.length === 0 ? (
                <p className="costos-administrativos__cargando-cats">Cargando categorías y subcategorías…</p>
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
                <p className="costos-administrativos__cargando-cats">Cargando categorías y subcategorías…</p>
              ) : null}
              <h4 className="costos-administrativos__subtitulo-form">Nuevo costo</h4>
              <div className="form-row costos-administrativos__nuevo-costo-grid">
                <div className="form-group">
                  <label>Fecha (opcional)</label>
                  <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>
                    Mes <span className="kpi-label-muted">(obligatorio)</span>
                  </label>
                  <select
                    value={String(mesNuevoCosto)}
                    onChange={(e) => setMesNuevoCosto(Number(e.target.value))}
                    aria-label="Mes del costo (obligatorio)"
                    required
                  >
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={String(i + 1)}>
                        {MESES_CORTOS[i]} ({i + 1})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Año</label>
                  <select
                    value={String(anioNuevoCosto)}
                    onChange={(e) => setAnioNuevoCosto(Number(e.target.value))}
                    aria-label="Año del costo"
                  >
                    {aniosParaFiltro().map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))}
                  </select>
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
                  <label>Subcategoría</label>
                  <select
                    value={asociadoId}
                    onChange={(e) => setAsociadoId(e.target.value)}
                    aria-label="Subcategoría de la categoría"
                    disabled={!categoriaId || asociadosDeCategoria.length === 0}
                  >
                    <option value="">Elige…</option>
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
                    value={importe === 0 ? "" : importe}
                    onChange={(e) => setImporte(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Nota</label>
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
        </div>
        {!hayDatosGraficas && !cargando ? (
          filtroListadoActivo ? (
            <GraficasEmptyMes
              titulo="No hay datos para graficar en este periodo"
              hint="No hay costos con el mes, año o categorías elegidos en «Filtrar listado». Prueba otro mes o año, amplía la categoría o registra un nuevo costo."
            />
          ) : (
            <p className="costos-administrativos__vacio">
              Sin datos para graficar. Registra un costo o usa «Filtrar listado» para acotar periodo o categoría.
            </p>
          )
        ) : (
          <div className="costos-administrativos__charts-grid">
            <div className="costos-administrativos__chart-box costos-administrativos__chart-box--doughnut">
              {hayDatosGraficas && dataPie.labels.length > 0 ? (
                <div className="costos-administrativos__doughnut-bloque">
                  <div className="costos-administrativos__doughnut-canvas">
                    <Doughnut data={dataPie} options={opcionesDoughnutDinamicas} />
                  </div>
                  <ul
                    className="costos-administrativos__gasto-cards"
                    aria-label="Desglose por tipo de gasto"
                  >
                    {dataPie.labels.map((lbl, i) => {
                      const raw = dataPie.datasets[0]?.data[i];
                      const val = typeof raw === "number" ? raw : Number(raw) || 0;
                      const border = PIE_BORDER[i % PIE_BORDER.length];
                      return (
                        <li
                          key={`${String(lbl)}-${i}`}
                          className="costos-administrativos__gasto-card"
                          style={{ borderLeftColor: border }}
                        >
                          <span className="costos-administrativos__gasto-card-tipo">Tipo de gasto</span>
                          <span className="costos-administrativos__gasto-card-nombre">{String(lbl)}</span>
                          <span className="costos-administrativos__gasto-card-importe">
                            {fmtImporteMx(val)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
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
            <label>Subcategoría</label>
            <select
              value={filtroListadoAsociado}
              onChange={(e) => setFiltroListadoAsociado(e.target.value)}
              aria-label="Filtrar listado por subcategoría dentro de la categoría"
              disabled={!filtroListadoCategoriaId}
            >
              <option value="">Todos (en esa categoría)</option>
              <option value="__sin__">Solo sin subcategoría</option>
              {asociadosFiltroListado.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
        
      </div>

      <div className="registro-section costos-administrativos__listado">
        <h4>Listado</h4>
        {cargando && filas.length === 0 ? (
          <p>Cargando…</p>
        ) : filas.length === 0 ? (
          filtroListadoActivo ? (
            <GraficasEmptyMes
              titulo="No hay registros en este periodo"
              hint="Ajusta mes, año, categoría o subcategoría en «Filtrar listado», o registra un costo para ese mes."
            />
          ) : (
            <p className="costos-administrativos__vacio">No hay registros para este filtro.</p>
          )
        ) : (
          <div className={`costos-administrativos__cards-wrap${cargando ? " costos-administrativos__tabla-wrap--actualizando" : ""}`}>
            {cargando ? (
              <span className="costos-administrativos__refrescando" aria-live="polite">
                Actualizando…
              </span>
            ) : null}
            <div className="costos-administrativos__cards-grid">
              {filas.map((r) => (
                <article key={r.id} className="costos-administrativos__card">
                  {editandoId === r.id ? (
                    <>
                      <header className="costos-administrativos__card-header">
                        <strong>Editar</strong>
                        <span>{r.id.slice(0, 8)}</span>
                      </header>
                      <div className="costos-administrativos__card-edit-grid">
                        <label>
                          Fecha (opcional)
                          <input type="date" value={edFecha} onChange={(e) => setEdFecha(e.target.value)} />
                        </label>
                        <label>
                          Mes (obligatorio)
                          <select
                            value={String(edMes)}
                            onChange={(e) => setEdMes(Number(e.target.value))}
                            aria-label="Mes del costo (obligatorio)"
                            required
                          >
                            {Array.from({ length: 12 }, (_, i) => (
                              <option key={i + 1} value={String(i + 1)}>
                                {MESES_CORTOS[i]} ({i + 1})
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Año
                          <select value={String(edAnio)} onChange={(e) => setEdAnio(Number(e.target.value))}>
                            {aniosParaFiltro().map((y) => (
                              <option key={y} value={String(y)}>
                                {y}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Categoría
                          <select
                            value={edCategoriaId}
                            onChange={(e) => {
                              setEdCategoriaId(e.target.value);
                              setEdAsociadoId("");
                            }}
                          >
                            <option value="">Elige…</option>
                            {categorias.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.tipo}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Subcategoría
                          <select
                            value={edAsociadoId}
                            onChange={(e) => setEdAsociadoId(e.target.value)}
                            disabled={!edCategoriaId || asociadosDeCategoriaEdicion.length === 0}
                          >
                            <option value="">Elige…</option>
                            {asociadosDeCategoriaEdicion.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.nombre}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Importe
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={edImporte === 0 ? "" : edImporte}
                            onChange={(e) => setEdImporte(Math.max(0, Number(e.target.value) || 0))}
                          />
                        </label>
                        <label className="costos-administrativos__card-edit-nota">
                          Nota
                          <input type="text" value={edNota} onChange={(e) => setEdNota(e.target.value)} />
                        </label>
                      </div>
                      <footer className="costos-administrativos__card-footer">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={cancelarEdicion}
                          disabled={guardandoEdicion}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => void guardarEdicion()}
                          disabled={guardandoEdicion}
                        >
                          {guardandoEdicion ? "Guardando…" : "Guardar"}
                        </button>
                      </footer>
                    </>
                  ) : (
                    <>
                      <header className="costos-administrativos__card-header">
                        <strong>{fmtMoney(Number(r.importe) || 0)}</strong>
                        <span>{r.fecha ? String(r.fecha).slice(0, 10) : "—"}</span>
                      </header>
                      <div className="costos-administrativos__card-body">
                        <p><b>Mes/Año:</b> {r.mes} / {r.anio}</p>
                        <p><b>Categoría:</b> {r.categoria_tipo ?? "—"}</p>
                        <p><b>Subcategoría:</b> {r.asociado_nombre?.trim() ? r.asociado_nombre : "—"}</p>
                        <p><b>Nota:</b> {r.nota?.trim() ? r.nota : "—"}</p>
                      </div>
                      <footer className="costos-administrativos__card-footer">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={cargando}
                          onClick={() => void iniciarEdicion(r)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          disabled={cargando}
                          onClick={() => void handleEliminar(r.id)}
                        >
                          Eliminar
                        </button>
                      </footer>
                    </>
                  )}
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
