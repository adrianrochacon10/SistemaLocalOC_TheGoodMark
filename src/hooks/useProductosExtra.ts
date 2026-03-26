import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { Producto, AsignacionProductoExtra } from "../types";
import { backendApi } from "../lib/backendApi";

export function useProductosExtra(profile: any, session: Session | null) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [asignacionesProductos, setAsignacionesProductos] = useState<
    AsignacionProductoExtra[]
  >([]);

  // Cargar desde backend
  useEffect(() => {
    if (!profile) return;
    const cargar = async () => {
      try {
        const [dataProductos, dataAsignaciones] = await Promise.all([
          backendApi.get("/api/productos"),
          backendApi.get("/api/asignaciones/productos"),
        ]);

        setProductos(
          Array.isArray(dataProductos)
            ? (dataProductos as any[]).map(
                (p: any): Producto => ({
                  id: p.id,
                  nombre: p.nombre,
                  precio:
                    Number(p.precio ?? p.precio_unitario ?? p.precio_por_mes ?? 0) ||
                    0,
                  activo: p.activo ?? true,
                  fechaCreacion: p.fecha_creacion
                    ? new Date(p.fecha_creacion)
                    : new Date(),
                }),
              )
            : [],
        );

        setAsignacionesProductos(
          Array.isArray(dataAsignaciones)
            ? (dataAsignaciones as any[]).map((a: any) => ({
                id: a.id,
                clienteId: a.cliente_id,
                productoId: a.producto_id,
                precioUnitario: a.precioUnitario,
                activo: a.activa,
                fechaAsignacion: a.fecha_asignacion,
              }))
            : [],
        );
      } catch (e) {
        console.error("Error cargando productos/asignaciones:", e);
      }
    };
    cargar();
  }, [profile?.id, session?.access_token]);

  // Persistir en localStorage
  useEffect(() => {
    if (!profile) return;
    try {
      localStorage.setItem(
        "productosExtra",
        JSON.stringify({ productos, asignacionesProductos }),
      );
    } catch (e) {
      console.error("Error guardando productos:", e);
    }
  }, [productos, asignacionesProductos, profile]);

  const handleAsignarProductoExtra = async (
    asignacion: AsignacionProductoExtra,
  ) => {
    try {
      const data = await backendApi.post("/api/asignaciones/productos", {
        cliente_id: asignacion.clienteId,
        producto_id: asignacion.productoId,
        activa: true,
      });
      const nueva = {
        id: data.id,
        clienteId: data.cliente_id,
        productoId: data.producto_id,
        activa: data.activa,
        fechaAsignacion: data.fecha_asignacion,
      };
      setAsignacionesProductos((prev) => {
        const existe = prev.find((a) => a.id === nueva.id);
        return existe
          ? prev.map((a) => (a.id === nueva.id ? nueva : a))
          : [...prev, nueva];
      });
    } catch (e) {
      console.error("Error asignando producto:", e);
    }
  };

  const handleDesasignarProductoExtra = async (
    clienteId: string,
    productoId: string,
  ) => {
    try {
      const asignacion = asignacionesProductos.find(
        (a) => a.clienteId === clienteId && a.productoId === productoId,
      );
      if (asignacion?.id) {
        await backendApi.del(`/api/asignaciones/productos/${asignacion.id}`);
      }
    } catch (e) {
      console.error("Error desasignando producto:", e);
    }
    setAsignacionesProductos((prev) =>
      prev.filter(
        (a) => !(a.clienteId === clienteId && a.productoId === productoId),
      ),
    );
  };

  return {
    productos,
    asignacionesProductos,
    acciones: {
      handleAsignarProductoExtra,
      handleDesasignarProductoExtra,
    },
  };
}
