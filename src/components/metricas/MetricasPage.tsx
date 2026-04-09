import React from "react";
import { Colaborador, RegistroVenta } from "../../types";
import { VentasGraficas } from "../ventas/components/VentaGrafica";

interface Props {
  ventasRegistradas: RegistroVenta[];
  colaboradores: Colaborador[];
}

export const MetricasPage: React.FC<Props> = ({
  ventasRegistradas,
  colaboradores,
}) => {
  return (
    <div style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      <VentasGraficas
        ventasRegistradas={ventasRegistradas}
        colaboradores={colaboradores}
      />
    </div>
  );
};
