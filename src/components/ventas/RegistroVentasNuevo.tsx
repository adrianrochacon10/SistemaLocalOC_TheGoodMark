import React, { useState } from "react";
import {
  RegistroVenta,
  Pantalla,
  AsignacionPantalla,
  Colaborador,
  Usuario,
  ItemVenta,
} from "../../types";
import "./RegistroVentasNuevo.css";
import { calcularFechaFin, stringAFecha } from "../../utils/formateoFecha";
import { VentaCard } from "./components/VentaCard";
import { FiltrosVentas } from "./components/filtrosVentas";
import { InputField } from "../ui/InputField";
import { SelectField } from "../ui/SelectField";
import { BotonAccion } from "../ui/BotonAccion";
import { ResumenVenta } from "./components/ResumenVenta";
import { SelectorPantallas } from "./components/SelectorPantallas";
import { EstadisticasVentas } from "./components/EstadisticasVenta";

interface RegistroVentasNuevoProps {
  pantallas: Pantalla[];
  asignaciones: AsignacionPantalla[];
  clientes: Colaborador[];
  productos: { id: string; nombre: string; precio: number }[];
  tiposPago: { id: string; nombre: string }[];
  ventasRegistradas: RegistroVenta[];
  usuarioActual: Usuario;
  onRegistrarVenta: (venta: RegistroVenta) => void;
  onEliminarVenta: (ventaId: string) => void;
  errorExterno?: string | null;
}

