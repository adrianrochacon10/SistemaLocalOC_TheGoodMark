// src/components/ventas/RegistroVentasNuevo.tsx
import React, { useState } from "react";
import {
  RegistroVenta,
  Pantalla,
  AsignacionPantalla,
  Colaborador,
  Usuario,
} from "../../types";
import "./RegistroVentasNuevo.css";
import { RegistroVentasLista } from "./components/RegistroVentaListas";
import { RegistroVentaModal } from "./components/RegistroVentaModal";

interface RegistroVentasNuevoProps {
  pantallas: Pantalla[];
  asignaciones: AsignacionPantalla[];
  clientes: Colaborador[];
  ventasRegistradas: RegistroVenta[];
  usuarioActual: Usuario;
  onRegistrarVenta: (venta: RegistroVenta) => void;
  onEliminarVenta: (ventaId: string) => void;
  errorExterno: string | null;
}

export const RegistroVentasNuevo: React.FC<RegistroVentasNuevoProps> = ({
  pantallas,
  asignaciones,
  clientes,
  ventasRegistradas,
  usuarioActual,
  onRegistrarVenta,
  onEliminarVenta,
  errorExterno,
}) => {
  const [mostrarModalVenta, setMostrarModalVenta] = useState(false);
  const [ventaEditando, setVentaEditando] = useState<RegistroVenta | null>(null);

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
        clientes={clientes}
        ventasRegistradas={ventasRegistradas}
        onEliminarVenta={onEliminarVenta}
        onNuevaVenta={handleNuevaVenta}
        onEditarVenta={(venta) => {
          setVentaEditando(venta);
          setMostrarModalVenta(true);
        }}
      />

      {mostrarModalVenta && (
        <RegistroVentaModal
          pantallas={pantallas}
          asignaciones={asignaciones}
          clientes={clientes}
          usuarioActual={usuarioActual}
          onRegistrarVenta={onRegistrarVenta}
          onCerrar={handleCerrarModal}
          ventaInicial={ventaEditando}
        />
      )}
    </div>
  );
};
