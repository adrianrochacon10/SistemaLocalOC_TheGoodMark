import { useState, useEffect, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { ConfiguracionEmpresa, OrdenDeCompra } from "../types";
import { backendApi } from "../lib/backendApi";
import { mapOrdenFromApi } from "../utils/ordenApiMapper";
import type { CrearOrdenPayload } from "../utils/ordenCompraLineas";

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

  // Cargar inicial (órdenes vienen del API, no del localStorage)
  useEffect(() => {
    const datos = localStorage.getItem("config");
    if (datos) {
      try {
        const parsed = JSON.parse(datos);
        setConfig(parsed.config || config);
      } catch (e) {
        console.error("Error cargando config desde localStorage:", e);
      }
    }
  }, []);

  const refetchOrdenes = useCallback(async () => {
    if (!profile || !session?.access_token) return;
    const data = await backendApi.get("/api/ordenes");
    if (Array.isArray(data)) {
      setOrdenes(data.map(mapOrdenFromApi));
    }
  }, [profile?.id, session?.access_token]);

  useEffect(() => {
    void (async () => {
      try {
        await refetchOrdenes();
      } catch (e) {
        console.error("Error cargando órdenes:", e);
      }
    })();
  }, [refetchOrdenes]);

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
      alert(
        e instanceof Error
          ? `Error: ${e.message}`
          : "Error al guardar configuración.",
      );
    }
  };

  /** Solo local (sin API); por compatibilidad. Preferir generar/guardar vía backend. */
  const handleGenerarOrden = (orden: OrdenDeCompra) => {
    setOrdenes((prev) => [...prev, orden]);
  };

  /**
   * Genera órdenes en BD por colaborador para el mes calendario (1–12) y año,
   * a partir de las ventas cuyo período cae en ese mes (lógica del backend).
   */
  const handleGenerarOrdenMesEnBackend = async (mesJs: number, anioVal: number) => {
    await backendApi.post("/api/ordenes/generar", {
      mes: mesJs + 1,
      anio: anioVal,
    });
    await refetchOrdenes();
  };

  const handleCrearOrdenManual = async (payload: CrearOrdenPayload) => {
    const res = (await backendApi.post("/api/ordenes/crear-manual", {
      colaborador_id: payload.colaboradorId,
      mes: payload.mes + 1,
      anio: payload.año,
      ventas_ids: payload.ventasIds,
      detalle_lineas: payload.detalleLineas,
      subtotal: payload.subtotal,
      iva: payload.iva,
      total: payload.total,
      iva_porcentaje: payload.ivaPercentaje,
    })) as { orden?: unknown };
    if (!res?.orden) throw new Error("Respuesta inválida del servidor");
    await refetchOrdenes();
  };

  return {
    config,
    ordenes,
    acciones: {
      handleGuardarConfiguracion,
      handleGenerarOrden,
      handleGenerarOrdenMesEnBackend,
      handleCrearOrdenManual,
    },
  };
}