export const RegistroVentasNuevo: React.FC<RegistroVentasNuevoProps> = ({
  asignaciones,
  clientes,
  productos,
  tiposPago,
  ventasRegistradas,
  usuarioActual,
  onRegistrarVenta,
  onEliminarVenta,
  pantallas,
  errorExterno,
}) => {
  // ─── 1. ESTADOS ──────────────────────────────────────────
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>("");
  const [itemsVenta, setItemsVenta] = useState<ItemVenta[]>([]);
  const pantallasSeleccionadas = itemsVenta.map((i) => i.pantallaId); // ✅ derivado

  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [mesesRenta, setMesesRenta] = useState<number>(1);
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);
  const [vendidoA, setVendidoA] = useState<string>("");
  const [productoId, setProductoId] = useState<string>("");
  const [cantidad, setCantidad] = useState<number>(1);
  const [precioUnitarioManual, setPrecioUnitarioManual] = useState<number>(0); // ✅ renombrado
  const [tipoPagoId, setTipoPagoId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [exito, setExito] = useState<string>("");
  const [mostrarModalVenta, setMostrarModalVenta] = useState(false);
  const [busquedaVenta, setBusquedaVenta] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const [estadoVenta, setEstadoVenta] = useState<
    "Aceptado" | "Rechazado" | "Prospecto"
  >("Prospecto");
  const [filtroEstado, setFiltroEstado] = useState<string>("Todos");
  const [filtroCliente, setFiltroCliente] = useState<string>("Todos");
  const [ventaEditando, setVentaEditando] = useState<RegistroVenta | null>(
    null,
  );

  const ventasPorPagina = 20;

  // ─── 2. VARIABLES DERIVADAS ──────────────────────────────
  // ✅ añoActual y mesActual definidos aquí
  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const añoActual = hoy.getFullYear();

  const opcionesClientes = clientes
    .filter(
      (c) =>
        c.activo && asignaciones.some((a) => a.clienteId === c.id && a.activa),
    )
    .map((c) => {
      const num = asignaciones.filter(
        (a) => a.clienteId === c.id && a.activa,
      ).length;
      return {
        value: c.id,
        label: `${c.nombre} (${num} pantalla${num !== 1 ? "s" : ""})`,
      };
    });

  const ventasFiltradas = ventasRegistradas.filter((venta) => {
    const cliente = clientes.find((c) => c.id === venta.clienteId);
    const coincideBusqueda =
      busquedaVenta === "" ||
      (cliente &&
        cliente.nombre.toLowerCase().includes(busquedaVenta.toLowerCase())) ||
      venta.vendidoA.toLowerCase().includes(busquedaVenta.toLowerCase());
    const coincideEstado =
      filtroEstado === "Todos" || venta.estadoVenta === filtroEstado;
    const coincideCliente =
      filtroCliente === "Todos" || venta.clienteId === filtroCliente;
    return coincideBusqueda && coincideEstado && coincideCliente;
  });

  const totalPaginas = Math.ceil(ventasFiltradas.length / ventasPorPagina);
  const ventasPagina = ventasFiltradas.slice(
    (paginaActual - 1) * ventasPorPagina,
    paginaActual * ventasPorPagina,
  );

  const pantallasDelCliente = asignaciones.filter(
    (a) => a.clienteId === clienteSeleccionado && a.activa,
  );

  const clienteActual = clientes.find((c) => c.id === clienteSeleccionado);

  const pantallasActuales = pantallasSeleccionadas
    .map((id) => pantallas.find((p) => p.id === id))
    .filter((p) => p !== undefined) as Pantalla[];

  const fechaFin = calcularFechaFin(fechaInicio, mesesRenta);

  const productoSeleccionado = productos.find((p) => p.id === productoId);
  const precioUnitario =
    productoId && productoSeleccionado
      ? productoSeleccionado.precio
      : precioUnitarioManual;
  const precioBase = cantidad * precioUnitario;

  // ─── 3. EFECTOS ──────────────────────────────────────────
  React.useEffect(() => {
    if (!clienteSeleccionado || tiposPago.length === 0) return;
    // ✅ paréntesis para evitar mezcla de || y ??
    const id =
      clienteActual?.tipoPagoId &&
      tiposPago.some((t) => t.id === clienteActual.tipoPagoId)
        ? (clienteActual.tipoPagoId ?? tiposPago[0].id)
        : tiposPago[0].id;
    setTipoPagoId(id);
  }, [clienteSeleccionado, clienteActual?.tipoPagoId, tiposPago]);

  // ─── 4. HANDLERS ─────────────────────────────────────────
  const togglePantalla = (pantallaId: string) => {
    const yaSeleccionada = itemsVenta.some((i) => i.pantallaId === pantallaId);
    if (yaSeleccionada) {
      setItemsVenta((prev) => prev.filter((i) => i.pantallaId !== pantallaId));
    } else {
      setItemsVenta((prev) => [...prev, { pantallaId, sinDescuento: false }]);
    }
  };

  const resetFormularioVenta = () => {
    setClienteSeleccionado("");
    setItemsVenta([]); // ✅ limpia pantallasSeleccionadas también (es derivado)
    setVendidoA("");
    setFechaInicio("");
    setMesesRenta(1);
    setPrecioUnitarioManual(0); // ✅ correcto
    setProductoId("");
    setCantidad(1);
    setTipoPagoId("");
    setEstadoVenta("Prospecto");
    setError("");
    setExito("");
  };

  const handleRegistrarVenta = () => {
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
    if (!fechaInicio) {
      setError("Selecciona una fecha de inicio");
      return;
    }
    if (mesesRenta < 1) {
      setError("La duración debe ser al menos 1 mes");
      return;
    }
    if (!productoId && precioUnitarioManual <= 0) {
      setError("Selecciona un producto o ingresa el precio");
      return;
    }

    const nuevaVenta: RegistroVenta = {
      id: "v" + Date.now(),
      pantallasIds: itemsVenta.map((i) => i.pantallaId),
      itemsVenta,
      clienteId: clienteSeleccionado,
      productoId: productoId || undefined,
      vendidoA: vendidoA.trim() || (clienteActual?.nombre ?? "-"), // ✅ paréntesis
      precioGeneral:
        precioUnitarioManual || (productoSeleccionado?.precio ?? 0),
      cantidad,
      precioTotal: precioBase,
      importeTotal: precioBase,
      fechaRegistro: new Date(),
      fechaInicio: stringAFecha(fechaInicio),
      fechaFin: stringAFecha(fechaFin),
      mesesRenta,
      activo: true,
      usuarioRegistroId: usuarioActual.id,
      estadoVenta,
      tipoPagoId: tipoPagoId || undefined,
    };

    onRegistrarVenta(nuevaVenta);
    setExito("Venta registrada correctamente");
    resetFormularioVenta(); // ✅ un solo reset limpia todo
    setTimeout(() => setExito(""), 3000);
  };

  // ─── 5. JSX ──────────────────────────────────────────────
  return (
    <div className="registro-ventas-nuevo">
      <div>{errorExterno && <span>{errorExterno}</span>}</div>

      <FiltrosVentas
        busquedaVenta={busquedaVenta}
        filtroEstado={filtroEstado}
        filtroCliente={filtroCliente}
        clientes={clientes}
        asignaciones={asignaciones}
        onBusqueda={(v) => {
          setBusquedaVenta(v);
          setPaginaActual(1);
        }}
        onFiltroEstado={(v) => {
          setFiltroEstado(v);
          setPaginaActual(1);
        }}
        onFiltroCliente={(v) => {
          setFiltroCliente(v);
          setPaginaActual(1);
        }}
        onNuevaVenta={() => setMostrarModalVenta(true)}
      />

      <h2>
        📅 Registros de{" "}
        {new Date(añoActual, mesActual).toLocaleString("es-ES", {
          month: "long",
        })}{" "}
        de {añoActual}
      </h2>

      <EstadisticasVentas ventasFiltradas={ventasFiltradas} />

      <div className="ventas-list ventas-compacta">
        {ventasPagina.map((venta) => (
          <VentaCard
            key={venta.id}
            venta={venta}
            clientes={clientes}
            pantallas={pantallas}
            onEditar={(v) => {
              setVentaEditando(v);
              setMostrarModalEditar(true);
            }}
            onEliminar={onEliminarVenta}
          />
        ))}
      </div>

      <div className="paginacion-ventas">
        <button
          disabled={paginaActual === 1}
          onClick={() => setPaginaActual(paginaActual - 1)}
        >
          ◀
        </button>
        <span>
          Página {paginaActual} de {totalPaginas}
        </span>
        <button
          disabled={paginaActual === totalPaginas}
          onClick={() => setPaginaActual(paginaActual + 1)}
        >
          ▶
        </button>
      </div>

      {/* ─── MODAL REGISTRO VENTA ──────────────────────────── */}
      {mostrarModalVenta && (
        <div
          className="modal-overlay"
          onClick={() => {
            setMostrarModalVenta(false);
            resetFormularioVenta();
          }}
        >
          <div className="modal-contenido" onClick={(e) => e.stopPropagation()}>
            <h3
              style={{
                margin: "0 0 20px 0",
                paddingBottom: "12px",
                borderBottom: "2px solid #e2e8f0",
              }}
            >
              Registrar Venta/Renta
            </h3>

            <div className="formulario-section">
              <SelectField
                label="Colaborador *"
                value={clienteSeleccionado}
                onChange={(v) => {
                  setClienteSeleccionado(v);
                  setItemsVenta([]);
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
                    pantallas={pantallas}
                    onToggle={togglePantalla}
                  />

                  <InputField
                    label="Vendido a (Nombre del receptor)"
                    value={vendidoA}
                    onChange={setVendidoA}
                    placeholder="Ej: ABC Company, Juan Pérez (opcional)"
                  />

                  <SelectField
                    label="Producto"
                    value={productoId}
                    onChange={(v) => {
                      setProductoId(v);
                      if (v) setPrecioUnitarioManual(0);
                    }}
                    placeholder="-- Sin producto (ingresar precio) --"
                    className="select-lg"
                    options={[
                      {
                        value: "",
                        label: "-- Sin producto (ingresar precio) --",
                      },
                      ...productos.map((p) => ({
                        value: p.id,
                        label: `${p.nombre} - $${p.precio.toFixed(2)}`,
                      })),
                    ]}
                  />

                  {!productoId && (
                    <InputField
                      label="Precio *"
                      value={precioUnitarioManual || ""}
                      onChange={(v) =>
                        setPrecioUnitarioManual(
                          v === "" ? 0 : parseFloat(v) || 0,
                        )
                      }
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                    />
                  )}

                  <InputField
                    label="Cantidad *"
                    value={cantidad || ""}
                    onChange={(v) =>
                      setCantidad(v === "" ? 1 : Math.max(1, parseInt(v) || 1))
                    }
                    type="number"
                    min={1}
                  />

                  <SelectField
                    label="Tipo de pago"
                    value={tipoPagoId}
                    onChange={setTipoPagoId}
                    placeholder="-- Seleccionar --"
                    className="select-lg"
                    options={tiposPago.map((t) => ({
                      value: t.id,
                      label: t.nombre,
                    }))}
                  />

                  <SelectField
                    label="Estado de la venta *"
                    value={estadoVenta}
                    onChange={(v) =>
                      setEstadoVenta(
                        v as "Aceptado" | "Rechazado" | "Prospecto",
                      )
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
                      onChange={(v) =>
                        setMesesRenta(v === "" ? 0 : parseInt(v) || 0)
                      }
                      type="number"
                      min={1}
                    />
                  </div>

                  {fechaInicio &&
                    mesesRenta > 0 &&
                    pantallasSeleccionadas.length > 0 &&
                    (productoId || precioUnitarioManual > 0) && (
                      <ResumenVenta
                        pantallasActuales={pantallasActuales}
                        estadoVenta={estadoVenta}
                        pantallasSeleccionadas={pantallasSeleccionadas}
                        vendidoA={vendidoA}
                        fechaInicio={fechaInicio}
                        fechaFin={fechaFin}
                        mesesRenta={mesesRenta}
                        cantidad={cantidad}
                        precioUnitario={precioUnitario}
                        precioTotal={precioBase}
                        tipoPagoNombre={
                          tiposPago.find((t) => t.id === tipoPagoId)?.nombre ??
                          ""
                        }
                      />
                    )}
                </>
              )}

              {clienteSeleccionado && pantallasDelCliente.length === 0 && (
                <div className="error-message">
                  Este cliente no tiene pantallas asignadas. Asigna pantallas
                  desde la sección de Gestión.
                </div>
              )}
            </div>

            {error && <div className="error-message">{error}</div>}
            {errorExterno && (
              <div className="error-message">{errorExterno}</div>
            )}
            {exito && <div className="success-message">{exito}</div>}

            <BotonAccion
              onClick={handleRegistrarVenta}
              variante="primario"
              fullWidth
            >
              Registrar Venta
            </BotonAccion>

            <BotonAccion
              onClick={() => {
                setMostrarModalVenta(false);
                resetFormularioVenta();
              }}
              variante="secundario"
              fullWidth
            >
              Cancelar
            </BotonAccion>
          </div>
        </div>
      )}
    </div>
  );
};
