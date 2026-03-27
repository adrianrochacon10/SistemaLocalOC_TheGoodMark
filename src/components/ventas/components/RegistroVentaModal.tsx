// src/components/ventas/RegistroVentaModal.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  RegistroVenta,
  Pantalla,
  AsignacionPantalla,
  Colaborador,
  Usuario,
  ItemVenta,
  Producto,
  AsignacionProductoExtra,
} from "../../../types";
import { calcularFechaFin, stringAFecha } from "../../../utils/formateoFecha";
import { SelectField } from "../../ui/SelectField";
import { SelectorPantallas } from "./SelectorPantallas";
import { InputField } from "../../ui/InputField";
import { ResumenVenta } from "./ResumenVenta";
import { BotonAccion } from "../../ui/BotonAccion";

interface RegistroVentaModalProps {
  pantallas: Pantalla[];
  productos: Producto[];
  asignaciones: AsignacionPantalla[];
  asignacionesProductos: AsignacionProductoExtra[];
  clientes: Colaborador[];
  usuarios: Usuario[];
  usuarioActual: Usuario;
  onRegistrarVenta: (venta: RegistroVenta) => Promise<void> | void;
  onActualizarVenta: (venta: RegistroVenta) => Promise<void> | void;
  onCerrar: () => void;
  ventaInicial: RegistroVenta | null;
}

