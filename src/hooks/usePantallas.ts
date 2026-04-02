import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "react-toastify";
import { Pantalla, AsignacionPantalla } from "../types";
import { backendApi } from "../lib/backendApi";

export function usePantallas(profile: any, session: Session | null) {
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
            precio:
              row.precio != null
                ? Number(row.precio)
                : row.precio_mensual != null
                  ? Number(row.precio_mensual)
                  : undefined,
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
        const msg = e instanceof Error ? e.message : String(e);
        if (/fetch|Failed to fetch|NETWORK|refused|reset/i.test(msg)) {
          console.warn(
            "[pantallas] Sin conexión al API (¿backend en ejecución?).",
          );
        } else {
          console.error("Error cargando pantallas:", e);
        }
      }
    };
    cargar();
  }, [profile?.id, session?.access_token]);

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
        precio: Number(pantalla.precio ?? 0),
      });

      if (data) {
        pantallaParaEstado = {
          id: data.id,
          nombre: data.nombre ?? data.nombre_pantalla,
          activa: true,
          fechaCreacion: data.fecha_creacion
            ? new Date(data.fecha_creacion)
            : pantalla.fechaCreacion,
          precio:
            data.precio != null
              ? Number(data.precio)
              : Number(pantalla.precio ?? 0),
        };
        toast.success("Pantalla guardada correctamente.");
      }
    } catch (e) {
      console.error("Error guardando pantalla:", e);
      toast.error(
        e instanceof Error ? e.message : "No se pudo guardar la pantalla.",
      );
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
      toast.success("Pantalla eliminada correctamente.");
    } catch (e) {
      console.error("Error eliminando pantalla:", e);
      toast.error(
        e instanceof Error ? e.message : "No se pudo eliminar la pantalla.",
      );
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
      toast.error(
        e instanceof Error ? e.message : "No se pudo eliminar el colaborador.",
      );
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
