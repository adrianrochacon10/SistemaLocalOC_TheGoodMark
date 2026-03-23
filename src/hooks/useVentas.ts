// src/hooks/useVentas.ts
import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "react-toastify";
import { RegistroVenta } from "../types";
import { backendApi } from "../lib/backendApi";
import { registrarVenta } from "../lib/ventas";

export function useVentas(profile: any, session: Session | null) {
  const [ventasRegistradas, setVentasRegistradas] = useState<RegistroVenta[]>(
    [],
  );
  const [errorVenta, setErrorVenta] = useState<string | null>(null);

  const mapVentaFromApi = (row: any): RegistroVenta => {
    const pantallasIds: string[] =
      row.pantallas_ids ?? (row.pantalla_id ? [row.pantalla_id] : []);

    return {
      id: row.id,
      pantallasIds,
      itemsVenta: pantallasIds.map((pantallaId) => ({
        pantallaId,
        sinDescuento: false,
      })),
      colaboradorId: row.colaborador_id ?? row.cliente_id,
      productoId: row.producto_id ?? undefined,
      vendidoA: row.vendido_a ?? row.client_name ?? row.colaborador?.nombre ?? "-",
      precioGeneral:
        Number(row.precio_por_mes ?? row.precio_general ?? 0) || 0,
      cantidad: row.cantidad ?? 1,
      precioTotal: row.precio_total ?? row.importe_total ?? 0,
      fechaRegistro: row.created_at
        ? new Date(row.created_at)
        : row.fecha_registro
          ? new Date(row.fecha_registro)
          : new Date(),
      fechaInicio: new Date(row.fecha_inicio),
      fechaFin: new Date(row.fecha_fin),
      mesesRenta: row.duracion_meses ?? row.meses_renta ?? 1,
      importeTotal: row.importe_total ?? row.precio_total ?? 0,
      activo: row.activo ?? true,

      // ✅ vendedorId separado de usuarioRegistroId
      vendedorId: row.vendedor_id ?? undefined,
      usuarioRegistroId: row.usuario_registro_id ?? row.vendedor_id ?? "",

      estadoVenta: (() => {
        const raw = row.estado_venta ?? row.estado;
        if (!raw || typeof raw !== "string") return "Prospecto" as const;
        const e = raw.toLowerCase();
        if (e === "aceptado") return "Aceptado" as const;
        if (e === "rechazado") return "Rechazado" as const;
        return "Prospecto" as const;
      })(),

      tipoPagoId: row.tipo_pago_id ?? row.tipo_pago?.id,

      // ✅ Campos financieros que faltaban
      costos: row.costos ?? 0,
      comision: row.comisiones ?? row.comision ?? 0,
      pagoConsiderar: row.pago_considerar ?? undefined,
    };
  };

  // ── Cargar desde backend ──────────────────────────────────────────────
  useEffect(() => {
    if (!profile || !session?.access_token) return;
    const cargar = async () => {
      try {
        const data = (await backendApi.get("/api/ventas")) as any[];
        setVentasRegistradas(data.map(mapVentaFromApi));
      } catch (e) {
        console.error("Error cargando ventas:", e);
        toast.error("Error cargando ventas");
      }
    };
    cargar();
  }, [profile?.id, session?.access_token]);

  // ── Persistir en localStorage ─────────────────────────────────────────
  useEffect(() => {
    if (!profile) return;
    try {
      localStorage.setItem("ventas", JSON.stringify(ventasRegistradas));
    } catch (e) {
      console.error("Error guardando ventas en localStorage:", e);
    }
  }, [ventasRegistradas, profile]);

  // ── Registrar venta ───────────────────────────────────────────────────
  const handleRegistrarVentaConSupabase = async (venta: RegistroVenta) => {
    setErrorVenta(null);

    const pantallasParaVenta =
      venta.pantallasIds.length > 0 ? venta.pantallasIds : [];

    if (pantallasParaVenta.length === 0) {
      setErrorVenta("Selecciona al menos una pantalla");
      return;
    }

    const estadoApi = venta.estadoVenta?.toLowerCase() ?? "prospecto";
    const payloadBase = {
      colaborador_id: venta.colaboradorId,
      producto_id: venta.productoId ?? null,
      cantidad: venta.cantidad ?? 1,
      precio_unitario_manual:
        venta.precioGeneral > 0 && !venta.productoId
          ? venta.precioGeneral
          : null,
      tipo_pago_id: venta.tipoPagoId ?? null,
      estado: estadoApi,
      fecha_inicio: venta.fechaInicio.toISOString().slice(0, 10),
      fecha_fin: venta.fechaFin.toISOString().slice(0, 10),
      duracion_meses: venta.mesesRenta,
      vendido_a: venta.vendidoA,
      vendedor_id: venta.vendedorId ?? venta.usuarioRegistroId ?? null,
      importe_total: venta.importeTotal ?? venta.precioTotal,
      pago_considerar: venta.pagoConsiderar ?? 0,
      costos: venta.costos ?? 0,
      comision: venta.comision ?? 0,
      costos_mes: venta.costos ?? 0,
      costos_total: (venta.costos ?? 0) * venta.mesesRenta,
      comision_mes: venta.comision ?? 0,
      comision_total: (venta.comision ?? 0) * venta.mesesRenta,
    };

    const ventasCreadas: RegistroVenta[] = [];

    try {
      for (const pantallaId of pantallasParaVenta) {
        const { data, error } = await registrarVenta({
          ...payloadBase,
          pantalla_id: pantallaId,
        });

        if (error) {
          console.error("Error al guardar venta:", error);
          toast.error(
            error instanceof Error
              ? `Error: ${error.message}`
              : "Error al guardar en la base de datos.",
          );
          setErrorVenta(
            error instanceof Error
              ? `Error: ${error.message}`
              : "Error al guardar en la base de datos.",
          );
          setVentasRegistradas((prev) => [...prev, venta]);
          return;
        }

        if (data) ventasCreadas.push(mapVentaFromApi(data));
      }

      if (ventasCreadas.length > 0) {
        setVentasRegistradas((prev) => [...prev, ...ventasCreadas]);
      }
    } catch (e) {
      console.error("Excepción al guardar venta:", e);
      toast.error(e instanceof Error ? `Error: ${e.message}` : "Error desconocido.");
      setErrorVenta(
        e instanceof Error ? `Error: ${e.message}` : "Error desconocido.",
      );
      setVentasRegistradas((prev) => [...prev, venta]);
    }
  };

  // ── Eliminar venta ────────────────────────────────────────────────────
  const handleEliminarVenta = (ventaId: string) => {
    setVentasRegistradas((prev) => prev.filter((v) => v.id !== ventaId));
    toast.warn("Venta eliminada correctamente");
  };

  return {
    ventasRegistradas,
    errorVenta,
    acciones: {
      handleRegistrarVentaConSupabase,
      handleEliminarVenta,
    },
  };
}
