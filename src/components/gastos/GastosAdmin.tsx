import React, { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { confirmWithToast } from "../../lib/confirmWithToast";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { Colaborador, RegistroVenta, Usuario } from "../../types";
import "../ventas/RegistroVentasNuevo.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Props {
  ventasRegistradas: RegistroVenta[];
  clientes: Colaborador[];
  usuarios?: Usuario[];
  onActualizarVenta: (venta: RegistroVenta) => Promise<void> | void;
}

function esVentaPorDias(v: RegistroVenta): boolean {
  const unidad = String((v as any).duracionUnidad ?? "").toLowerCase().trim();
  if (["dias", "días", "dia", "día"].includes(unidad)) return true;

  const notas = String(v.notas ?? "").toLowerCase();
  if (notas.includes("gasto_dia") || notas.includes("al día") || notas.includes("al dia"))
    return true;

  // Fallback para ventas antiguas sin `duracionUnidad` persistida:
  // si la duración capturada está en catálogo de días y el rango real es corto, tratamos como días.
  const diasCatalogo = new Set([1, 3, 7, 15]);
  const duracionCapturada = Number(v.mesesRenta ?? 0) || 0;
  if (!diasCatalogo.has(duracionCapturada)) return false;
  const fi = new Date(v.fechaInicio);
  const ff = new Date(v.fechaFin);
  if (Number.isNaN(fi.getTime()) || Number.isNaN(ff.getTime())) return false;
  const diffDias = Math.max(
    1,
    Math.round((ff.getTime() - fi.getTime()) / (1000 * 60 * 60 * 24)) + 1,
  );
  return diffDias <= 20;
}

function leerPeriodoGasto(v: RegistroVenta): number {
  const notas = String(v.notas ?? "");
  const m1 = notas.match(/GASTO_(MES|DIA)\s*:\s*(\d{1,2})/i);
  if (m1) return Math.max(1, Number(m1[2]) || 1);
  const m1b = notas.match(/GASTO_MES\s*:\s*(\d{1,2})/i);
  if (m1b) return Math.max(1, Number(m1b[1]) || 1);
  const m1c = notas.match(/GASTO_DIA\s*:\s*(\d{1,2})/i);
  if (m1c) return Math.max(1, Number(m1c[1]) || 1);
  const m2 = notas.match(/(mes|día|dia)\s+(\d{1,2})/i);
  if (m2) return Math.max(1, Number(m2[2]) || 1);
  return 1;
}

function leerPeriodosGasto(v: RegistroVenta): number[] {
  const notas = String(v.notas ?? "");
  const multi = notas.match(/GASTO_MESES\s*:\s*([0-9,\s]+)/i);
  if (multi?.[1]) {
    const arr = multi[1]
      .split(",")
      .map((x) => Math.max(1, Number(x.trim()) || 0))
      .filter((n) => n > 0);
    if (arr.length > 0) return Array.from(new Set(arr));
  }
  return [leerPeriodoGasto(v)];
}

function actualizarNotasConPeriodo(
  notas: string | undefined,
  periodo: number,
  porDias: boolean,
): string {
  const base = String(notas ?? "")
    .replace(/\(Gasto adicional aplicado al (mes|día|dia)\s+\d+:[^)]+\)/gi, "")
    .replace(/GASTO_(MES|DIA)\s*:\s*\d+/gi, "")
    .trim();
  const tag = porDias ? "GASTO_DIA" : "GASTO_MES";
  return `${base}${base ? " " : ""}${tag}:${periodo}`.trim();
}

