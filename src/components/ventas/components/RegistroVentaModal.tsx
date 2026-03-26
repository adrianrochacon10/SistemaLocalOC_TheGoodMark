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
  onRegistrarVenta: (venta: RegistroVenta) => void;
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
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>(
    ventaInicial?.productoId ?? "",
  );
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
    ventaInicial ? (ventaInicial.comision ?? 0) / mesesIniciales : 0,
  );
  const [pagoConsiderar, setPagoConsiderar] = useState<number>(
    ventaInicial?.pagoConsiderar ?? 0,
  ); // ← nuevo
  const [notas, setNotas] = useState<string>(ventaInicial?.notas ?? "");
  const [codigoEdicion, setCodigoEdicion] = useState<string>("");

  const [error, setError] = useState<string>("");
  const [exito, setExito] = useState<string>("");

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

  const opcionesProductos = useMemo(
    () => [
      { value: "", label: "Sin producto" },
      ...productosDelCliente.map((p) => ({
        value: p.id,
        label: p.nombre,
      })),
    ],
    [productosDelCliente],
  );

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
  const productoActual = productosDelCliente.find(
    (p) => String(p.id) === String(productoSeleccionado),
  );
  const precioProductoSeleccionado = Number(productoActual?.precio ?? 0) || 0;
  const precioMensualFinal = Number(precioGeneral || 0) + precioProductoSeleccionado;
  const tieneComisionPorcentaje = clienteActual?.tipoComision === "porcentaje";
  const tieneConsideracion = clienteActual?.tipoComision === "consideracion";
  const pantallasActuales = pantallasSeleccionadas
    .map((id) => pantallasCatalogo.find((p) => String(p.id) === String(id)))
    .filter(Boolean) as Pantalla[];
  const fechaFin = calcularFechaFin(fechaInicio, mesesRenta);
  const totalVenta = precioMensualFinal * mesesRenta;
  const costosTotales = costos * mesesRenta;
  const comisionTotal = comision * mesesRenta;

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
      setProductoSeleccionado("");
      return;
    }
    if (
      productoSeleccionado &&
      productosDelCliente.some((p) => p.id === productoSeleccionado)
    ) {
      return;
    }
    setProductoSeleccionado("");
  }, [clienteSeleccionado, productoSeleccionado, productosDelCliente]);

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
    setProductoSeleccionado("");
    setEstadoVenta("Prospecto");
    setAplicarDescuento(false);
    setCostos(0);
    setError("");
    setExito("");
    setComision(0);
    setPagoConsiderar(0);
    setNotas("");
    setCodigoEdicion("");
  };

  // ── Registrar ─────────────────────────────────────────────────────────
  const handleRegistrarVenta = async () => {
    setError("");
    setExito("");
    if (!clienteSeleccionado) {
      setError("Selecciona un cliente");
      return;
    }
    if (itemsVenta.length === 0) {
      setError("Selecciona al menos una pantalla");
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
    if (precioGeneral <= 0) {
      setError("El precio base debe ser mayor a 0");
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
      productoId: productoSeleccionado || undefined,
      productoNombre: productoActual?.nombre ?? undefined,
      productoPrecioMensual: precioProductoSeleccionado || 0,
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
      comision: comisionTotal,
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
        onRegistrarVenta(nuevaVenta);
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

          {pantallasDelCliente.length > 0 && (
            <>
              <SelectorPantallas
                pantallasDelCliente={pantallasDelCliente}
                pantallasSeleccionadas={pantallasSeleccionadas}
                pantallas={pantallasCatalogo}
                onToggle={togglePantalla}
              />
              <InputField
                label="Vendido a (Nombre del receptor) *"
                value={vendidoA}
                onChange={setVendidoA}
                placeholder="Ej: ABC Company, Juan Pérez, Empresa XYZ"
              />
              <SelectField
                label="Producto"
                value={productoSeleccionado}
                onChange={(v: any) => {
                  const id = String(v ?? "");
                  setProductoSeleccionado(id);
                  const prod = productosDelCliente.find((p) => p.id === id);
                  if (prod && precioGeneral <= 0 && Number(prod.precio) > 0) {
                    setPrecioGeneral(Number(prod.precio));
                  }
                }}
                placeholder={
                  "-- Seleccionar producto (opcional) --"
                }
                className="select-lg"
                options={opcionesProductos}
              />
              {productoSeleccionado && precioProductoSeleccionado > 0 && (
                <div className="hint-text">
                  Se suma producto: {precioProductoSeleccionado.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} por mes
                </div>
              )}
              <InputField
                label="Vendedor"
                value={nombreVendedorActual}
                onChange={() => {}}
                readOnly
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
                  onChange={(v: any) =>
                    setMesesRenta(v === "" ? 0 : parseInt(v) || 0)
                  }
                  type="number"
                  min={1}
                />
              </div>
              <InputField
                label="Precio Base por Mes *"
                value={precioGeneral || ""}
                onChange={(v: any) =>
                  setPrecioGeneral(v === "" ? 0 : parseFloat(v) || 0)
                }
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
              />
              {precioProductoSeleccionado > 0 && (
                <div className="hint-text">
                  Total mensual (base + producto): {precioMensualFinal.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              )}
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
                        setPagoConsiderar(parseFloat(e.target.value) || 0)
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
                label="Comisión (por mes)"
                value={comision || ""}
                onChange={(v: any) =>
                  setComision(v === "" ? 0 : parseFloat(v) || 0)
                }
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
              />
              {/* ── COSTOS ── */}
              <div className="form-group">
                <label>Costos de la venta (por mes)</label>
                <div className="input-prefix">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costos === 0 ? "" : costos}
                    onChange={(e) => setCostos(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="form-input"
                  />
                </div>
              </div>
              {tieneComisionPorcentaje && (
                <>{/* bloque comisión porcentaje socio */}</>
              )}
              {fechaInicio &&
                mesesRenta > 0 &&
                pantallasSeleccionadas.length > 0 && (
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
                    comision={comision}
                    pagoConsiderar={pagoConsiderar}
                    tipoComision={clienteActual?.tipoComision}
                  />
                )}
            </>
          )}

          {clienteSeleccionado && pantallasDelCliente.length === 0 && (
            <div className="error-message">
              Este cliente no tiene pantallas asignadas. Asigna pantallas desde
              la sección de Gestión.
            </div>
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
