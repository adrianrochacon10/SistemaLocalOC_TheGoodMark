// src/hooks/useVentas.ts
import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
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
    const productosIds: string[] = // ← AGREGAR
      row.productos_ids ?? (row.producto_id ? [row.producto_id] : []); // ← AGREGAR

    return {
      id: row.id,
      pantallasIds,
      productosIds, // ← AGREGAR
      itemsVenta: pantallasIds.map((pantallaId) => ({
        pantallaId,
        sinDescuento: false,
      })),
      colaboradorId: row.colaborador_id ?? row.cliente_id,
      productoId: row.producto_id ?? undefined,
      vendidoA:
        row.vendido_a ?? row.client_name ?? row.colaborador?.nombre ?? "-",
      precioGeneral: Number(row.precio_por_mes ?? row.precio_general ?? 0) || 0,
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
    console.log("=== VENTA A REGISTRAR ===");
    console.log("pantallasIds:", venta.pantallasIds);
    console.log("longitud:", venta.pantallasIds.length);

    if (
      venta.pantallasIds.length === 0 &&
      (venta.productosIds ?? []).length === 0
    ) {
      setErrorVenta("Selecciona al menos una pantalla o producto");
      return;
    }

    const estadoApi = venta.estadoVenta?.toLowerCase() ?? "prospecto";

    const payload = {
      colaborador_id: venta.colaboradorId,
      producto_id: venta.productoId ?? venta.productosIds?.[0] ?? null, // ✅ usa el primero
      cantidad: venta.cantidad ?? 1,
      precio_unitario_manual:
        venta.precioGeneral > 0 ? venta.precioGeneral : null,
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
      pantallas_ids: venta.pantallasIds,
      pantalla_id: venta.pantallasIds[0] ?? null,
      productos_ids: venta.productosIds ?? [],
    };

    console.log("=== PAYLOAD ENVIADO AL BACKEND ===");
    console.log(JSON.stringify(payload, null, 2));

    try {
      const { data, error } = await registrarVenta(payload); // ← una sola llamada

      if (error) {
        console.error("Error al guardar venta:", error);
        setErrorVenta(
          error instanceof Error
            ? `Error: ${error.message}`
            : "Error al guardar.",
        );
        setVentasRegistradas((prev) => [...prev, venta]);
        return;
      }

      if (data) {
        setVentasRegistradas((prev) => [...prev, mapVentaFromApi(data)]);
      }
    } catch (e) {
      console.error("Excepción al guardar venta:", e);
      setErrorVenta(
        e instanceof Error ? `Error: ${e.message}` : "Error desconocido.",
      );
      setVentasRegistradas((prev) => [...prev, venta]);
    }
  };

  // ── Eliminar venta ────────────────────────────────────────────────────
  const handleEliminarVenta = (ventaId: string) => {
    setVentasRegistradas((prev) => prev.filter((v) => v.id !== ventaId));
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
