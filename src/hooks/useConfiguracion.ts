import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { ConfiguracionEmpresa, OrdenDeCompra } from "../types";
import { backendApi } from "../lib/backendApi";
import { toast } from "react-toastify";

export function useConfiguracion(profile: any, session: Session | null) {
  const [config, setConfig] = useState<ConfiguracionEmpresa>({
    id: "cfg1",
    nombreEmpresa: "Mi Empresa de Pantallas",
    rfc: "ABC123456DEF",
    direccion: "Calle Principal 123, Ciudad",
    telefono: "555-123-4567",
    email: "contacto@empresa.com",
    ivaPercentaje: 16,
    activo: true,
  });
  const [ordenes, setOrdenes] = useState<OrdenDeCompra[]>([]);

  // Cargar desde backend
  useEffect(() => {
    if (!profile) return;
    const cargar = async () => {
      try {
        const data = await backendApi.get("/api/configuracion");
        if (data) {
          setConfig({
            id: data.id ?? "cfg1",
            nombreEmpresa: data.nombre_empresa ?? "Mi Empresa de Pantallas",
            rfc: data.rfc ?? undefined,
            direccion: data.direccion ?? undefined,
            telefono: data.telefono ?? undefined,
            email: data.email ?? undefined,
            ivaPercentaje: data.iva_percentaje ?? 16,
            activo: data.activo ?? true,
          });
        }
      } catch (e) {
        console.error("Error cargando configuración:", e);
        toast.error("Error cargando configuración");
      }
    };
    cargar();
  }, [profile?.id, session?.access_token]);

  // Persistir
  useEffect(() => {
    if (!profile) return;
    try {
      localStorage.setItem("config", JSON.stringify({ config, ordenes }));
    } catch (e) {
      console.error("Error guardando config:", e);
    }
  }, [config, ordenes, profile]);

  // Cargar inicial
  useEffect(() => {
    const datos = localStorage.getItem("config");
    if (datos) {
      try {
        const parsed = JSON.parse(datos);
        setConfig(parsed.config || config);
        setOrdenes(parsed.ordenes || []);
      } catch (e) {
        console.error("Error cargando config desde localStorage:", e);
      }
    }
  }, []);

  const handleGuardarConfiguracion = async () => {
    try {
      const data = await backendApi.post("/api/configuracion", {
        nombreEmpresa: config.nombreEmpresa,
        rfc: config.rfc ?? null,
        direccion: config.direccion ?? null,
        telefono: config.telefono ?? null,
        email: config.email ?? null,
        ivaPercentaje: config.ivaPercentaje,
        activo: config.activo,
      });
      if (data?.id) setConfig((prev) => ({ ...prev, id: data.id }));
    } catch (e) {
      console.error("Error guardando configuración:", e);
      toast.error(
        e instanceof Error
          ? `Error: ${e.message}`
          : "Error al guardar configuración.",
      );
    }
  };

  const handleGenerarOrden = (orden: OrdenDeCompra) => {
    setOrdenes((prev) => [...prev, orden]);
  };

  return {
    config,
    ordenes,
    acciones: {
      handleGuardarConfiguracion,
      handleGenerarOrden,
    },
  };
}
