import { useState, useEffect } from "react";
import { Producto, AsignacionProductoExtra } from "../types";
import { backendApi } from "../lib/backendApi";

export function useProductosExtra(profile: any) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [asignacionesProductos, setAsignacionesProductos] = useState<
    AsignacionProductoExtra[]
  >([]);

  // Cargar desde backend
  useEffect(() => {
    if (!profile) return;
    const cargar = async () => {
      try {
        const data = (await backendApi.get("/api/productos")) as any[];
        setProductos(
          Array.isArray(data)
            ? data.map((p: any): Producto => ({
                id: p.id,
                nombre: p.nombre,
                precio: Number(p.precio) || 0,
                activo: p.activo ?? true,
                fechaCreacion: p.fecha_creacion
                  ? new Date(p.fecha_creacion)
                  : new Date(),
              }))
            : [],
        );
      } catch (e) {
        console.error("Error cargando productos:", e);
      }
    };
    cargar();
  }, [profile]);

  // Persistir
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

  // Cargar inicial
  useEffect(() => {
    const datos = localStorage.getItem("productosExtra");
    if (datos) {
      try {
        const parsed = JSON.parse(datos);
        setProductos(parsed.productos || []);
        setAsignacionesProductos(parsed.asignacionesProductos || []);
      } catch (e) {
        console.error("Error cargando productos desde localStorage:", e);
      }
    }
  }, []);

  const handleAsignarProductoExtra = (asignacion: AsignacionProductoExtra) => {
    setAsignacionesProductos((prev) => {
      const existe = prev.find((a) => a.id === asignacion.id);
      return existe
        ? prev.map((a) => (a.id === asignacion.id ? asignacion : a))
        : [...prev, asignacion];
    });
  };

  const handleDesasignarProductoExtra = (
    clienteId: string,
    productoId: string,
  ) => {
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