export const RegistroVentaModal: React.FC<RegistroVentaModalProps> = ({
  pantallas,
  productos,
  asignaciones,
  asignacionesProductos,
  clientes,
  usuarios = [],
  usuarioActual,
  onRegistrarVenta,
  onActualizarVenta,
  onCerrar,
  ventaInicial,
}) => {
  // ── Estados ───────────────────────────────────────────────────────────
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>(
    ventaInicial?.colaboradorId ?? "",
  );
  const [itemsVenta, setItemsVenta] = useState<ItemVenta[]>(
    ventaInicial?.itemsVenta ?? [],
  );
  const [fechaInicio, setFechaInicio] = useState<string>(() => {
    if (!ventaInicial?.fechaInicio) return "";
    const fecha = new Date(ventaInicial.fechaInicio); // acepta Date o string
    return isNaN(fecha.getTime()) ? "" : fecha.toISOString().slice(0, 10);
  });
  const [mesesRenta, setMesesRenta] = useState<number>(
    ventaInicial?.mesesRenta ?? 1,
  );
  const [vendidoA, setVendidoA] = useState<string>(
    ventaInicial?.vendidoA ?? "",
  );
  const [precioGeneral, setPrecioGeneral] = useState<number>(
    ventaInicial?.precioGeneral ?? 0,
  );
  const [precioGeneralEditadoManualmente, setPrecioGeneralEditadoManualmente] =
    useState<boolean>(false);
  const [precioVentaPorMesOverride, setPrecioVentaPorMesOverride] = useState<
    number | null
  >(null);
  const [productosSeleccionados, setProductosSeleccionados] = useState<string[]>(
    ventaInicial?.productoIds ??
      (ventaInicial?.productoId ? [String(ventaInicial.productoId)] : []),
  );
  const [precioVentaProductoMap, setPrecioVentaProductoMap] = useState<
    Record<string, number>
  >({});
  const [porcentajeSocio, setPorcentajeSocio] = useState<number>(30);
  const [montoSocio, setMontoSocio] = useState<number>(0);
  const [aplicarDescuento, setAplicarDescuento] = useState<boolean>(false);
  const [estadoVenta, setEstadoVenta] = useState<
    "Aceptado" | "Rechazado" | "Prospecto"
  >(ventaInicial?.estadoVenta ?? "Prospecto");
  const mesesIniciales = ventaInicial?.mesesRenta ?? 1;

  const [costos, setCostos] = useState<number>(
    ventaInicial ? (ventaInicial.costos ?? 0) / mesesIniciales : 0,
  );
  const [comision, setComision] = useState<number>(
    ventaInicial?.comisionPorcentaje ??
      (ventaInicial && ventaInicial.precioGeneral > 0
        ? (((ventaInicial.comision ?? 0) / mesesIniciales) / ventaInicial.precioGeneral) *
          100
        : 0),
  );
  const [gastosAdicionales, setGastosAdicionales] = useState<number>(
    ventaInicial?.gastosAdicionales ?? 0,
  );
  const [pagoConsiderar, setPagoConsiderar] = useState<number>(
    ventaInicial?.pagoConsiderar ?? 0,
  ); // ← nuevo
  const [notas, setNotas] = useState<string>(ventaInicial?.notas ?? "");
  const [fuenteOrigen, setFuenteOrigen] = useState<string>(
    ventaInicial?.fuenteOrigen ?? "",
  );
  const [codigoEdicion, setCodigoEdicion] = useState<string>("");

  const [error, setError] = useState<string>("");
  const [exito, setExito] = useState<string>("");

  const toNumberSafe = (value: string, fallback = 0): number => {
    if (value === "") return 0;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  // ── Derivados ─────────────────────────────────────────────────────────
  const pantallasSeleccionadas = itemsVenta.map((i) => i.pantallaId);

  const opcionesClientes = clientes
    .map((c) => ({
      value: c.id,
      label: c.nombre,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const nombreVendedorActual = useMemo(() => {
    if (!usuarioActual?.id) return "Sin usuario";
    const encontrado = (usuarios ?? []).find((u) => u.id === usuarioActual.id);
    return encontrado?.nombre || usuarioActual.nombre || "Sin nombre";
  }, [usuarios, usuarioActual]);

  const productosDelCliente = useMemo(() => {
    const c = clientes.find((x) => x.id === clienteSeleccionado) as
      | (Colaborador & {
          producto_ids?: string[];
          productos?: Array<{ id: string; nombre: string }>;
        })
      | undefined;
    if (!c) return [];

    const directos = Array.isArray((c as any).productos)
      ? ((c as any).productos as Array<{
          id: string;
          nombre?: string;
          precio?: number;
          precio_unitario?: number;
          precio_por_mes?: number;
        }>)
          .filter((p) => p?.id)
          .map((p) => ({
            id: String(p.id),
            nombre: String(p.nombre ?? "").trim() || "Producto",
            precio:
              Number(p.precio ?? p.precio_unitario ?? p.precio_por_mes ?? 0) || 0,
          }))
      : [];

    let ids: string[] = [];
    if (Array.isArray(c.producto_ids) && c.producto_ids.length > 0) {
      ids = c.producto_ids.filter(Boolean) as string[];
    } else if (Array.isArray(c.productos) && c.productos.length > 0) {
      ids = c.productos.map((p) => p.id).filter(Boolean);
    } else if (c.productoId) {
      ids = [String(c.productoId)];
    }
    const porIds = [...new Set(ids)]
      .map((id) => productos.find((p) => String(p.id) === String(id)))
      .filter(Boolean)
      .map((p) => ({
        id: String((p as Producto).id),
        nombre: String((p as Producto).nombre ?? "").trim() || "Producto",
        precio: Number((p as Producto).precio ?? 0) || 0,
      }));

    const map = new Map<string, { id: string; nombre: string; precio: number }>();
    for (const p of [...directos, ...porIds]) map.set(p.id, p);
    return Array.from(map.values());
  }, [clienteSeleccionado, clientes, productos]);

  const pantallasCatalogo = useMemo(() => {
    const c = clientes.find((x) => x.id === clienteSeleccionado) as
      | (Colaborador & {
          pantallas?: Array<{ id: string; nombre?: string; ubicacion?: string }>;
        })
      | undefined;

    const directas = Array.isArray(c?.pantallas)
      ? c!.pantallas
          .filter((p) => p?.id)
          .map((p) => ({
            id: String(p.id),
            nombre: String(p.nombre ?? "").trim() || "Pantalla",
            ubicacion: p.ubicacion,
            activa: true,
            fechaCreacion: new Date(),
          }))
      : [];

    const map = new Map<string, Pantalla>();
    for (const p of pantallas) map.set(String(p.id), p);
    for (const p of directas) {
      if (!map.has(String(p.id))) map.set(String(p.id), p as Pantalla);
    }
    return Array.from(map.values());
  }, [clienteSeleccionado, clientes, pantallas]);

  /** Asignaciones en BD + pantallas del colaborador vía API (pantalla_ids / pantallas) */
  const pantallasDelCliente = useMemo((): AsignacionPantalla[] => {
    const fromAsignaciones = asignaciones.filter(
      (a) => a.clienteId === clienteSeleccionado && a.activa,
    );
    if (fromAsignaciones.length > 0) return fromAsignaciones;

    const c = clientes.find((x) => x.id === clienteSeleccionado) as
      | (Colaborador & {
          pantalla_ids?: string[];
          pantallas?: Array<{ id: string }>;
        })
      | undefined;
    if (!c) return [];

    let ids: string[] = [];
    if (Array.isArray(c.pantalla_ids) && c.pantalla_ids.length > 0) {
      ids = c.pantalla_ids.filter(Boolean) as string[];
    } else if (Array.isArray(c.pantallas) && c.pantallas.length > 0) {
      ids = c.pantallas.map((p) => p.id).filter(Boolean);
    }
    if (ids.length === 0) return [];

    const now = new Date();
    return ids.map((pantallaId, i) => ({
      id: `colab-${clienteSeleccionado}-${pantallaId}-${i}`,
      pantallaId,
      clienteId: clienteSeleccionado,
      activa: true,
      fechaAsignacion: now,
    }));
  }, [clienteSeleccionado, asignaciones, clientes]);

  const clienteActual = clientes.find((c) => c.id === clienteSeleccionado);
  const soloUnProductoSinPantallas =
    productosSeleccionados.length === 1 && pantallasSeleccionadas.length === 0;
  const precioPorMesEditable = mesesRenta > 1;
  const productosActuales = productosDelCliente.filter((p) =>
    productosSeleccionados.includes(String(p.id)),
  );
  const precioProductosSeleccionados = productosActuales.reduce(
    (sum, p) => sum + (Number(precioVentaProductoMap[String(p.id)] ?? p.precio ?? 0) || 0),
    0,
  );
  const precioMensualCalculado = soloUnProductoSinPantallas
    ? Number(precioGeneral || 0)
    : Number(precioGeneral || 0) + Number(precioProductosSeleccionados || 0);
  const precioMensualFinal = !precioPorMesEditable
    ? precioMensualCalculado
    : precioVentaPorMesOverride == null
      ? precioMensualCalculado
      : precioVentaPorMesOverride;
  const comisionMensual = (precioMensualFinal * (Number(comision || 0) / 100));
  const tieneComisionPorcentaje = clienteActual?.tipoComision === "porcentaje";
  const tieneConsideracion = clienteActual?.tipoComision === "consideracion";
  const pantallasActuales = pantallasSeleccionadas
    .map((id) => pantallasCatalogo.find((p) => String(p.id) === String(id)))
    .filter(Boolean) as Pantalla[];
  const fechaFin = calcularFechaFin(fechaInicio, mesesRenta);
  const totalVenta = precioMensualFinal * mesesRenta;
  const costosTotales = costos * mesesRenta;

  useEffect(() => {
    if (clienteActual && typeof clienteActual.porcentajeSocio === "number") {
      setPorcentajeSocio(clienteActual.porcentajeSocio);
      // montoSocio = precio por mes × porcentaje  → valor POR MES
      setMontoSocio(
        Math.round(
          ((precioGeneral * clienteActual.porcentajeSocio) / 100) * 100,
        ) / 100,
      );
    } else {
      setMontoSocio(
        Math.round(((precioGeneral * porcentajeSocio) / 100) * 100) / 100,
      );
    }
  }, [precioMensualFinal, porcentajeSocio, clienteActual]);

  useEffect(() => {
    if (!clienteSeleccionado) {
      setProductosSeleccionados([]);
      return;
    }
    setProductosSeleccionados((prev) =>
      prev.filter((pid) => productosDelCliente.some((p) => String(p.id) === String(pid))),
    );
  }, [clienteSeleccionado, productosDelCliente]);

  useEffect(() => {
    // Si la venta se arma solo con 1 producto (sin pantallas),
    // autocompleta el precio base con el precio del producto, pero sin bloquear edición.
    if (
      !precioGeneralEditadoManualmente &&
      pantallasSeleccionadas.length === 0 &&
      productosSeleccionados.length === 1
    ) {
      const unicoId = String(productosSeleccionados[0]);
      const precioProducto =
        Number(
          precioVentaProductoMap[unicoId] ??
            productosDelCliente.find((p) => String(p.id) === unicoId)?.precio ??
            0,
        ) || 0;
      setPrecioGeneral(precioProducto);
    }
  }, [
    pantallasSeleccionadas.length,
    productosSeleccionados,
    productosDelCliente,
    precioVentaProductoMap,
    precioGeneralEditadoManualmente,
  ]);

  useEffect(() => {
    if (!soloUnProductoSinPantallas) return;
    const unicoId = String(productosSeleccionados[0] ?? "");
    const precioProducto =
      Number(
        precioVentaProductoMap[unicoId] ??
          productosDelCliente.find((p) => String(p.id) === unicoId)?.precio ??
          0,
      ) || 0;
    setPrecioGeneral(precioProducto);
  }, [
    soloUnProductoSinPantallas,
    productosSeleccionados,
    productosDelCliente,
    precioVentaProductoMap,
  ]);

  useEffect(() => {
    setPrecioVentaProductoMap((prev) => {
      const next: Record<string, number> = { ...prev };
      for (const p of productosDelCliente) {
        const id = String(p.id);
        if (next[id] == null || Number.isNaN(Number(next[id]))) {
          next[id] = Number(p.precio ?? 0) || 0;
        }
      }
      return next;
    });
  }, [productosDelCliente]);

  const toggleProducto = (productoId: string) => {
    setProductosSeleccionados((prev) =>
      prev.includes(productoId)
        ? prev.filter((id) => id !== productoId)
        : [...prev, productoId],
    );
  };

  const setPrecioProductoVenta = (productoId: string, value: number) => {
    setPrecioVentaProductoMap((prev) => ({
      ...prev,
      [productoId]: value >= 0 ? value : 0,
    }));
  };

  const togglePantalla = (pantallaId: string) => {
    const yaSeleccionada = itemsVenta.some((i) => i.pantallaId === pantallaId);
    setItemsVenta((prev) =>
      yaSeleccionada
        ? prev.filter((i) => i.pantallaId !== pantallaId)
        : [...prev, { pantallaId, sinDescuento: false }],
    );
  };

  const resetFormularioVenta = () => {
    setClienteSeleccionado("");
    setItemsVenta([]);
    setVendidoA("");
    setFechaInicio("");
    setMesesRenta(1);
    setPrecioGeneral(0);
    setProductosSeleccionados([]);
    setPrecioVentaProductoMap({});
    setPrecioGeneralEditadoManualmente(false);
    setPrecioVentaPorMesOverride(null);
    setEstadoVenta("Prospecto");
    setAplicarDescuento(false);
    setCostos(0);
    setError("");
    setExito("");
    setComision(0);
    setGastosAdicionales(0);
    setPagoConsiderar(0);
    setNotas("");
    setCodigoEdicion("");
    setFuenteOrigen("");
  };

  // ── Registrar ─────────────────────────────────────────────────────────
  const handleRegistrarVenta = async () => {
    setError("");
    setExito("");
    if (!clienteSeleccionado) {
      setError("Selecciona un cliente");
      return;
    }
    if (itemsVenta.length === 0 && productosSeleccionados.length === 0) {
      setError("Selecciona al menos una pantalla o un producto");
      return;
    }
    if (!vendidoA.trim()) {
      setError("Especifica a quién se vendió/rentó");
      return;
    }
    if (!fechaInicio) {
      setError("Selecciona una fecha de inicio");
      return;
    }
    if (mesesRenta < 1) {
      setError("La duración debe ser al menos 1 mes");
      return;
    }
    if (precioGeneral < 0) {
      setError("El costo de la venta no puede ser negativo");
      return;
    }
    if (ventaInicial && usuarioActual.rol === "vendedor" && !codigoEdicion.trim()) {
      setError("Ingresa código de edición para guardar cambios");
      return;
    }

    const nuevaVenta: RegistroVenta = {
      id: ventaInicial?.id ?? "v" + Date.now(),
      pantallasIds: itemsVenta.map((i) => i.pantallaId),
      itemsVenta,
      colaboradorId: clienteSeleccionado,
      productoId: productosSeleccionados[0] || undefined,
      productoIds: productosSeleccionados,
      productoNombre:
        productosActuales.map((p) => p.nombre).join(", ").trim() || undefined,
      productoPrecioMensual: precioProductosSeleccionados || 0,
      fuenteOrigen: fuenteOrigen.trim() || undefined,
      vendidoA: vendidoA.trim(),
      precioGeneral: precioMensualFinal,
      cantidad: 1,
      precioTotal: precioMensualFinal * mesesRenta,
      importeTotal:
        tieneComisionPorcentaje && aplicarDescuento
          ? montoSocio * mesesRenta
          : precioMensualFinal * mesesRenta,
      fechaRegistro: ventaInicial?.fechaRegistro ?? new Date(),
      fechaInicio: stringAFecha(fechaInicio),
      fechaFin: stringAFecha(fechaFin),
      mesesRenta,
      activo: true,
      usuarioRegistroId: usuarioActual.id,
      estadoVenta,
      vendedorId: usuarioActual.id,
      costos: costosTotales,
      comision: comisionMensual * mesesRenta,
      comisionPorcentaje: Number(comision || 0),
      gastosAdicionales: Number(gastosAdicionales || 0),
      pagoConsiderar: tieneConsideracion
        ? pagoConsiderar * mesesRenta
        : undefined,
      notas: notas.trim() || undefined,
      codigoEdicion: codigoEdicion.trim() || undefined,
    };
    try {
      if (ventaInicial) {
        await onActualizarVenta(nuevaVenta);
        setExito("Venta actualizada correctamente");
      } else {
        await onRegistrarVenta(nuevaVenta);
        setExito("Venta registrada correctamente");
      }
      resetFormularioVenta();
      setTimeout(() => setExito(""), 2000);
      onCerrar();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "No se pudieron guardar los cambios de la venta",
      );
    }
  };

  // ── JSX ───────────────────────────────────────────────────────────────
  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-contenido" onClick={(e) => e.stopPropagation()}>
        <h3
          style={{
            margin: "0 0 20px 0",
            paddingBottom: "12px",
            borderBottom: "2px solid #e2e8f0",
          }}
        >
          Registrar Venta
        </h3>

        <div className="formulario-section">
          <SelectField
            label="Colaborador *"
            value={clienteSeleccionado}
            onChange={(v: any) => {
              setClienteSeleccionado(v);
              setItemsVenta([]);
              const colaborador = clientes.find((c) => c.id === v);
              setAplicarDescuento(colaborador?.tipoComision === "porcentaje");
            }}
            placeholder="-- Seleccionar colaborador --"
            className="select-lg"
            options={opcionesClientes}
          />

          {clienteSeleccionado && (
            <>
              {pantallasDelCliente.length > 0 ? (
                <SelectorPantallas
                  pantallasDelCliente={pantallasDelCliente}
                  pantallasSeleccionadas={pantallasSeleccionadas}
                  pantallas={pantallasCatalogo}
                  onToggle={togglePantalla}
                />
              ) : (
                <div className="hint-text">Sin pantallas asociadas. Puedes registrar solo productos.</div>
              )}
              <div className="form-group">
                <label className="label-pantallas">
                  Productos seleccionados:{" "}
                  <span className="badge-cantidad">{productosSeleccionados.length}</span>
                </label>
                <div className="pantallas-checkbox-group">
                  {productosDelCliente.map((p) => {
                    const selected = productosSeleccionados.includes(String(p.id));
                    return (
                      <label
                        key={p.id}
                        className={`checkbox-item ${selected ? "selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleProducto(String(p.id))}
                        />
                        <span className="checkbox-visual"></span>
                        <span className="checkbox-label">
                          <span className="pantalla-nombre">{p.nombre}</span>
                          <span className="pantalla-mini-ubicacion">
                            Catálogo: ${Number(p.precio ?? 0).toLocaleString("es-MX", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                          {selected ? (
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={Number(precioVentaProductoMap[String(p.id)] ?? p.precio ?? 0)}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                setPrecioProductoVenta(
                                  String(p.id),
                                  toNumberSafe(e.target.value, Number(p.precio ?? 0) || 0),
                                )
                              }
                              className="form-input"
                              style={{ marginTop: 6 }}
                              placeholder="Precio de venta"
                            />
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <InputField
                label="Vendido a (Nombre del receptor) *"
                value={vendidoA}
                onChange={setVendidoA}
                placeholder="Ej: ABC Company, Juan Pérez, Empresa XYZ"
              />
              {productosSeleccionados.length > 0 && precioProductosSeleccionados > 0 && (
                <div className="hint-text">
                  Productos adicionales: {precioProductosSeleccionados.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} por mes
                </div>
              )}
              <InputField
                label="Vendedor"
                value={nombreVendedorActual}
                onChange={() => {}}
                readOnly
              />
              <SelectField
                label="Fuente / Origen"
                value={fuenteOrigen}
                onChange={(v: any) => setFuenteOrigen(String(v ?? ""))}
                className="select-lg"
                options={[
                  { value: "", label: "-- Seleccionar --" },
                  { value: "Redes Sociales", label: "Redes Sociales" },
                  { value: "Propia", label: "Propia" },
                ]}
              />
              <SelectField
                label="Estado de la venta *"
                value={estadoVenta}
                onChange={(v: any) =>
                  setEstadoVenta(v as "Aceptado" | "Rechazado" | "Prospecto")
                }
                className="select-lg"
                options={[
                  { value: "Prospecto", label: "Prospecto" },
                  { value: "Aceptado", label: "Aceptado" },
                  { value: "Rechazado", label: "Rechazado" },
                ]}
              />
              <div className="form-row">
                <InputField
                  label="Fecha de Inicio *"
                  value={fechaInicio}
                  onChange={setFechaInicio}
                  type="date"
                />
                <InputField
                  label="Duración (meses) *"
                  value={mesesRenta || ""}
                  onChange={(v: any) => setMesesRenta(Math.max(0, parseInt(v, 10) || 0))}
                  type="number"
                  min={1}
                />
              </div>
              <InputField
                label="Precio de la venta"
                value={precioGeneral || ""}
                onChange={(v: any) =>
                  {
                    setPrecioGeneralEditadoManualmente(true);
                    setPrecioGeneral((prev) => toNumberSafe(v, prev));
                  }
                }
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                readOnly={soloUnProductoSinPantallas}
              />
              <InputField
                label="Precio de la venta (por mes)"
                value={precioMensualFinal || 0}
                onChange={(v: any) => {
                  if (!precioPorMesEditable) return;
                  const totalMensualIngresado = toNumberSafe(v, precioMensualFinal);
                  setPrecioVentaPorMesOverride(totalMensualIngresado);
                }}
                type="number"
                min={0}
                step={0.01}
                readOnly={!precioPorMesEditable}
              />
              <InputField
                label="Gastos adicionales"
                value={gastosAdicionales || ""}
                onChange={(v: any) =>
                  setGastosAdicionales((prev) => toNumberSafe(v, prev))
                }
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
              />

              {tieneConsideracion && (
                <div className="form-group">
                  <label>Pago a Considerar (por mes)</label>{" "}
                  {/* ← etiqueta actualizada */}
                  <div className="input-prefix">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pagoConsiderar === 0 ? "" : pagoConsiderar}
                      onChange={(e) =>
                        setPagoConsiderar((prev) => toNumberSafe(e.target.value, prev))
                      }
                      placeholder="0.00"
                      className="form-input"
                    />
                  </div>
                  {/* ── Hints ── */}
                  {pagoConsiderar > 0 && mesesRenta > 1 && (
                    <small className="campo-hint hint-neutro">
                      Total pago a considerar ({mesesRenta} meses):{" "}
                      <strong>
                        $
                        {(pagoConsiderar * mesesRenta).toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                        })}
                      </strong>
                    </small>
                  )}
                  {pagoConsiderar > 0 && totalVenta > 0 && (
                    <small
                      className={`campo-hint ${pagoConsiderar * mesesRenta > totalVenta ? "hint-negativo" : "hint-neutro"}`}
                    >
                      {pagoConsiderar * mesesRenta > totalVenta
                        ? "⚠️ El pago a considerar supera el total de la venta"
                        : `Restante : $${(totalVenta - pagoConsiderar * mesesRenta).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
                    </small>
                  )}
                </div>
              )}

              {/* ── COMISIÓN ✅ ── */}
              <InputField
                label="Comisión (%)"
                value={comision || ""}
                onChange={(v: any) =>
                  setComision((prev) => toNumberSafe(v, prev))
                }
                type="number"
                min={0}
                step={0.01}
                placeholder="%"
              />
              {comision > 0 && (
                <div className="hint-text">
                  Comisión total automática: {(comisionMensual * mesesRenta).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
              {/* Campo de costos ocultado por solicitud de flujo */}
              <div className="form-group">
                <label>Notas</label>
                <input
                  type="text"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas internas (opcional)"
                  className="form-input"
                  maxLength={300}
                />
              </div>
              {ventaInicial && usuarioActual.rol === "vendedor" && (
                <InputField
                  label="Código de edición *"
                  value={codigoEdicion}
                  onChange={setCodigoEdicion}
                  placeholder="Ingresa tu código"
                />
              )}
              {tieneComisionPorcentaje && (
                <>{/* bloque comisión porcentaje socio */}</>
              )}
              {fechaInicio &&
                mesesRenta > 0 &&
                (pantallasSeleccionadas.length > 0 || productosSeleccionados.length > 0) && (
                  <ResumenVenta
                    pantallasActuales={pantallasActuales}
                    estadoVenta={estadoVenta}
                    pantallasSeleccionadas={pantallasSeleccionadas}
                    vendidoA={vendidoA}
                    fechaInicio={fechaInicio}
                    fechaFin={fechaFin}
                    mesesRenta={mesesRenta}
                    precioGeneral={precioMensualFinal}
                    porcentajeSocio={porcentajeSocio}
                    montoSocio={montoSocio}
                    aplicarDescuento={
                      tieneComisionPorcentaje && aplicarDescuento
                    }
                    costos={costos}
                    comisionPorcentaje={comision}
                    gastosAdicionales={gastosAdicionales}
                    productoNombre={productosActuales.map((p) => p.nombre).join(", ")}
                    precioProductos={precioProductosSeleccionados}
                    pagoConsiderar={pagoConsiderar}
                    tipoComision={clienteActual?.tipoComision}
                  />
                )}
            </>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}
        {exito && <div className="success-message">{exito}</div>}

        <BotonAccion
          onClick={() => void handleRegistrarVenta()}
          variante="primario"
          fullWidth
        >
          {ventaInicial ? "Guardar cambios" : "Registrar Venta"}
        </BotonAccion>

        <BotonAccion
          onClick={() => {
            resetFormularioVenta();
            onCerrar();
          }}
          variante="secundario"
          fullWidth
        >
          Cancelar
        </BotonAccion>
      </div>
    </div>
  );
};
