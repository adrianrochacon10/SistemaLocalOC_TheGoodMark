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
} from "../../types";
import "./RegistroVentasNuevo.css";
import { RegistroVentasLista } from "./components/RegistroVentaListas";
import { RegistroVentaModal } from "./components/RegistroVentaModal";
import { VentasGraficas } from "./components/VentaGrafica";

interface RegistroVentasNuevoProps {
  pantallas: Pantalla[];
  productos: Producto[];
  asignaciones: AsignacionPantalla[];
  asignacionProductos: AsignacionProductoExtra[];
  clientes: Colaborador[];
  ventasRegistradas: RegistroVenta[];
  usuarios: Usuario[];
  usuarioActual: Usuario;
  onRegistrarVenta: (venta: RegistroVenta) => void;
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
  onRegistrarVenta,
  onActualizarVenta,
  onEliminarVenta,
  errorExterno,
}) => {
  const [mostrarModalVenta, setMostrarModalVenta] = useState(false);
  const [ventaEditando, setVentaEditando] = useState<RegistroVenta | null>(
    null,
  );

  const handleNuevaVenta = () => {
    setVentaEditando(null);
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
        onEliminarVenta={onEliminarVenta}
        onNuevaVenta={handleNuevaVenta}
        onEditarVenta={(venta) => {
          setVentaEditando(venta);
          setMostrarModalVenta(true);
        }}
      />

      <VentasGraficas ventasRegistradas={ventasRegistradas} />

      {mostrarModalVenta && (
        <RegistroVentaModal
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
        />
      )}
    </div>
  );
};
