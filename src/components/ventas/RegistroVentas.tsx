// src/components/ventas/RegistroVentas.tsx
import React from "react";
import {
  RegistroVenta,
  Pantalla,
  AsignacionPantalla,
  Colaborador,
  Usuario,
} from "../../types";
import "./RegistroVentas.css";
// import { RegistroVentaForm } from "./components/RegistroVentaForm";
import { RegistroVentasStatsYLista } from "./components/RegistrosVentasStatYListas";

interface RegistroVentasProps {
  pantallas: Pantalla[];
  asignaciones: AsignacionPantalla[];
  clientes: Colaborador[];
  ventasRegistradas: RegistroVenta[];
  usuarioActual: Usuario;
  onRegistrarVenta: (venta: RegistroVenta) => void;
}

export const RegistroVentas: React.FC<RegistroVentasProps> = ({
  // pantallas,
  // asignaciones,
  clientes,
  ventasRegistradas,
  // usuarioActual,
  // onRegistrarVenta,
}) => {
  return (
    <div className="registro-ventas">
      <div className="registro-container">
        {/* <RegistroVentaForm
          pantallas={pantallas}
          asignaciones={asignaciones}
          clientes={clientes}
          usuarioActual={usuarioActual}
          onRegistrarVenta={onRegistrarVenta}
          usuarios={}
        /> */}

        <RegistroVentasStatsYLista
          clientes={clientes}
          ventasRegistradas={ventasRegistradas}
        />
      </div>
    </div>
  );
};
