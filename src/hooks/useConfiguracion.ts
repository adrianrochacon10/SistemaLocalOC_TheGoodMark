import { useState, useEffect, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "react-toastify";
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
            sitioWeb: data.sitio_web ?? data.sitioWeb ?? undefined,
            bancoTitular: data.banco_titular ?? data.bancoTitular ?? undefined,
            bancoNombre: data.banco_nombre ?? data.bancoNombre ?? undefined,
            bancoTarjeta: data.banco_tarjeta ?? data.bancoTarjeta ?? undefined,
            bancoCuenta: data.banco_cuenta ?? data.bancoCuenta ?? undefined,
            bancoClabe: data.banco_clabe ?? data.bancoClabe ?? undefined,
            diaCorteOrdenes:
              Number(data.dia_corte_ordenes ?? data.diaCorteOrdenes ?? 20) || 20,
          });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/fetch|Failed to fetch|NETWORK|refused|reset/i.test(msg)) {
          console.warn(
            "[config] Sin conexión al API (¿backend en ejecución?).",
          );
        } else {
          console.error("Error cargando configuración:", e);
        }
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
    const data = await backendApi.get("/api/ordenes");
    if (!Array.isArray(data)) {
      console.warn("[órdenes] Respuesta inesperada del API (no es un arreglo).");
      setOrdenes([]);
      return;
    }
    const mapped: OrdenDeCompra[] = [];
    for (const row of data) {
      try {
        mapped.push(mapOrdenFromApi(row));
      } catch (e) {
        console.error("[órdenes] Fila ignorada al mapear:", e, row);
      }
    }
    setOrdenes(mapped);
  }, [profile?.id, session?.access_token]);

  useEffect(() => {
    void (async () => {
      try {
        await refetchOrdenes();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/fetch|Failed to fetch|NETWORK|refused|reset/i.test(msg)) {
          console.warn(
            "[órdenes] Sin conexión al API (¿backend en ejecución?).",
          );
        } else {
          console.error("Error cargando órdenes:", e);
        }
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
        diaCorteOrdenes: Number(config.diaCorteOrdenes ?? 20) || 20,
        activo: config.activo,
      });
      if (data?.id) setConfig((prev) => ({ ...prev, id: data.id }));
      toast.success("Configuración guardada correctamente.");
    } catch (e) {
      console.error("Error guardando configuración:", e);
      toast.error(
        e instanceof Error
          ? e.message
          : "Error al guardar configuración.",
      );
    }
  };

  /** Solo local (sin API); por compatibilidad. Preferir generar/guardar vía backend. */
  const handleGenerarOrden = (orden: OrdenDeCompra) => {
    setOrdenes((prev) => [...prev, orden]);
  };

  const handleCrearOrdenManual = async (payload: CrearOrdenPayload) => {
    try {
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
      })) as { orden?: any };
      if (!res?.orden) throw new Error("Respuesta inválida del servidor");
      const nuevaOrden = mapOrdenFromApi(res.orden);
      setOrdenes((prev) => {
        const sinDuplicado = prev.filter((o) => o.id !== nuevaOrden.id);
        return [nuevaOrden, ...sinDuplicado];
      });
      toast.success("Orden creada correctamente.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "No se pudo crear la orden.",
      );
      throw e;
    }
  };

  const handleEliminarOrden = async (ordenId: string) => {
    try {
      await backendApi.del(`/api/ordenes/${ordenId}`);
      setOrdenes((prev) => prev.filter((o) => o.id !== ordenId));
      toast.success("Orden eliminada correctamente.");
      try {
        await refetchOrdenes();
      } catch (e) {
        console.warn("No se pudieron refrescar órdenes tras eliminar:", e);
      }
    } catch (e) {
      toast.error(
        e instanceof Error
          ? e.message
          : "No se pudo eliminar la orden.",
      );
      throw e;
    }
  };

  return {
    config,
    ordenes,
    acciones: {
      handleGuardarConfiguracion,
      handleGenerarOrden,
      handleCrearOrdenManual,
      handleEliminarOrden,
    },
  };
}
