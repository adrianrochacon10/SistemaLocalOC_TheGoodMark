import React from "react";
import {
  OrdenDeCompra,
  Colaborador,
  Pantalla,
  ConfiguracionEmpresa,
  Usuario,
} from "../../../types";
import { OrdenCard } from "./OrdenCard";

interface Props {
  ordenes: OrdenDeCompra[];
  clientes: Colaborador[];
  pantallas: Pantalla[];
  config: ConfiguracionEmpresa;
  usuarioActual: Usuario;
  expandidoId: string | null;
  onToggle: (id: string) => void;
}

export const OrdenesGrid: React.FC<Props> = ({
  ordenes,
  clientes,
  pantallas,
  config,
  usuarioActual,
  expandidoId,
  onToggle,
}) => {
  if (ordenes.length === 0)
    return <p className="no-ordenes">No hay órdenes generadas aún</p>;

  const ordenadas = [...ordenes].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
  );

  return (
    <div className="ordenes-grid">
      {ordenadas.map((orden) => (
        <OrdenCard
          key={orden.id}
          orden={orden}
          clientes={clientes}
          pantallas={pantallas}
          config={config}
          usuarioActual={usuarioActual}
          expandido={expandidoId === orden.id}
          onToggle={() => onToggle(orden.id)}
        />
      ))}
    </div>
  );
};
