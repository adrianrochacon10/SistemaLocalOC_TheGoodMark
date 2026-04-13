import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { backendApi } from "../../lib/backendApi";
import { confirmWithToast } from "../../lib/confirmWithToast";
import type { Colaborador, RegistroVenta } from "../../types";
import { inferirDuracionUnidadVenta } from "../../utils/duracionVenta";
import { ventaSolapaMesCalendario } from "../../utils/ventaFiltroPeriodo";
import { utilidadNetaContratoParaKpi } from "../../utils/utilidadVenta";
import "../ventas/RegistroVentasNuevo.css";
import "./ClientesPage.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export interface ClienteApi {
  id: string;
  nombre: string;
  telefono?: string | null;
  correo?: string | null;
  created_at?: string;
}

const MESES = [
  { v: "", l: "Todos los meses" },
  { v: "1", l: "Ene" },
  { v: "2", l: "Feb" },
  { v: "3", l: "Mar" },
  { v: "4", l: "Abr" },
  { v: "5", l: "May" },
  { v: "6", l: "Jun" },
  { v: "7", l: "Jul" },
  { v: "8", l: "Ago" },
  { v: "9", l: "Sep" },
  { v: "10", l: "Oct" },
  { v: "11", l: "Nov" },
  { v: "12", l: "Dic" },
];

function aniosOpciones(): { v: string; l: string }[] {
  const y = new Date().getFullYear();
  const out: { v: string; l: string }[] = [{ v: "", l: "Todos los años" }];
  for (let a = y; a >= y - 12; a -= 1) {
    out.push({ v: String(a), l: String(a) });
  }
  return out;
}

function fmtMx(n: number) {
  return Number(n).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  });
}

type EstadoFiltro = "todos" | "Aceptado" | "Prospecto" | "Rechazado";

function ventaPasaFiltros(
  v: RegistroVenta,
  estado: EstadoFiltro,
  mesStr: string,
  anioStr: string,
): boolean {
  if (estado !== "todos") {
    if (String(v.estadoVenta ?? "") !== estado) return false;
  }
  const mi = mesStr.trim() ? Number(mesStr) : NaN;
  const mesIdx = Number.isFinite(mi) && mi >= 1 && mi <= 12 ? mi - 1 : -1;
  const y = anioStr.trim() ? Number(anioStr) : NaN;
  const anio = Number.isFinite(y) && y >= 1900 ? y : -1;
  if (!ventaSolapaMesCalendario(v.fechaInicio, v.fechaFin, mesIdx, anio)) return false;
  return true;
}

export interface ClientesPageProps {
  ventasRegistradas: RegistroVenta[];
  /** Misma lista que en Ventas / Métricas (`datos.clientes`). */
  colaboradores?: Colaborador[];
  /** Tras editar/eliminar cliente, refresca ventas para alinear `client_id` y nombres. */
  onCatalogoClientesChange?: () => void | Promise<void>;
}

function utilidadNetaVentaParaGraficaCliente(
  v: RegistroVenta,
  colaboradores: Colaborador[],
): number {
  const unidadEsDia = inferirDuracionUnidadVenta(v) === "dias";
  if (unidadEsDia) {
    return Math.max(0, Number(v.costoVenta ?? v.costos ?? 0) || 0);
  }
  return Math.max(
    0,
    utilidadNetaContratoParaKpi(v, colaboradores) -
      (Number(v.gastosAdicionales ?? 0) || 0),
  );
}

type AgregadoClienteStack = {
  label: string;
  /** Contratos en meses con colaborador tipo % socio */
  mesesPorcentaje: number;
  /** Contratos en meses (fijo, consideración, etc.) */
  mesesOtros: number;
  /** Ventas por días (utilidad = costo de venta en UI) */
  dias: number;
};

function totalAgregadoStack(a: AgregadoClienteStack): number {
  return a.mesesPorcentaje + a.mesesOtros + a.dias;
}

