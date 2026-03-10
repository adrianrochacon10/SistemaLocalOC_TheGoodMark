// src/components/ventas/RegistroVentaModal.tsx
import React, { useState, useEffect } from "react";
import {
  RegistroVenta,
  Pantalla,
  AsignacionPantalla,
  Colaborador,
  Usuario,
  ItemVenta,
} from "../../../types";
import { calcularFechaFin, stringAFecha } from "../../../utils/formateoFecha";
import { SelectField } from "../../ui/SelectField";
import { SelectorPantallas } from "./SelectorPantallas";
import { InputField } from "../../ui/InputField";
import { ResumenVenta } from "./ResumenVenta";
import { BotonAccion } from "../../ui/BotonAccion";

interface RegistroVentaModalProps {
  pantallas: Pantalla[];
  asignaciones: AsignacionPantalla[];
  clientes: Colaborador[];
  usuarioActual: Usuario;
  onRegistrarVenta: (venta: RegistroVenta) => void;
  onCerrar: () => void;
  ventaInicial: RegistroVenta | null;
}

export const RegistroVentaModal: React.FC<RegistroVentaModalProps> = ({
  pantallas,
  asignaciones,
  clientes,
  usuarioActual,
  onRegistrarVenta,
  onCerrar,
  ventaInicial,
}) => {
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>(
    ventaInicial?.clienteId ?? "",
  );
  const [itemsVenta, setItemsVenta] = useState<ItemVenta[]>(
    ventaInicial?.itemsVenta ?? [],
  );
  const pantallasSeleccionadas = itemsVenta.map((i) => i.pantallaId);

  const [fechaInicio, setFechaInicio] = useState<string>(
    ventaInicial ? ventaInicial.fechaInicio.toISOString().slice(0, 10) : "",
  );
  const [mesesRenta, setMesesRenta] = useState<number>(
    ventaInicial?.mesesRenta ?? 1,
  );
  const [vendidoA, setVendidoA] = useState<string>(
    ventaInicial?.vendidoA ?? "",
  );
  const [precioGeneral, setPrecioGeneral] = useState<number>(
    ventaInicial?.precioGeneral ?? 0,
  );
  const [porcentajeSocio, setPorcentajeSocio] = useState<number>(30);
  const [montoSocio, setMontoSocio] = useState<number>(0);
  const [aplicarDescuento, setAplicarDescuento] = useState<boolean>(false);
  const [estadoVenta, setEstadoVenta] = useState<
    "Aceptado" | "Rechazado" | "Prospecto"
  >(ventaInicial?.estadoVenta ?? "Prospecto");
  const [error, setError] = useState<string>("");
  const [exito, setExito] = useState<string>("");

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

  const pantallasDelCliente = asignaciones.filter(
    (a) => a.clienteId === clienteSeleccionado && a.activa,
  );
  const clienteActual = clientes.find((c) => c.id === clienteSeleccionado);
  const tieneComisionPorcentaje = clienteActual?.tipoComision === "porcentaje";

  const pantallasActuales = pantallasSeleccionadas
    .map((id) => pantallas.find((p) => p.id === id))
    .filter((p) => p !== undefined) as Pantalla[];

  const fechaFin = calcularFechaFin(fechaInicio, mesesRenta);

  useEffect(() => {
    if (clienteActual && typeof clienteActual.porcentajeSocio === "number") {
      setPorcentajeSocio(clienteActual.porcentajeSocio);
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
  }, [precioGeneral, porcentajeSocio, clienteActual]);

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
    setItemsVenta([]);
    setVendidoA("");
    setFechaInicio("");
    setMesesRenta(1);
    setPrecioGeneral(0);
    setEstadoVenta("Prospecto");
    setAplicarDescuento(false);
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
      id: ventaInicial?.id ?? "v" + Date.now(),
      pantallasIds: itemsVenta.map((i) => i.pantallaId),
      itemsVenta,
      clienteId: clienteSeleccionado,
      vendidoA: vendidoA.trim(),
      precioGeneral: precioGeneral * mesesRenta,
      cantidad: 1,
      precioTotal: precioGeneral * mesesRenta,
      importeTotal:
        tieneComisionPorcentaje && aplicarDescuento
          ? montoSocio
          : precioGeneral * mesesRenta,
      fechaRegistro: ventaInicial?.fechaRegistro ?? new Date(),
      fechaInicio: stringAFecha(fechaInicio),
      fechaFin: stringAFecha(fechaFin),
      mesesRenta,
      activo: true,
      usuarioRegistroId: usuarioActual.id,
      estadoVenta,
    };

    onRegistrarVenta(nuevaVenta);
    setExito("Venta registrada correctamente");
    resetFormularioVenta();
    setTimeout(() => setExito(""), 2000);
    onCerrar();
  };

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
          Registrar Venta/Renta
        </h3>

        <div className="formulario-section">
          <SelectField
            label="Colaborador *"
            value={clienteSeleccionado}
            onChange={(v:any) => {
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
                onChange={(v:any) =>
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
                  onChange={(v:any) =>
                    setMesesRenta(v === "" ? 0 : parseInt(v) || 0)
                  }
                  type="number"
                  min={1}
                />
              </div>

              <InputField
                label="Precio Por Mes *"
                value={precioGeneral || ""}
                onChange={(v:any) =>
                  setPrecioGeneral(v === "" ? 0 : parseInt(v) || 0)
                }
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
              />

              {tieneComisionPorcentaje && (
                <>
                  {/* bloque comisión, igual que el tuyo */}
                  {/* ... si quieres luego lo sacamos a otro componente */}
                </>
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
                    precioGeneral={precioGeneral}
                    porcentajeSocio={porcentajeSocio}
                    montoSocio={montoSocio}
                    aplicarDescuento={
                      tieneComisionPorcentaje && aplicarDescuento
                    }
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
          onClick={handleRegistrarVenta}
          variante="primario"
          fullWidth
        >
          Registrar Venta
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
