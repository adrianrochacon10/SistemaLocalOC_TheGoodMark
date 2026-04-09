import { useState, useEffect, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "react-toastify";
import { ConfiguracionEmpresa, OrdenDeCompra } from "../types";
import { backendApi } from "../lib/backendApi";
import { mapOrdenFromApi } from "../utils/ordenApiMapper";
import type { CrearOrdenPayload } from "../utils/ordenCompraLineas";

const CONFIG_PRECIO_DIA_OVERRIDE_KEY = "config_precio_dia_override";
const TARIFAS_DIAS_DEFAULT = [
  { dias: 1, precio: 0 },
  { dias: 3, precio: 0 },
  { dias: 7, precio: 0 },
  { dias: 15, precio: 0 },
];

function normalizarTarifasDias(raw: any): Array<{ dias: number; precio: number }> {
  if (!Array.isArray(raw)) return TARIFAS_DIAS_DEFAULT;
  const out = raw
    .map((r: any) => ({
      dias: Math.max(1, Number(r?.dias) || 0),
      precio: Math.max(0, Number(r?.precio) || 0),
    }))
    .filter((r) => Number.isFinite(r.dias) && Number.isFinite(r.precio))
    .sort((a, b) => a.dias - b.dias);
  return out.length > 0 ? out : TARIFAS_DIAS_DEFAULT;
}

function leerOverridePrecioDiaLocal(): {
  habilitarPrecioPorDia: boolean;
  tarifasDias: Array<{ dias: number; precio: number }>;
} | null {
  try {
    const raw = localStorage.getItem(CONFIG_PRECIO_DIA_OVERRIDE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      habilitarPrecioPorDia: Boolean(parsed?.habilitarPrecioPorDia),
      tarifasDias: normalizarTarifasDias(parsed?.tarifasDias),
    };
  } catch {
    return null;
  }
}

function guardarOverridePrecioDiaLocal(
  habilitarPrecioPorDia: boolean,
  tarifasDias: Array<{ dias: number; precio: number }>,
): void {
  try {
    localStorage.setItem(
      CONFIG_PRECIO_DIA_OVERRIDE_KEY,
      JSON.stringify({
        habilitarPrecioPorDia: Boolean(habilitarPrecioPorDia),
        tarifasDias: normalizarTarifasDias(tarifasDias),
      }),
    );
  } catch {
    // noop
  }
}

export function useConfiguracion(profile: any, session: Session | null) {
  const [config, setConfig] = useState<ConfiguracionEmpresa>({
    id: "cfg1",
    nombreEmpresa: "Mi Empresa de Pantallas",
    rfc: "ABC123456DEF",
    direccion: "Calle Principal 123, Ciudad",
    telefono: "555-123-4567",
    email: "contacto@empresa.com",
    ivaPercentaje: 16,
    habilitarPrecioPorDia: false,
    tarifasDias: TARIFAS_DIAS_DEFAULT,
    activo: true,
  });
  const [ordenes, setOrdenes] = useState<OrdenDeCompra[]>([]);

  const aplicarConfigDesdeApi = useCallback((data: any) => {
    if (!data) return;
    const overrideLocal = leerOverridePrecioDiaLocal();
    const backendTraePrecioDia =
      data.habilitar_precio_por_dia != null || data.habilitarPrecioPorDia != null;
    const backendTraeTarifas =
      data.tarifas_dias != null || data.tarifasDias != null;
    setConfig((prev) => ({
      ...prev,
      id: data.id ?? prev.id ?? "cfg1",
      nombreEmpresa: data.nombre_empresa ?? prev.nombreEmpresa ?? "Mi Empresa de Pantallas",
      rfc: data.rfc ?? prev.rfc ?? undefined,
      direccion: data.direccion ?? prev.direccion ?? undefined,
      telefono: data.telefono ?? prev.telefono ?? undefined,
      email: data.email ?? prev.email ?? undefined,
      ivaPercentaje: data.iva_percentaje ?? prev.ivaPercentaje ?? 16,
      habilitarPrecioPorDia: backendTraePrecioDia
        ? Boolean(
            data.habilitar_precio_por_dia ?? data.habilitarPrecioPorDia ?? false,
          )
        : Boolean(
            overrideLocal?.habilitarPrecioPorDia ??
              prev.habilitarPrecioPorDia ??
              false,
          ),
      tarifasDias: backendTraeTarifas
        ? normalizarTarifasDias(data.tarifas_dias ?? data.tarifasDias)
        : normalizarTarifasDias(overrideLocal?.tarifasDias ?? prev.tarifasDias),
      activo: data.activo ?? prev.activo ?? true,
      sitioWeb: data.sitio_web ?? data.sitioWeb ?? prev.sitioWeb ?? undefined,
      bancoTitular:
        data.banco_titular ?? data.bancoTitular ?? prev.bancoTitular ?? undefined,
      bancoNombre:
        data.banco_nombre ?? data.bancoNombre ?? prev.bancoNombre ?? undefined,
      bancoTarjeta:
        data.banco_tarjeta ?? data.bancoTarjeta ?? prev.bancoTarjeta ?? undefined,
      bancoCuenta:
        data.banco_cuenta ?? data.bancoCuenta ?? prev.bancoCuenta ?? undefined,
      bancoClabe:
        data.banco_clabe ?? data.bancoClabe ?? prev.bancoClabe ?? undefined,
      diaCorteOrdenes:
        Number(data.dia_corte_ordenes ?? data.diaCorteOrdenes ?? prev.diaCorteOrdenes ?? 20) ||
        20,
    }));
  }, []);

  const refetchConfig = useCallback(async () => {
    const data = await backendApi.get("/api/configuracion");
    aplicarConfigDesdeApi(data);
  }, [aplicarConfigDesdeApi]);

  // Cargar desde backend
  useEffect(() => {
    const cargar = async () => {
      try {
        await refetchConfig();
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
  }, [profile?.id, session?.access_token, refetchConfig]);

  useEffect(() => {
    const onActualizada = () => {
      void refetchConfig();
    };
    window.addEventListener("configuracion-actualizada", onActualizada);
    return () => {
      window.removeEventListener("configuracion-actualizada", onActualizada);
    };
  }, [refetchConfig]);

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
        const cfg = parsed?.config ?? {};
        const override = leerOverridePrecioDiaLocal();
        setConfig((prev) => ({
          ...prev,
          ...cfg,
          habilitarPrecioPorDia:
            cfg?.habilitarPrecioPorDia != null
              ? Boolean(cfg.habilitarPrecioPorDia)
              : Boolean(
                  override?.habilitarPrecioPorDia ??
                    prev.habilitarPrecioPorDia ??
                    false,
                ),
          tarifasDias: normalizarTarifasDias(
            cfg?.tarifasDias ??
              override?.tarifasDias ??
              prev.tarifasDias ??
              TARIFAS_DIAS_DEFAULT,
          ),
        }));
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
    guardarOverridePrecioDiaLocal(
      Boolean(config.habilitarPrecioPorDia),
      normalizarTarifasDias(config.tarifasDias),
    );
    try {
      const data = await backendApi.post("/api/configuracion", {
        nombreEmpresa: config.nombreEmpresa,
        rfc: config.rfc ?? null,
        direccion: config.direccion ?? null,
        telefono: config.telefono ?? null,
        email: config.email ?? null,
        ivaPercentaje: config.ivaPercentaje,
        habilitarPrecioPorDia: Boolean(config.habilitarPrecioPorDia),
        tarifasDias: normalizarTarifasDias(config.tarifasDias),
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