export const ClientesPage: React.FC<ClientesPageProps> = ({
  ventasRegistradas,
  colaboradores = [],
  onCatalogoClientesChange,
}) => {
  const [lista, setLista] = useState<ClienteApi[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [correo, setCorreo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [busquedaCatalogo, setBusquedaCatalogo] = useState("");

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editTelefono, setEditTelefono] = useState("");
  const [editCorreo, setEditCorreo] = useState("");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  const [filtroEstado, setFiltroEstado] = useState<EstadoFiltro>("Aceptado");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroAnio, setFiltroAnio] = useState("");

  const cargarLista = useCallback(async () => {
    setCargandoLista(true);
    try {
      const rows = (await backendApi.get("/api/clients")) as ClienteApi[];
      setLista(Array.isArray(rows) ? rows : []);
    } catch {
      setLista([]);
      toast.error("No se pudo cargar el catálogo de clientes.");
    } finally {
      setCargandoLista(false);
    }
  }, []);

  useEffect(() => {
    void cargarLista();
  }, [cargarLista]);

  const listaCatalogoFiltrada = useMemo(() => {
    const q = busquedaCatalogo.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter((c) => {
      const n = String(c.nombre ?? "").toLowerCase();
      const t = String(c.telefono ?? "").toLowerCase();
      const e = String(c.correo ?? "").toLowerCase();
      return n.includes(q) || t.includes(q) || e.includes(q);
    });
  }, [lista, busquedaCatalogo]);

  const notificarCatalogoCambio = async () => {
    try {
      await onCatalogoClientesChange?.();
    } catch {
      /* opcional */
    }
  };

  const agregarCliente = async () => {
    const n = nombre.trim();
    if (!n) {
      toast.warning("El nombre del cliente es obligatorio.");
      return;
    }
    setGuardando(true);
    try {
      await backendApi.post("/api/clients", {
        nombre: n,
        telefono: telefono.trim() || null,
        correo: correo.trim() || null,
      });
      toast.success("Cliente registrado.");
      setNombre("");
      setTelefono("");
      setCorreo("");
      await cargarLista();
      await notificarCatalogoCambio();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar el cliente.");
    } finally {
      setGuardando(false);
    }
  };

  const iniciarEdicion = (c: ClienteApi) => {
    setEditandoId(c.id);
    setEditNombre(String(c.nombre ?? ""));
    setEditTelefono(String(c.telefono ?? ""));
    setEditCorreo(String(c.correo ?? ""));
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setEditNombre("");
    setEditTelefono("");
    setEditCorreo("");
  };

  const guardarEdicion = async () => {
    if (!editandoId) return;
    const n = editNombre.trim();
    if (!n) {
      toast.warning("El nombre del cliente es obligatorio.");
      return;
    }
    setGuardandoEdicion(true);
    try {
      await backendApi.patch(`/api/clients/${encodeURIComponent(editandoId)}`, {
        nombre: n,
        telefono: editTelefono.trim() || null,
        correo: editCorreo.trim() || null,
      });
      toast.success("Cliente actualizado.");
      cancelarEdicion();
      await cargarLista();
      await notificarCatalogoCambio();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar el cliente.");
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const eliminarCliente = async (c: ClienteApi) => {
    const ok = await confirmWithToast(
      `¿Eliminar a «${String(c.nombre ?? "").trim() || "este cliente"}»? Las ventas vinculadas quedarán sin cliente en catálogo (el vínculo se quita en base de datos).`,
      { title: "Eliminar cliente", confirmText: "Sí, eliminar" },
    );
    if (!ok) return;
    setEliminandoId(c.id);
    try {
      await backendApi.del(`/api/clients/${encodeURIComponent(c.id)}`);
      toast.success("Cliente eliminado.");
      if (editandoId === c.id) cancelarEdicion();
      await cargarLista();
      await notificarCatalogoCambio();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar el cliente.");
    } finally {
      setEliminandoId(null);
    }
  };

  const agregadosStackPorCliente = useMemo(() => {
    const map = new Map<string, AgregadoClienteStack>();
    for (const v of ventasRegistradas) {
      const cid =
        v.clientId != null && String(v.clientId).trim() !== ""
          ? String(v.clientId).trim()
          : "";
      if (!cid) continue;
      if (!ventaPasaFiltros(v, filtroEstado, filtroMes, filtroAnio)) continue;
      const cat = lista.find((x) => String(x.id) === cid);
      const label =
        cat?.nombre?.trim() ||
        "(Cliente eliminado o no listado)";
      const add = utilidadNetaVentaParaGraficaCliente(v, colaboradores);
      const esDia = inferirDuracionUnidadVenta(v) === "dias";
      const col = colaboradores.find((c) => String(c.id) === String(v.colaboradorId));
      const esPct = String(col?.tipoComision ?? "").toLowerCase() === "porcentaje";

      let row = map.get(cid);
      if (!row) {
        row = { label, mesesPorcentaje: 0, mesesOtros: 0, dias: 0 };
        map.set(cid, row);
      }
      if (esDia) row.dias += add;
      else if (esPct) row.mesesPorcentaje += add;
      else row.mesesOtros += add;
    }
    const rows = [...map.values()];
    rows.sort((a, b) => totalAgregadoStack(b) - totalAgregadoStack(a));
    return rows;
  }, [ventasRegistradas, lista, filtroEstado, filtroMes, filtroAnio, colaboradores]);

  const chartData = useMemo(() => {
    const labels = agregadosStackPorCliente.map((r) =>
      r.label.length > 42 ? `${r.label.slice(0, 40)}…` : r.label,
    );
    const q = (n: number) => Math.round(n * 100) / 100;
    return {
      labels,
      datasets: [
        {
          label: "Contrato % socio",
          data: agregadosStackPorCliente.map((r) => q(r.mesesPorcentaje)),
          backgroundColor: "rgba(255, 99, 132, 0.85)",
          borderColor: "rgb(255, 99, 132)",
          borderWidth: 1,
        },
        {
          label: "Otro tipo de pago",
          data: agregadosStackPorCliente.map((r) => q(r.mesesOtros)),
          backgroundColor: "rgba(75, 192, 192, 0.85)",
          borderColor: "rgb(75, 192, 192)",
          borderWidth: 1,
        },
        {
          label: "Por días",
          data: agregadosStackPorCliente.map((r) => q(r.dias)),
          backgroundColor: "rgba(53, 162, 235, 0.85)",
          borderColor: "rgb(53, 162, 235)",
          borderWidth: 1,
        },
      ],
    };
  }, [agregadosStackPorCliente]);

  const chartHeight = Math.max(280, agregadosStackPorCliente.length * 34 + 120);

  const tituloGrafica = useMemo(() => {
    const partes: string[] = [];
    if (filtroEstado !== "todos") partes.push(filtroEstado);
    const mi = filtroMes ? Number(filtroMes) : NaN;
    if (filtroMes && Number.isFinite(mi) && mi >= 1 && mi <= 12) {
      partes.push(MESES[mi]?.l ?? `mes ${mi}`);
    }
    if (filtroAnio.trim()) partes.push(`año ${filtroAnio.trim()}`);
    const suf = partes.length ? ` (${partes.join(" · ")})` : "";
    return `Utilidad neta por cliente${suf}`;
  }, [filtroEstado, filtroMes, filtroAnio]);

  const opcionesBarra: ChartOptions<"bar"> = useMemo(
    () => ({
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: { boxWidth: 14, padding: 14, usePointStyle: true },
        },
        title: {
          display: true,
          text: tituloGrafica,
          font: { size: 14 },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const val = Number(ctx.raw) || 0;
              const ds = String(ctx.dataset.label ?? "");
              if (val === 0) return `${ds}: —`;
              return `${ds}: ${fmtMx(val)}`;
            },
            footer: (items) => {
              if (!items.length) return "";
              const row = agregadosStackPorCliente[items[0].dataIndex];
              if (!row) return "";
              return `Total: ${fmtMx(totalAgregadoStack(row))}`;
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          beginAtZero: true,
          grace: "8%",
          ticks: {
            callback: (value) => fmtMx(Number(value)),
          },
        },
        y: {
          stacked: true,
        },
      },
    }),
    [tituloGrafica, agregadosStackPorCliente],
  );

  return (
    <div className="clientes-page">
      <h2>Clientes</h2>

      <div className="clientes-page__card clientes-page__card--registrar">
        <h3>Registrar cliente</h3>
        <div className="clientes-page__form-row clientes-page__form-row--3">
          <label>
            Nombre *
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </label>
          <label>
            Teléfono
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Opcional"
            />
          </label>
          <label>
            Correo
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="Opcional"
            />
          </label>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          disabled={guardando}
          onClick={() => void agregarCliente()}
        >
          {guardando ? "Guardando…" : "Agregar cliente"}
        </button>
      </div>

      <div className="clientes-page__card clientes-page__catalogo-card">
        <div className="clientes-page__catalogo-toolbar">
          <h3>Catálogo ({lista.length})</h3>
          <input
            type="search"
            className="clientes-page__buscador-catalogo"
            placeholder="Buscar por nombre, teléfono o correo…"
            value={busquedaCatalogo}
            onChange={(e) => setBusquedaCatalogo(e.target.value)}
            aria-label="Buscar en catálogo"
            disabled={cargandoLista || lista.length === 0}
          />
        </div>
        {cargandoLista ? (
          <p className="clientes-page__vacio">Cargando…</p>
        ) : lista.length === 0 ? (
          <p className="clientes-page__vacio">Aún no hay clientes registrados.</p>
        ) : listaCatalogoFiltrada.length === 0 ? (
          <p className="clientes-page__vacio">Ningún resultado para tu búsqueda.</p>
        ) : (
          <div className="clientes-page__grid-cards">
            {listaCatalogoFiltrada.map((c) => (
              <article key={c.id} className="clientes-page__cliente-card">
                {editandoId === c.id ? (
                  <div className="clientes-page__cliente-edit">
                    <label className="clientes-page__edit-label">
                      Nombre *
                      <input
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                        disabled={guardandoEdicion}
                      />
                    </label>
                    <label className="clientes-page__edit-label">
                      Teléfono
                      <input
                        value={editTelefono}
                        onChange={(e) => setEditTelefono(e.target.value)}
                        disabled={guardandoEdicion}
                        placeholder="Opcional"
                      />
                    </label>
                    <label className="clientes-page__edit-label">
                      Correo
                      <input
                        type="email"
                        value={editCorreo}
                        onChange={(e) => setEditCorreo(e.target.value)}
                        disabled={guardandoEdicion}
                        placeholder="Opcional"
                      />
                    </label>
                    <div className="clientes-page__cliente-actions">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={guardandoEdicion}
                        onClick={() => void guardarEdicion()}
                      >
                        {guardandoEdicion ? "Guardando…" : "Guardar"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        disabled={guardandoEdicion}
                        onClick={cancelarEdicion}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h4 className="clientes-page__cliente-nombre">{c.nombre}</h4>
                    {c.telefono ? (
                      <p className="clientes-page__cliente-line">
                        <span className="clientes-page__cliente-k">Tel.</span> {c.telefono}
                      </p>
                    ) : null}
                    {c.correo ? (
                      <p className="clientes-page__cliente-line clientes-page__cliente-line--correo">
                        <span className="clientes-page__cliente-k">Correo</span>{" "}
                        <a href={`mailto:${c.correo}`}>{c.correo}</a>
                      </p>
                    ) : null}
                    {!c.telefono && !c.correo ? (
                      <p className="clientes-page__cliente-sin-contacto">Sin teléfono ni correo</p>
                    ) : null}
                    <div className="clientes-page__cliente-actions">
                      <button
                        type="button"
                        className="btn btn-sm clientes-page__btn-editar"
                        disabled={eliminandoId === c.id}
                        onClick={() => iniciarEdicion(c)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={eliminandoId === c.id}
                        onClick={() => void eliminarCliente(c)}
                      >
                        {eliminandoId === c.id ? "Eliminando…" : "Eliminar"}
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="clientes-page__card" style={{ marginTop: "1.25rem" }}>
        <h3>Utilidad neta por cliente</h3>

        <div className="clientes-page__filtros">
          <div className="form-group">
            <label>Estado de venta</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as EstadoFiltro)}
              aria-label="Filtrar por estado de venta"
            >
              <option value="todos">Todos</option>
              <option value="Aceptado">Aceptado</option>
              <option value="Prospecto">Prospecto</option>
              <option value="Rechazado">Rechazado</option>
            </select>
          </div>
          <div className="form-group">
            <label>Mes</label>
            <select
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              aria-label="Filtrar por mes calendario que cruza el contrato"
            >
              {MESES.map((m) => (
                <option key={m.v || "all"} value={m.v}>
                  {m.l}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Año</label>
            <select
              value={filtroAnio}
              onChange={(e) => setFiltroAnio(e.target.value)}
              aria-label="Filtrar por año que cruza el contrato"
            >
              {aniosOpciones().map((a) => (
                <option key={a.v || "all"} value={a.v}>
                  {a.l}
                </option>
              ))}
            </select>
          </div>
        </div>

        {agregadosStackPorCliente.length === 0 ? (
          <p className="clientes-page__vacio">
            No hay datos: ninguna venta con cliente vinculado cumple los filtros, o aún no registras
            ventas eligiendo cliente en el formulario de Ventas.
          </p>
        ) : (
          <div className="clientes-page__chart-box" style={{ height: chartHeight }}>
            <Bar data={chartData} options={opcionesBarra} />
          </div>
        )}
      </div>
    </div>
  );
};