function normalizarTexto(v: string): string {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function etiquetaPeriodoVenta(v: RegistroVenta): string {
  const base = new Date(v.fechaInicio as any);
  const periodos = leerPeriodosGasto(v);
  if (Number.isNaN(base.getTime())) {
    return periodos
      .map((n) => `${esVentaPorDias(v) ? "Día" : "Mes"} ${n}`)
      .join(", ");
  }
  if (esVentaPorDias(v)) {
    return periodos
      .map((numero) => {
        const d = new Date(base);
        d.setDate(d.getDate() + (numero - 1));
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
      })
      .join(", ");
  }
  return periodos
    .map((numero) => {
      const d = new Date(base.getFullYear(), base.getMonth() + (numero - 1), 1);
      const mes = d.toLocaleDateString("es-MX", { month: "long" });
      const mesFmt = mes.charAt(0).toUpperCase() + mes.slice(1);
      return `${mesFmt} ${d.getFullYear()}`;
    })
    .join(", ");
}

function actualizarNotasConPeriodos(
  notas: string | undefined,
  periodos: number[],
  porDias: boolean,
  notaGasto?: string,
): string {
  const base = String(notas ?? "")
    .replace(/\(Gasto adicional aplicado al (mes|día|dia)\s+\d+:[^)]+\)/gi, "")
    .replace(/GASTO_(MES|DIA|MESES)\s*:\s*[0-9,\s]+/gi, "")
    .replace(/GASTO_NOTA\s*:\s*[^|]+/gi, "")
    .trim();
  const limpios = Array.from(
    new Set(
      periodos
        .map((n) => Math.max(1, Number(n) || 0))
        .filter((n) => n > 0)
        .sort((a, b) => a - b),
    ),
  );
  const tag =
    limpios.length > 1
      ? `GASTO_MESES:${limpios.join(",")}`
      : porDias
        ? `GASTO_DIA:${limpios[0] ?? 1}`
        : `GASTO_MES:${limpios[0] ?? 1}`;
  const extraNota = normalizarTexto(notaGasto ?? "")
    ? `GASTO_NOTA:${String(notaGasto).trim()}`
    : "";
  return [base, tag, extraNota].filter(Boolean).join(" ").trim();
}

