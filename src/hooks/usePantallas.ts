import { useState, useEffect } from "react";
import { Pantalla, AsignacionPantalla } from "../types";
import { backendApi } from "../lib/backendApi";

export function usePantallas(profile: any) {
  const [pantallas, setPantallas] = useState<Pantalla[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionPantalla[]>([]);

  // Cargar desde backend
  useEffect(() => {
    if (!profile) return;
    const cargar = async () => {
      try {
        const [dataPantallas, dataAsignaciones] = await Promise.all([
          backendApi.get("/api/pantallas"),
          backendApi.get("/api/asignaciones"),
        ]);

        setPantallas(
          (dataPantallas as any[]).map((row: any) => ({
            id: row.id,
            nombre: row.nombre ?? row.nombre_pantalla,
            activa: true,
            fechaCreacion: row.fecha_creacion
              ? new Date(row.fecha_creacion)
              : new Date(),
          })),
        );

        setAsignaciones(
          (dataAsignaciones as any[]).map((a: any) => ({
            id: a.id,
            clienteId: a.cliente_id,
            pantallaId: a.pantalla_id,
            activa: a.activa,
            fechaAsignacion: a.fecha_asignacion,
          })),
        );
      } catch (e) {
        console.error("Error cargando pantallas:", e);
      }
    };
    cargar();
  }, [profile]);

  // Persistir
  useEffect(() => {
    if (!profile) return;
    try {
      localStorage.setItem(
        "pantallas",
        JSON.stringify({ pantallas, asignaciones }),
      );
    } catch (e) {
      console.error("Error guardando pantallas:", e);
    }
  }, [pantallas, asignaciones, profile]);

  const handleAgregarPantalla = async (pantalla: Pantalla) => {
    let pantallaParaEstado: Pantalla = pantalla;
    try {
      const data = await backendApi.post("/api/pantallas", {
        nombre: pantalla.nombre,
      });

      if (data) {
        pantallaParaEstado = {
          id: data.id,
          nombre: data.nombre ?? data.nombre_pantalla,
          activa: true,
          fechaCreacion: data.fecha_creacion
            ? new Date(data.fecha_creacion)
            : pantalla.fechaCreacion,
        };
      }
    } catch (e) {
      console.error("Error guardando pantalla:", e);
    }

    setPantallas((prev) => {
      const existe = prev.find((p) => p.id === pantallaParaEstado.id);
      return existe
        ? prev.map((p) =>
            p.id === pantallaParaEstado.id ? pantallaParaEstado : p,
          )
        : [...prev, pantallaParaEstado];
    });
  };

  const handleEliminarPantalla = async (pantallaId: string) => {
    try {
      await backendApi.del(`/api/pantallas/${pantallaId}`);
    } catch (e) {
      console.error("Error eliminando pantalla:", e);
    }
    setPantallas((prev) => prev.filter((p) => p.id !== pantallaId));
    setAsignaciones((prev) => prev.filter((a) => a.pantallaId !== pantallaId));
  };

  const handleAsignarPantalla = (asignacion: AsignacionPantalla) => {
    setAsignaciones((prev) => {
      const existe = prev.find((a) => a.id === asignacion.id);
      return existe
        ? prev.map((a) => (a.id === asignacion.id ? asignacion : a))
        : [...prev, asignacion];
    });
  };

  const handleDesasignarPantalla = (clienteId: string, pantallaId: string) => {
    setAsignaciones((prev) =>
      prev.filter(
        (a) => !(a.clienteId === clienteId && a.pantallaId === pantallaId),
      ),
    );
  };

  const eliminarPantallasYAsignacionesDeColaborador = async (
    colaboradorId: string,
  ) => {
    try {
      await backendApi.del(`/api/colaboradores/${colaboradorId}`);
    } catch (e) {
      console.error("Error eliminando colaborador:", e);
    }

    const pantallasAsignadas = asignaciones
      .filter((a) => a.clienteId === colaboradorId)
      .map((a) => a.pantallaId);

    setAsignaciones((prev) =>
      prev.filter((a) => a.clienteId !== colaboradorId),
    );
    setPantallas((prev) =>
      prev.filter((p) => !pantallasAsignadas.includes(p.id)),
    );
  };

  return {
    pantallas,
    asignaciones,
    acciones: {
      handleAgregarPantalla,
      handleEliminarPantalla,
      handleAsignarPantalla,
      handleDesasignarPantalla,
      eliminarPantallasYAsignacionesDeColaborador,
    },
  };
}
