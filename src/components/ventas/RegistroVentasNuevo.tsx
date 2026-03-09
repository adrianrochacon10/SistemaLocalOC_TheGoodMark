import React, { useState } from "react";
import {
  RegistroVenta,
  Pantalla,
  AsignacionPantalla,
  Cliente,
  Usuario,
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
  clientes: Cliente[];
  ventasRegistradas: RegistroVenta[];
  usuarioActual: Usuario;
  onRegistrarVenta: (venta: RegistroVenta) => void;
  onEliminarVenta: (ventaId: string) => void;
  errorExterno: string | null;
}

export const RegistroVentasNuevo: React.FC<RegistroVentasNuevoProps> = ({
  asignaciones,
  clientes,
  ventasRegistradas,
  usuarioActual,
  onRegistrarVenta,
  onEliminarVenta,
  pantallas,
  errorExterno,
}) => {
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>("");
  const [pantallasSeleccionadas, setPantallasSeleccionadas] = useState<
    string[]
  >([]);

  //Fechas
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [mesesRenta, setMesesRenta] = useState<number>(1);

  //Para mostrar el modal de edicion de cards
  const [mostrarModalEditar, setMostrarModalEditar] = useState(false);

  const [vendidoA, setVendidoA] = useState<string>("");
  const [precioGeneral, setPrecioGeneral] = useState<number>(0);
  const [porcentajeSocio, setPorcentajeSocio] = useState<number>(30); // Por defecto 30%
  const [montoSocio, setMontoSocio] = useState<number>(0);
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

  // Obtener pantallas asignadas al cliente seleccionado
  const pantallasDelCliente = asignaciones.filter(
    (a) => a.clienteId === clienteSeleccionado && a.activa,
  );

  // Obtener el cliente
  const clienteActual = clientes.find((c) => c.id === clienteSeleccionado);

  // Obtener información de las pantallas seleccionadas
  const pantallasActuales = pantallasSeleccionadas
    .map((id) => pantallas.find((p) => p.id === id))
    .filter((p) => p !== undefined) as Pantalla[];

  //Calcular fechas
  const fechaFin = calcularFechaFin(fechaInicio, mesesRenta);

  // Calcular monto del socio en tiempo real
  React.useEffect(() => {
    const precioMes = precioGeneral;
    if (clienteActual && typeof clienteActual.porcentajeSocio === "number") {
      setPorcentajeSocio(clienteActual.porcentajeSocio);
      setMontoSocio(
        Math.round(((precioMes * clienteActual.porcentajeSocio) / 100) * 100) /
          100,
      );
    } else {
      setMontoSocio(
        Math.round(((precioMes * porcentajeSocio) / 100) * 100) / 100,
      );
    }
  }, [precioGeneral, porcentajeSocio, clienteActual]);

  // Validar y registrar venta
  const handleRegistrarVenta = () => {
    setError("");
    setExito("");

    if (!clienteSeleccionado) {
      setError("Selecciona un cliente");
      return;
    }
    if (pantallasSeleccionadas.length === 0) {
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
      setError("El precio debe ser mayor a 0");
      return;
    }

    const nuevaVenta: RegistroVenta = {
      id: "v" + Date.now(),
      pantallasIds: pantallasSeleccionadas,
      clienteId: clienteSeleccionado,
      vendidoA: vendidoA.trim(),
      precioGeneral: precioGeneral * mesesRenta,
      importeTotal: montoSocio,
      fechaRegistro: new Date(),
      fechaInicio: stringAFecha(fechaInicio),
      fechaFin: stringAFecha(fechaFin),
      mesesRenta,
      activo: true,
      usuarioRegistroId: usuarioActual.id,
      estadoVenta,
    };

    onRegistrarVenta(nuevaVenta);
    setExito("Venta registrada correctamente");
    setClienteSeleccionado("");
    setPantallasSeleccionadas([]);
    setVendidoA("");
    setFechaInicio("");
    setMesesRenta(1);
    setPrecioGeneral(0);

    setTimeout(() => setExito(""), 3000);
  };

  // Manejar selección múltiple de pantallas
  const togglePantalla = (pantallaId: string) => {
    setPantallasSeleccionadas((prev) =>
      prev.includes(pantallaId)
        ? prev.filter((id) => id !== pantallaId)
        : [...prev, pantallaId],
    );
  };

  // Obtener ventas del mes actual
  const hoy = new Date();
  const mesActual = hoy.getMonth();
  const añoActual = hoy.getFullYear();

  return (
    <div className="registro-ventas-nuevo">
      <div>{errorExterno && <p>{errorExterno}</p>}</div>
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
      {/* MODAL REGISTRO VENTA */}
      {mostrarModalVenta && (
        <div
          className="modal-overlay"
          onClick={() => setMostrarModalVenta(false)}
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
                  setPantallasSeleccionadas([]);
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
                    label="Vendido a (Nombre del receptor) *"
                    value={vendidoA}
                    onChange={setVendidoA}
                    placeholder="Ej: ABC Company, Juan Pérez, Empresa XYZ"
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

                  <InputField
                    label="Precio Por Mes *"
                    value={precioGeneral || ""}
                    onChange={(v) =>
                      setPrecioGeneral(v === "" ? 0 : parseInt(v) || 0)
                    }
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                  />

                  <InputField
                    label="Porcentaje para socio/dueño (%)"
                    value={porcentajeSocio}
                    type="number"
                    readOnly
                  />

                  <InputField
                    label="Monto para socio/dueño"
                    value={montoSocio}
                    type="number"
                    readOnly
                  />

                  {/* RESUMEN DE LA VENTA */}
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
                        precioGeneral={precioGeneral}
                        porcentajeSocio={porcentajeSocio}
                        montoSocio={montoSocio}
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
            {exito && <div className="success-message">{exito}</div>}

            <BotonAccion
              onClick={handleRegistrarVenta}
              variante="primario"
              fullWidth
            >
              Registrar Venta
            </BotonAccion>

            <BotonAccion
              onClick={() => setMostrarModalVenta(false)}
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
