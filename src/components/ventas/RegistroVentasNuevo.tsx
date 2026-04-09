// src/components/ventas/RegistroVentasNuevo.tsx
import React, { useState } from "react";
import {
  RegistroVenta,
  Pantalla,
  Producto,
  AsignacionPantalla,
  Colaborador,
  Usuario,
  AsignacionProductoExtra,
  ConfiguracionEmpresa,
} from "../../types";
import "./RegistroVentasNuevo.css";
import { RegistroVentasLista } from "./components/RegistroVentaListas";
import { RegistroVentaModal } from "./components/RegistroVentaModal";

interface RegistroVentasNuevoProps {
  pantallas: Pantalla[];
  productos: Producto[];
  asignaciones: AsignacionPantalla[];
  asignacionProductos: AsignacionProductoExtra[];
  clientes: Colaborador[];
  ventasRegistradas: RegistroVenta[];
  usuarios: Usuario[];
  usuarioActual: Usuario;
  configEmpresa?: ConfiguracionEmpresa;
  onRegistrarVenta: (venta: RegistroVenta) => Promise<void> | void;
  onActualizarVenta: (venta: RegistroVenta) => Promise<void> | void;
  onEliminarVenta: (ventaId: string) => void;
  errorExterno: string | null;
}

export const RegistroVentasNuevo: React.FC<RegistroVentasNuevoProps> = ({
  pantallas,
  asignaciones,
  asignacionProductos,
  clientes,
  usuarios,
  productos,
  ventasRegistradas,
  usuarioActual,
  configEmpresa,
  onRegistrarVenta,
  onActualizarVenta,
  onEliminarVenta,
  errorExterno,
}) => {
  const [mostrarModalVenta, setMostrarModalVenta] = useState(false);
  const [ventaEditando, setVentaEditando] = useState<RegistroVenta | null>(
    null,
  );
  const [modalVentaKey, setModalVentaKey] = useState(0);

  const handleNuevaVenta = () => {
    setVentaEditando(null);
    setModalVentaKey((k) => k + 1);
    setMostrarModalVenta(true);
  };

  const handleCerrarModal = () => {
    setMostrarModalVenta(false);
    setVentaEditando(null);
  };

  return (
    <div className="registro-ventas-nuevo">
      {errorExterno && <div className="error-message">{errorExterno}</div>}

      <RegistroVentasLista
        pantallas={pantallas}
        asignaciones={asignaciones}
        colaboradores={clientes}
        usuarios={usuarios}
        ventasRegistradas={ventasRegistradas}
        esAdmin={usuarioActual.rol === "admin"}
        onEliminarVenta={onEliminarVenta}
        onNuevaVenta={handleNuevaVenta}
        onEditarVenta={(venta) => {
          setVentaEditando(venta);
          setMostrarModalVenta(true);
        }}
      />

      {mostrarModalVenta && (
        <RegistroVentaModal
          key={ventaEditando?.id ?? `nueva-${modalVentaKey}`}
          pantallas={pantallas}
          asignaciones={asignaciones}
          clientes={clientes}
          usuarioActual={usuarioActual}
          productos={productos}
          asignacionesProductos={asignacionProductos}
          onRegistrarVenta={onRegistrarVenta}
          onActualizarVenta={onActualizarVenta}
          onCerrar={handleCerrarModal}
          ventaInicial={ventaEditando}
          usuarios={usuarios}
          permitePrecioPorDia={Boolean(configEmpresa?.habilitarPrecioPorDia)}
          tarifasDiasConfig={configEmpresa?.tarifasDias}
        />
      )}
    </div>
  );
};