/** Quita del campo notas los marcadores de gasto adicional (mismo criterio que al reasignar periodo). */
function limpiarNotasGasto(notas: string | undefined): string {
  return String(notas ?? "")
    .replace(/\(Gasto adicional aplicado al (mes|día|dia)\s+\d+:[^)]+\)/gi, "")
    .replace(/GASTO_(MES|DIA|MESES)\s*:\s*[0-9,\s]+/gi, "")
    .replace(/GASTO_NOTA\s*:\s*[^|]+/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Texto libre guardado en `notas` con el prefijo `GASTO_NOTA:`. */
function leerNotaGastoDesdeVentasNotas(notas: string | undefined): string {
  const m = String(notas ?? "").match(/GASTO_NOTA\s*:\s*([^|]+)/i);
  return m?.[1]?.trim() ?? "";
}

export const GastosAdmin: React.FC<Props> = ({
  ventasRegistradas,
  clientes,
  usuarios = [],
  onActualizarVenta,
}) => {
  const [busquedaVenta, setBusquedaVenta] = useState("");
  const [ventaElegidaId, setVentaElegidaId] = useState<string | null>(null);
  const [busquedaGastos, setBusquedaGastos] = useState("");
  const [fechaBusquedaGastos, setFechaBusquedaGastos] = useState("");
  const [mesGasto, setMesGasto] = useState(1);
  const [periodosGasto, setPeriodosGasto] = useState<number[]>([1]);
  const [montoGasto, setMontoGasto] = useState(0);
  const [notaGastoVenta, setNotaGastoVenta] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [ventaDetalleActivaId, setVentaDetalleActivaId] = useState<string | null>(null);
  const [ventaModalId, setVentaModalId] = useState<string | null>(null);
  const formGastosRef = React.useRef<HTMLDivElement>(null);

  const ventasAceptadas = useMemo(
    () =>
      ventasRegistradas.filter(
        (v) => String(v.estadoVenta ?? "").toLowerCase() === "aceptado",
      ),
    [ventasRegistradas],
  );

  const candidatosVentaGasto = useMemo(() => {
    const qRaw = busquedaVenta.trim();
    if (!qRaw) return [];
    const porIdInterno = ventasAceptadas.filter((v) => String(v.id) === qRaw);
    if (porIdInterno.length > 0) return porIdInterno;

    const qId = qRaw.toLowerCase();
    const qNorm = normalizarTexto(qRaw);

    const porIdExacto = ventasAceptadas.filter(
      (v) => String(v.identificadorVenta ?? "").trim().toLowerCase() === qId,
    );
    if (porIdExacto.length > 0) return porIdExacto;

    const porIdParcial =
      qId.length >= 2
        ? ventasAceptadas.filter((v) => {
            const id = String(v.identificadorVenta ?? "").trim().toLowerCase();
            return id.length > 0 && id.includes(qId);
          })
        : [];
    if (porIdParcial.length > 0) return porIdParcial;

    if (qNorm.length < 2) return [];

    return ventasAceptadas.filter((v) => {
      const vendido = normalizarTexto(v.vendidoA);
      const colab = clientes.find((c) => String(c.id) === String(v.colaboradorId));
      const cn = normalizarTexto(colab?.nombre ?? "");
      return vendido.includes(qNorm) || cn.includes(qNorm);
    });
  }, [ventasAceptadas, busquedaVenta, clientes]);

  const ventaSeleccionada = useMemo(() => {
    if (candidatosVentaGasto.length === 0) return null;
    if (candidatosVentaGasto.length === 1) return candidatosVentaGasto[0];
    if (ventaElegidaId) {
      return (
        candidatosVentaGasto.find((v) => String(v.id) === String(ventaElegidaId)) ??
        null
      );
    }
    return null;
  }, [candidatosVentaGasto, ventaElegidaId]);

  const ventaSeleccionadaPorDias = ventaSeleccionada
    ? esVentaPorDias(ventaSeleccionada)
    : false;
  const topePeriodoSeleccionado = Math.max(
    1,
    Number(ventaSeleccionada?.mesesRenta ?? 1) || 1,
  );
  const opcionesPeriodo = useMemo(() => {
    const total = Math.max(1, Number(ventaSeleccionada?.mesesRenta ?? 1) || 1);
    const base = ventaSeleccionada ? new Date(ventaSeleccionada.fechaInicio as any) : null;
    const baseValida = base && !Number.isNaN(base.getTime());
    return Array.from({ length: total }, (_, i) => {
      const numero = i + 1;
      if (!baseValida) {
        return {
          value: String(numero),
          label: `${numero} - ${ventaSeleccionadaPorDias ? "Día" : "Mes"} ${numero}`,
        };
      }
      if (ventaSeleccionadaPorDias) {
        const d = new Date(base as Date);
        d.setDate(d.getDate() + i);
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        return {
          value: String(numero),
          label: `${numero} - ${dd}/${mm}/${yyyy}`,
        };
      }
      const d = new Date((base as Date).getFullYear(), (base as Date).getMonth() + i, 1);
      const mes = d.toLocaleDateString("es-MX", { month: "long" });
      const mesFmt = mes.charAt(0).toUpperCase() + mes.slice(1);
      return {
        value: String(numero),
        label: `${numero} - ${mesFmt} ${d.getFullYear()}`,
      };
    });
  }, [ventaSeleccionada?.id, ventaSeleccionadaPorDias, ventaSeleccionada?.mesesRenta]);

  React.useEffect(() => {
    if (!ventaSeleccionada) return;
    setMontoGasto(Number(ventaSeleccionada.gastosAdicionales ?? 0) || 0);
    setNotaGastoVenta(leerNotaGastoDesdeVentasNotas(ventaSeleccionada.notas));
    const periodos = leerPeriodosGasto(ventaSeleccionada);
    setPeriodosGasto(periodos);
    setMesGasto(periodos[0] ?? leerPeriodoGasto(ventaSeleccionada));
  }, [ventaSeleccionada?.id]);

  const ventasConGastoTop = useMemo(
    () =>
      ventasAceptadas
        .filter((v) => (Number(v.gastosAdicionales ?? 0) || 0) > 0)
        .sort((a, b) => Number(b.gastosAdicionales ?? 0) - Number(a.gastosAdicionales ?? 0))
        .slice(0, 12),
    [ventasAceptadas],
  );

  const chartData = useMemo(() => {
    return {
      labels: ventasConGastoTop.map((v) => etiquetaPeriodoVenta(v)),
      datasets: [
        {
          label: "Gastos adicionales",
          data: ventasConGastoTop.map((v) => Number(v.gastosAdicionales ?? 0) || 0),
          backgroundColor: "rgba(239, 68, 68, 0.45)",
          borderColor: "rgb(239, 68, 68)",
          borderWidth: 2,
        },
      ],
    };
  }, [ventasConGastoTop]);

  const chartDataPorColaborador = useMemo(() => {
    const acumulado = new Map<string, { nombre: string; total: number }>();
    for (const v of ventasAceptadas) {
      const comision = Number(v.comision ?? 0) || 0;
      if (comision <= 0) continue;
      const key = String(v.vendedorId ?? v.usuarioRegistroId ?? "");
      const usr = usuarios.find((u) => String(u.id) === key);
      const nombre = String(usr?.nombre ?? usr?.email ?? "Sin vendedor");
      const prev = acumulado.get(key) ?? { nombre, total: 0 };
      prev.total += comision;
      acumulado.set(key, prev);
    }
    const rows = Array.from(acumulado.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);
    return {
      labels: rows.map((r) => r.nombre),
      datasets: [
        {
          label: "Comisiones por vendedor",
          data: rows.map((r) => Math.round(r.total * 100) / 100),
          backgroundColor: "rgba(59, 130, 246, 0.35)",
          borderColor: "rgb(37, 99, 235)",
          borderWidth: 2,
        },
      ],
    };
  }, [ventasAceptadas, usuarios]);

  const chartOptionsGastos = useMemo(
    () => ({
      indexAxis: "y" as const,
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "right" as const },
        title: {
          display: true,
          text: "Gastos adicionales por periodo del gasto",
        },
        tooltip: {
          callbacks: {
            afterLabel: (ctx: { dataIndex: number }) => {
              const v = ventasConGastoTop[ctx.dataIndex];
              if (!v) return "";
              const id = String(v.identificadorVenta ?? "").trim() || "SIN-ID";
              return `Venta: ${id}`;
            },
          },
        },
      },
    }),
    [ventasConGastoTop],
  );

  const fechaKeysVenta = (v: RegistroVenta) => {
    const out: string[] = [];
    const fechas = [v.fechaInicio, v.fechaFin, v.fechaRegistro];
    for (const f of fechas) {
      const d = new Date(f as any);
      if (Number.isNaN(d.getTime())) continue;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      out.push(`${yyyy}-${mm}-${dd}`);
      out.push(`${dd}/${mm}/${yyyy}`);
    }
    return out;
  };

  const gastosFiltrados = useMemo(() => {
    const q = normalizarTexto(busquedaGastos);
    const qFecha = String(fechaBusquedaGastos ?? "").trim();
    return ventasAceptadas
      .filter((v) => (Number(v.gastosAdicionales ?? 0) || 0) > 0)
      .filter((v) => {
        const colab = clientes.find((c) => String(c.id) === String(v.colaboradorId));
        const baseTexto = normalizarTexto(
          [
            v.identificadorVenta || "SIN-ID",
            v.vendidoA || "",
            colab?.nombre || "",
            v.notas || "",
          ].join(" "),
        );
        const matchTexto = !q || baseTexto.includes(q);
        const fechaKeys = fechaKeysVenta(v);
        const matchFecha = !qFecha || fechaKeys.includes(qFecha);
        return matchTexto && matchFecha;
      });
  }, [ventasAceptadas, clientes, busquedaGastos, fechaBusquedaGastos]);

  const ventaDetalleActiva = useMemo(
    () =>
      ventasAceptadas.find((v) => String(v.id) === String(ventaDetalleActivaId)) ?? null,
    [ventasAceptadas, ventaDetalleActivaId],
  );
  const ventaModal = useMemo(
    () => ventasAceptadas.find((v) => String(v.id) === String(ventaModalId)) ?? null,
    [ventasAceptadas, ventaModalId],
  );

  const guardarGasto = async () => {
    if (!ventaSeleccionada) {
      toast.warning("Busca y selecciona una venta antes de guardar.");
      return;
    }
    if ((periodosGasto?.length ?? 0) === 0) {
      toast.warning("Selecciona al menos un mes/día para registrar el gasto.");
      return;
    }
    if (!Number.isFinite(Number(montoGasto)) || Number(montoGasto) < 0) {
      toast.warning("El monto del gasto debe ser un número mayor o igual a 0.");
      return;
    }
    setGuardando(true);
    try {
      const actualizado: RegistroVenta = {
        ...ventaSeleccionada,
        gastosAdicionales: Math.max(0, Number(montoGasto || 0)),
        notas: actualizarNotasConPeriodos(
          ventaSeleccionada.notas,
          (periodosGasto.length > 0 ? periodosGasto : [mesGasto]).map((n) =>
            Math.min(topePeriodoSeleccionado, Math.max(1, Number(n) || 1)),
          ),
          ventaSeleccionadaPorDias,
          notaGastoVenta,
        ),
      };
      await onActualizarVenta(actualizado);
    } catch (e) {
      /* Error ya notificado por handleActualizarVenta (toast) */
    } finally {
      setGuardando(false);
    }
  };

  const cargarVentaParaEdicionGasto = (v: RegistroVenta) => {
    const idStr = String(v.identificadorVenta ?? "").trim();
    const nombre = String(v.vendidoA ?? "").trim();
    setBusquedaVenta(idStr || nombre || String(v.id));
    setVentaElegidaId(String(v.id));
    setVentaModalId(null);
    requestAnimationFrame(() => {
      formGastosRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const borrarGastoAdicional = async (v: RegistroVenta) => {
    const etiqueta = v.identificadorVenta || v.vendidoA || "esta venta";
    const ok = await confirmWithToast(
      `¿Eliminar el gasto adicional de ${etiqueta}? Se pondrá en 0 y se quitará el periodo en notas.`,
    );
    if (!ok) {
      return;
    }
    setGuardando(true);
    try {
      await onActualizarVenta({
        ...v,
        gastosAdicionales: 0,
        notas: limpiarNotasGasto(v.notas),
      });
      setVentaModalId(null);
      if (String(ventaDetalleActivaId) === String(v.id)) {
        setVentaDetalleActivaId(null);
      }
    } catch (e) {
      /* Error ya notificado por handleActualizarVenta (toast) */
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="registro-ventas-nuevo">
      <div className="formulario-section" ref={formGastosRef}>
        <h3>💸 Gastos de venta</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Buscar venta (identificador o nombre)</label>
            <input
              type="text"
              value={busquedaVenta}
              onChange={(e) => {
                setBusquedaVenta(e.target.value);
                setVentaElegidaId(null);
              }}
              placeholder="Ej: RNAM o nombre del cliente"
            />
          </div>
          <div className="form-group">
            <label>Venta encontrada</label>
            <input
              type="text"
              readOnly
              value={
                ventaSeleccionada
                  ? `${ventaSeleccionada.identificadorVenta || "SIN-ID"} · ${ventaSeleccionada.vendidoA}`
                  : !busquedaVenta.trim()
                    ? "— Escribe para buscar —"
                    : candidatosVentaGasto.length === 0
                      ? "— Sin coincidencias —"
                      : candidatosVentaGasto.length > 1
                        ? "— Elige una venta en la lista de abajo —"
                        : "— Sin coincidencias —"
              }
            />
          </div>
        </div>
        {candidatosVentaGasto.length > 1 ? (
          <div className="gastos-candidatos-venta" role="listbox" aria-label="Ventas que coinciden con la búsqueda">
            <p className="gastos-candidatos-venta__hint">
              {candidatosVentaGasto.length} ventas coinciden; selecciona una:
            </p>
            <div className="gastos-candidatos-venta__list">
              {candidatosVentaGasto.map((v) => {
                const colab = clientes.find((c) => String(c.id) === String(v.colaboradorId));
                const sel = ventaElegidaId != null && String(v.id) === String(ventaElegidaId);
                return (
                  <button
                    key={v.id}
                    type="button"
                    role="option"
                    aria-selected={sel}
                    className={`gastos-candidatos-venta__chip${sel ? " gastos-candidatos-venta__chip--selected" : ""}`}
                    onClick={() => setVentaElegidaId(String(v.id))}
                  >
                    <span className="gastos-candidatos-venta__id">{v.identificadorVenta || "SIN-ID"}</span>
                    <span className="gastos-candidatos-venta__nombre">{v.vendidoA}</span>
                    {colab?.nombre ? (
                      <span className="gastos-candidatos-venta__colab">{colab.nombre}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        {ventaSeleccionada ? (
          <>
            <div className="form-row">
              <div className="form-group">
                <label>
                  {ventaSeleccionadaPorDias
                    ? "Gastos del día:"
                    : "Gastos del mes:"}
                </label>
                <div
                  style={{
                    border: "1px solid #dbe3ee",
                    borderRadius: 12,
                    padding: 12,
                    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                      Puedes seleccionar uno o varios periodos
                    </span>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ borderRadius: 999, padding: "6px 10px", fontSize: 12 }}
                      onClick={() => {
                        const todos = opcionesPeriodo.map((o) => Number(o.value));
                        setPeriodosGasto(todos.length > 0 ? todos : [1]);
                        setMesGasto(todos[0] ?? 1);
                      }}
                    >
                      Seleccionar todos
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ borderRadius: 999, padding: "6px 10px", fontSize: 12 }}
                      onClick={() => {
                        setPeriodosGasto([1]);
                        setMesGasto(1);
                      }}
                    >
                      Limpiar
                    </button>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))",
                      gap: 10,
                      maxHeight: 170,
                      overflowY: "auto",
                      paddingRight: 4,
                    }}
                  >
                    {opcionesPeriodo.map((opt) => {
                      const n = Number(opt.value);
                      const checked = periodosGasto.includes(n);
                      return (
                        <label
                          key={opt.value}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "10px 10px",
                            border: checked ? "1px solid #93c5fd" : "1px solid #e2e8f0",
                            borderRadius: 10,
                            cursor: "pointer",
                            background: checked ? "#eff6ff" : "#ffffff",
                            boxShadow: checked ? "0 0 0 2px rgba(59,130,246,.12)" : "none",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? Array.from(new Set([...periodosGasto, n])).sort((a, b) => a - b)
                                : periodosGasto.filter((x) => x !== n);
                              const safe = next.length > 0 ? next : [1];
                              setPeriodosGasto(safe);
                              setMesGasto(safe[0] ?? 1);
                            }}
                            style={{ width: 16, height: 16 }}
                          />
                          <span style={{ fontWeight: checked ? 700 : 500, color: "#0f172a" }}>
                            {opt.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="form-group">
                <label>Monto gasto adicional</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={montoGasto === 0 ? "" : montoGasto}
                  onChange={(e) => setMontoGasto(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Nota del gasto (opcional)</label>
              <input
                type="text"
                value={notaGastoVenta}
                onChange={(e) => setNotaGastoVenta(e.target.value)}
                placeholder="Detalle breve del gasto"
              />
            </div>
            <button className="btn btn-primary" onClick={() => void guardarGasto()} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar gasto"}
            </button>
          </>
        ) : (
          <button className="btn btn-primary" type="button" disabled>
            Guardar gasto
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 18, alignItems: "stretch" }}>
        <div className="grafica-card" style={{ flex: 1, marginTop: 0 }}>
          <div className="grafica-linea-wrap" style={{ height: 280 }}>
            <Bar
              options={{
                ...chartOptionsGastos,
                onClick: (_evt: any, elements: any[]) => {
                  if (!elements?.length) return;
                  const idx = Number(elements[0]?.index ?? -1);
                  if (idx < 0) return;
                  const venta = ventasConGastoTop[idx];
                  if (!venta) return;
                  setVentaDetalleActivaId(String(venta.id));
                },
              }}
              data={chartData}
            />
          </div>
        </div>
        <div className="grafica-card" style={{ flex: 1, marginTop: 0 }}>
          <div className="grafica-linea-wrap" style={{ height: 280 }}>
            <Bar
              options={{
                indexAxis: "y" as const,
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: "right" as const },
                  title: { display: true, text: "Comisiones por vendedor" },
                },
              }}
              data={chartDataPorColaborador}
            />
          </div>
        </div>
      </div>
      {ventaDetalleActiva ? (
        <div className="formulario-section" style={{ marginTop: 12 }}>
          <h4>Detalle de venta seleccionada</h4>
          <p>
            <strong>ID:</strong> {ventaDetalleActiva.identificadorVenta || "SIN-ID"} ·{" "}
            <strong>Venta:</strong> {ventaDetalleActiva.vendidoA}
          </p>
          <p>
            <strong>Periodo gasto:</strong> {etiquetaPeriodoVenta(ventaDetalleActiva)} ·{" "}
            <strong>Gasto adicional:</strong>{" "}
            {(Number(ventaDetalleActiva.gastosAdicionales ?? 0) || 0).toLocaleString(
              "es-MX",
              { style: "currency", currency: "MXN" },
            )}
          </p>
          <p>
            <strong>Fecha inicio:</strong>{" "}
            {new Date(ventaDetalleActiva.fechaInicio as any).toLocaleDateString("es-MX")} ·{" "}
            <strong>Fecha fin:</strong>{" "}
            {new Date(ventaDetalleActiva.fechaFin as any).toLocaleDateString("es-MX")}
          </p>
          <p>
            <strong>Nota del gasto:</strong>{" "}
            {leerNotaGastoDesdeVentasNotas(ventaDetalleActiva.notas) || (
              <span style={{ color: "#6b7280" }}>Sin nota</span>
            )}
          </p>
        </div>
      ) : null}

      <div className="registro-section" style={{ marginTop: 18 }}>
        <h4>Listado de gastos de venta</h4>
        <div className="form-row" style={{ marginBottom: 10 }}>
          <div className="form-group">
            <label>Buscar gasto (ID o venta)</label>
            <input
              type="text"
              value={busquedaGastos}
              onChange={(e) => setBusquedaGastos(e.target.value)}
              placeholder="Ej: ABC1 o Ronald"
            />
          </div>
          <div className="form-group">
            <label>Fecha</label>
            <input
              type="date"
              value={fechaBusquedaGastos}
              onChange={(e) => setFechaBusquedaGastos(e.target.value)}
            />
          </div>
        </div>
        <div className="ventas-list">
          {gastosFiltrados.map((v) => {
              const colab = clientes.find((c) => String(c.id) === String(v.colaboradorId));
              const precioVenta = Number(v.precioTotal ?? v.importeTotal ?? 0) || 0;
              const costosVenta = Number(v.costoVenta ?? v.costos ?? 0) || 0;
              const comisionVenta = Number(v.comision ?? 0) || 0;
              const utilidadNeta = Math.round((precioVenta - costosVenta - comisionVenta) * 100) / 100;
              return (
                <div
                  className="venta-item"
                  key={v.id}
                  style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setVentaModalId(String(v.id))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setVentaModalId(String(v.id));
                      }
                    }}
                    style={{ cursor: "pointer", flex: "1 1 220px", minWidth: 0 }}
                    title="Ver detalle del gasto y de la venta"
                  >
                    <p>
                      <strong>ID:</strong> {v.identificadorVenta || "SIN-ID"} ·{" "}
                      <strong>Venta:</strong> {v.vendidoA}
                    </p>
                    <p>
                      <strong>Colaborador:</strong> {colab?.nombre || "—"} ·{" "}
                      <strong>Periodo gasto:</strong>{" "}
                      {etiquetaPeriodoVenta(v)}
                    </p>
                    <p>
                      <strong>Gasto adicional:</strong>{" "}
                      {(Number(v.gastosAdicionales ?? 0) || 0).toLocaleString("es-MX", {
                        style: "currency",
                        currency: "MXN",
                      })}
                    </p>
                    <p>
                      <strong>Costos:</strong>{" "}
                      {costosVenta.toLocaleString("es-MX", {
                        style: "currency",
                        currency: "MXN",
                      })}{" "}
                      · <strong>Utilidad neta:</strong>{" "}
                      {utilidadNeta.toLocaleString("es-MX", {
                        style: "currency",
                        currency: "MXN",
                      })}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      flex: "0 0 auto",
                      paddingTop: 4,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={guardando}
                      onClick={() => cargarVentaParaEdicionGasto(v)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      disabled={guardando}
                      onClick={() => void borrarGastoAdicional(v)}
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
      {ventaModal ? (
        <div
          onClick={() => setVentaModalId(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(760px, 96vw)",
              maxHeight: "88vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              boxShadow: "0 12px 30px rgba(15,23,42,.25)",
              padding: 16,
            }}
          >
            {(() => {
              const precioVenta =
                Number(ventaModal.precioTotal ?? ventaModal.importeTotal ?? 0) || 0;
              const costosVenta =
                Number(ventaModal.costoVenta ?? ventaModal.costos ?? 0) || 0;
              const comisionVenta = Number(ventaModal.comision ?? 0) || 0;
              // Regla vigente: costos y gastos son informativos; utilidad neta = venta - comisión.
              const utilidadNeta = Math.round((precioVenta - comisionVenta) * 100) / 100;
              return (
                <>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <h4 style={{ margin: 0 }}>Detalle de gasto adicional</h4>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  disabled={guardando}
                  onClick={() => ventaModal && cargarVentaParaEdicionGasto(ventaModal)}
                >
                  Editar en formulario
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  disabled={guardando}
                  onClick={() => ventaModal && void borrarGastoAdicional(ventaModal)}
                >
                  Borrar gasto
                </button>
                <button type="button" className="btn btn-outline" onClick={() => setVentaModalId(null)}>
                  Cerrar
                </button>
              </div>
            </div>
            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 10,
              }}
            >
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
                <p style={{ margin: 0 }}>
                  <strong>ID:</strong> {ventaModal.identificadorVenta || "SIN-ID"}
                </p>
                <p style={{ margin: "6px 0 0 0" }}>
                  <strong>Venta:</strong> {ventaModal.vendidoA}
                </p>
                <p style={{ margin: "6px 0 0 0" }}>
                  <strong>Colaborador:</strong>{" "}
                  {clientes.find((c) => String(c.id) === String(ventaModal.colaboradorId))
                    ?.nombre || "—"}
                </p>
                <p style={{ margin: "6px 0 0 0" }}>
                  <strong>Estado:</strong> {ventaModal.estadoVenta || "—"}
                </p>
              </div>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10 }}>
                <p style={{ margin: 0 }}>
                  <strong>Periodo gasto:</strong> {etiquetaPeriodoVenta(ventaModal)}
                </p>
                <p style={{ margin: "6px 0 0 0" }}>
                  <strong>Gasto adicional:</strong>{" "}
                  {(Number(ventaModal.gastosAdicionales ?? 0) || 0).toLocaleString("es-MX", {
                    style: "currency",
                    currency: "MXN",
                  })}
                </p>
                <p style={{ margin: "6px 0 0 0" }}>
                  <strong>Fecha inicio:</strong>{" "}
                  {new Date(ventaModal.fechaInicio as any).toLocaleDateString("es-MX")}
                </p>
                <p style={{ margin: "6px 0 0 0" }}>
                  <strong>Fecha fin:</strong>{" "}
                  {new Date(ventaModal.fechaFin as any).toLocaleDateString("es-MX")}
                </p>
              </div>
              <div
                style={{
                  gridColumn: "1 / -1",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <p style={{ margin: 0 }}>
                  <strong>Nota del gasto:</strong>{" "}
                  {leerNotaGastoDesdeVentasNotas(ventaModal.notas) || (
                    <span style={{ color: "#6b7280" }}>Sin nota</span>
                  )}
                </p>
              </div>
              <div
                style={{
                  border: "1px solid #dbeafe",
                  background: "#f8fbff",
                  borderRadius: 8,
                  padding: 10,
                  gridColumn: "1 / -1",
                }}
              >
                <p style={{ margin: 0 }}>
                  <strong>Precio de la venta:</strong>{" "}
                  {precioVenta.toLocaleString("es-MX", {
                    style: "currency",
                    currency: "MXN",
                  })}
                </p>
                <p style={{ margin: "6px 0 0 0" }}>
                  <strong>Costos:</strong>{" "}
                  {costosVenta.toLocaleString("es-MX", {
                    style: "currency",
                    currency: "MXN",
                  })}{" "}
                  · <strong>Comisión:</strong>{" "}
                  {comisionVenta.toLocaleString("es-MX", {
                    style: "currency",
                    currency: "MXN",
                  })}
                </p>
                <p style={{ margin: "8px 0 0 0", color: "#0f766e", fontWeight: 700 }}>
                  Utilidad neta:{" "}
                  {utilidadNeta.toLocaleString("es-MX", {
                    style: "currency",
                    currency: "MXN",
                  })}
                </p>
              </div>
            </div>
                </>
              );
            })()}
          </div>
        </div>
      ) : null}
    </div>
  );
};

