import { useState } from "react";

export interface FilaItem {
  tempId: string;
  [key: string]: string | number;
}

export function useFilasFormulario(
  camposIniciales: Record<string, string | number>,
) {
  const crearFilaVacia = (): FilaItem => ({
    tempId: Math.random().toString(36).substring(2, 15),
    ...camposIniciales,
  });

  const [filas, setFilas] = useState<FilaItem[]>([crearFilaVacia()]);

  const actualizarCampo = (idx: number, campo: string, valor: string) => {
    setFilas((prev) => {
      const nuevas = [...prev];
      nuevas[idx] = { ...nuevas[idx], [campo]: valor };
      return nuevas;
    });
  };

  const agregarFila = () => setFilas((prev) => [...prev, crearFilaVacia()]);

  const eliminarFila = (idx: number) => {
    if (filas.length > 1) {
      setFilas((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const resetFilas = () => setFilas([crearFilaVacia()]);

  const filasValidas = () =>
    filas.filter((f) =>
      Object.entries(f)
        .filter(([k]) => k !== "tempId")
        .some(([, v]) => String(v).trim() !== "" && String(v) !== "0"),
    );

  return {
    filas,
    setFilas,
    actualizarCampo,
    agregarFila,
    eliminarFila,
    resetFilas,
    filasValidas,
  };
}
