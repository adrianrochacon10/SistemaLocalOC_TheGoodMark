import React from "react";

interface Props {
  titulo?: string;
  hint?: string;
}

/** Estado vacío animado cuando un filtro por periodo no tiene datos (Métricas, costos admin, etc.). */
export function GraficasEmptyMes({
  titulo = "No hay datos en este periodo",
  hint,
}: Props) {
  return (
    <div className="graficas-empty-mes" role="status">
      <span className="graficas-empty-mes__icon" aria-hidden>
        📭
      </span>
      <p className="graficas-empty-mes__title">{titulo}</p>
      {hint ? <p className="graficas-empty-mes__hint">{hint}</p> : null}
    </div>
  );
}
