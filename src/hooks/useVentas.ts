// src/hooks/useVentas.ts
import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "react-toastify";
import { RegistroVenta } from "../types";
import { backendApi } from "../lib/backendApi";
import { registrarVenta } from "../lib/ventas";
import {
  detallePantallaId,
  detallePrecioMensual,
  esLineaPrecioProductoEnDetalle,
} from "../utils/ordenApiMapper";
import {
  fechaParaInputDateLocal,
  parseFechaLocalOnly,
} from "../utils/formateoFecha";
import {
  parseIndiceGastoAdicionalDesdeNotas,
  utilidadNetaDesdeFilaApi,
} from "../utils/utilidadVenta";

export function useVentas(profile: any, session: Session | null) {
  const [ventasRegistradas, setVentasRegistradas] = useState<RegistroVenta[]>(
    [],
  );
  const [errorVenta, setErrorVenta] = useState<string | null>(null);

  const mapVentaFromApi = (row: any): RegistroVenta => {
    const pantallasIds: string[] =
      row.pantallas_ids ?? (row.pantalla_id ? [row.pantalla_id] : []);
    const pantallasDetalleRaw = Array.isArray(row.pantallas_detalle)
      ? row.pantallas_detalle
      : [];
    const metaProducto = pantallasDetalleRaw.find(
      (p: any) => detallePantallaId(p) === "__producto_total__",
    );
    const pantallasDetalleFiltrado = pantallasDetalleRaw.filter(
      (p: any) => detallePantallaId(p) !== "__producto_total__",
    );
    const precioPantallasDesdeDetalle = pantallasDetalleFiltrado
      .filter((p: any) => !esLineaPrecioProductoEnDetalle(detallePantallaId(p)))
      .reduce((sum: number, p: any) => sum + detallePrecioMensual(p), 0);
    const precioPantallasMensual =
      Number(row.precio_pantallas_mensual ?? precioPantallasDesdeDetalle ?? 0) || 0;
    const precioMensualVenta =
      Number(row.precio_por_mes ?? row.precio_general ?? row.precio_total ?? 0) || 0;
    const productoDesdeVenta = Math.max(
      0,
      Number((precioMensualVenta - precioPantallasMensual).toFixed(2)),
    );
    const productoDesdeMeta = Number(
      metaProducto?.precioMensual ?? metaProducto?.precio_mensual ?? NaN,
    );
    const pantallasDetalle = pantallasDetalleFiltrado.map((p: any) => ({
      pantallaId: detallePantallaId(p),
      nombre: p?.nombre,
      precioMensual: detallePrecioMensual(p),
    }));

    const gastoDesdeNotas = parseIndiceGastoAdicionalDesdeNotas(row.notas);

    return {
      id: row.id,
      pantallasIds,
      itemsVenta: pantallasIds.map((pantallaId) => ({
        pantallaId,
        sinDescuento: false,
      })),
      colaboradorId: row.colaborador_id ?? row.cliente_id,
      colaboradorAlias: (() => {
        const emb = row.colaborador;
        const s = String(emb?.contacto ?? emb?.alias ?? "").trim();
        return s || undefined;
      })(),
      productoId: row.producto_id ?? undefined,
      productoIds: Array.isArray(row.producto_ids)
        ? row.producto_ids.map((x: any) => String(x))
        : row.producto_id
          ? [String(row.producto_id)]
          : [],
      productoNombre:
        row.producto?.nombre ??
        row.colaborador?.producto?.nombre ??
        undefined,
      productoPrecioMensual:
        Number.isFinite(productoDesdeMeta) && productoDesdeMeta >= 0
          ? productoDesdeMeta
          : productoDesdeVenta,
      precioPantallasMensual,
      pantallasDetalle,
      clientId: row.client_id ?? row.clientId ?? row.client?.id ?? row.clients?.id ?? undefined,
      vendidoA:
        row.client?.nombre ??
        row.clients?.nombre ??
        row.vendido_a ??
        row.client_name ??
        row.colaborador?.nombre ??
        "-",
      precioGeneral: precioMensualVenta,
      cantidad: row.cantidad ?? 1,
      precioTotal: row.precio_total ?? row.importe_total ?? 0,
      precioTotalContrato:
        Number(row.precio_total ?? row.importe_total ?? 0) || undefined,
      fechaRegistro: row.created_at
        ? new Date(row.created_at)
        : row.fecha_registro
          ? new Date(row.fecha_registro)
          : new Date(),
      fechaInicio: parseFechaLocalOnly(row.fecha_inicio),
      fechaFin: parseFechaLocalOnly(row.fecha_fin),
      mesesRenta: row.duracion_meses ?? row.meses_renta ?? 1,
      duracionUnidad:
        String(row.duracion_unidad ?? "").toLowerCase().trim() === "dias"
          ? "dias"
          : String(row.duracion_unidad ?? "").toLowerCase().trim() === "meses"
            ? "meses"
            : undefined,
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
      costoVenta: row.costo_venta ?? row.costos ?? 0,
      comision: row.comisiones ?? row.comision ?? 0,
      comisionPorcentaje: Number(row.comision_porcentaje ?? 0) || 0,
      identificadorVenta: row.identificador_venta ?? undefined,
      porcentajeSocio:
        row.porcentaje_socio != null && row.porcentaje_socio !== ""
          ? Number(row.porcentaje_socio) || 0
          : undefined,
      gastosAdicionales: Number(row.gastos_adicionales ?? 0) || 0,
      ...(gastoDesdeNotas
        ? {
            gastoAdicionalMesIndice: gastoDesdeNotas.indice,
            gastoAdicionalEnDias: gastoDesdeNotas.enDias,
          }
        : {}),
      utilidadNeta: utilidadNetaDesdeFilaApi(row),
      pagoConsiderar: row.pago_considerar ?? undefined,
      consideracionMonto:
        row.consideracion_monto ?? row.pago_considerar ?? undefined,
      fuenteOrigen: row.fuente_origen ?? undefined,
      notas: row.notas ?? undefined,
    };
  };

  const refetchVentas = async () => {
    const data = (await backendApi.get("/api/ventas")) as any[];
    setVentasRegistradas(Array.isArray(data) ? data.map(mapVentaFromApi) : []);
  };

  // ── Cargar desde backend ──────────────────────────────────────────────
  useEffect(() => {
    const cargar = async () => {
      try {
        await refetchVentas();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/fetch|Failed to fetch|NETWORK|refused|reset/i.test(msg)) {
          console.warn(
            "[ventas] Sin conexión al API (¿backend en el puerto configurado?).",
          );
        } else {
          console.error("Error cargando ventas:", e);
        }
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

    const estadoApi = venta.estadoVenta?.toLowerCase() ?? "prospecto";

    const payload = {
      colaborador_id: venta.colaboradorId,
      producto_id: venta.productoId ?? null,
      producto_ids: venta.productoIds ?? (venta.productoId ? [venta.productoId] : []),
      cantidad: venta.cantidad ?? 1,
      precio_por_mes: venta.precioGeneral ?? 0,
      precio_unitario_manual:
        venta.precioGeneral ?? 0,
      tipo_pago_id: venta.tipoPagoId ?? null,
      estado: estadoApi,
      fecha_inicio: fechaParaInputDateLocal(venta.fechaInicio),
      fecha_fin: fechaParaInputDateLocal(venta.fechaFin),
      duracion_meses: venta.mesesRenta,
      duracion_unidad: venta.duracionUnidad === "dias" ? "dias" : "meses",
      vendido_a: venta.vendidoA,
      client_id: venta.clientId ?? null,
      vendedor_id: venta.vendedorId ?? venta.usuarioRegistroId ?? null,
      importe_total: venta.importeTotal ?? venta.precioTotal,
      pago_considerar: 0,
      consideracion_monto: 0,
      costos: venta.costoVenta ?? venta.costos ?? 0,
      costo_venta: venta.costoVenta ?? venta.costos ?? 0,
      comision: venta.comision ?? 0,
      comision_porcentaje: venta.comisionPorcentaje ?? 0,
      porcentaje_socio: venta.porcentajeSocio ?? 0,
      gastos_adicionales: venta.gastosAdicionales ?? 0,
      precio_pantallas_mensual: venta.precioPantallasMensual ?? 0,
      pantallas_detalle: venta.pantallasDetalle ?? [],
      costos_mes:
        Math.round(
          ((venta.costoVenta ?? venta.costos ?? 0) /
            Math.max(1, venta.mesesRenta ?? 1)) *
            100,
        ) / 100,
      costos_total: venta.costoVenta ?? venta.costos ?? 0,
      comision_mes: venta.comision ?? 0,
      comision_total: (venta.comision ?? 0) * venta.mesesRenta,
      pantallas_ids: venta.pantallasIds, // ✅ array completo
      notas: venta.notas ?? null,
      fuente_origen: venta.fuenteOrigen ?? null,
      identificador_venta: venta.identificadorVenta ?? null,
    };

    try {
      const { data, error } = await registrarVenta(payload); // ← una sola llamada

      if (error) {
        console.error("Error al guardar venta:", error);
        setErrorVenta(
          error instanceof Error
            ? `Error: ${error.message}`
            : "Error al guardar.",
        );
        // Importante: permitir que el modal muestre error y NO cierre como si fuera éxito.
        throw error instanceof Error
          ? error
          : new Error("Error al guardar la venta");
      }

      if (data) {
        setVentasRegistradas((prev) => [...prev, mapVentaFromApi(data)]);
        toast.success("Venta registrada correctamente.");
      }
    } catch (e) {
      console.error("Excepción al guardar venta:", e);
      const msg =
        e instanceof Error ? `Error: ${e.message}` : "Error desconocido.";
      setErrorVenta(msg);
      toast.error(msg);
      // Propagar para que RegistroVentaModal pueda capturarlo y no cerrar.
      throw e;
    }
  };

  const handleActualizarVentaConSupabase = async (venta: RegistroVenta) => {
    setErrorVenta(null);
    const estadoApi = venta.estadoVenta?.toLowerCase() ?? "prospecto";
    const payload: any = {
      colaborador_id: venta.colaboradorId,
      producto_id: venta.productoId ?? null,
      producto_ids: venta.productoIds ?? (venta.productoId ? [venta.productoId] : []),
      vendedor_id: venta.vendedorId ?? venta.usuarioRegistroId ?? null,
      precio_por_mes: venta.precioGeneral ?? 0,
      precio_unitario_manual: venta.precioGeneral ?? 0,
      estado: estadoApi,
      fecha_inicio: fechaParaInputDateLocal(venta.fechaInicio),
      fecha_fin: fechaParaInputDateLocal(venta.fechaFin),
      duracion_meses: venta.mesesRenta,
      duracion_unidad: venta.duracionUnidad === "dias" ? "dias" : "meses",
      vendido_a: venta.vendidoA,
      client_id: venta.clientId ?? null,
      importe_total: venta.importeTotal ?? venta.precioTotal,
      pago_considerar: 0,
      consideracion_monto: 0,
      costos: venta.costoVenta ?? venta.costos ?? 0,
      costo_venta: venta.costoVenta ?? venta.costos ?? 0,
      comision: venta.comision ?? 0,
      comision_porcentaje: venta.comisionPorcentaje ?? 0,
      porcentaje_socio: venta.porcentajeSocio ?? 0,
      gastos_adicionales: venta.gastosAdicionales ?? 0,
      precio_pantallas_mensual: venta.precioPantallasMensual ?? 0,
      pantallas_detalle: venta.pantallasDetalle ?? [],
      pantallas_ids: venta.pantallasIds,
      notas: venta.notas ?? null,
      fuente_origen: venta.fuenteOrigen ?? null,
      identificador_venta: venta.identificadorVenta ?? null,
    };
    if (venta.codigoEdicion) payload.codigo_edicion = venta.codigoEdicion;

    try {
      const data = await backendApi.patch(`/api/ventas/${venta.id}`, payload);
      setVentasRegistradas((prev) =>
        prev.map((v) => (String(v.id) === String(venta.id) ? mapVentaFromApi(data) : v)),
      );
      await refetchVentas();
      toast.success("Cambios guardados correctamente.");
    } catch (e) {
      const msg =
        e instanceof Error ? `Error: ${e.message}` : "No se pudo actualizar la venta";
      setErrorVenta(msg);
      toast.error(msg);
      throw e;
    }
  };

  // ── Eliminar venta ────────────────────────────────────────────────────
  const handleEliminarVenta = async (ventaId: string) => {
    try {
      await backendApi.del(`/api/ventas/${ventaId}`);
      setVentasRegistradas((prev) => prev.filter((v) => v.id !== ventaId));
      toast.success("Venta eliminada correctamente.");
    } catch (e) {
      const msg =
        e instanceof Error ? `Error: ${e.message}` : "No se pudo eliminar la venta";
      setErrorVenta(msg);
      toast.error(msg);
    }
  };

  return {
    ventasRegistradas,
    errorVenta,
    acciones: {
      handleRegistrarVentaConSupabase,
      handleActualizarVentaConSupabase,
      handleEliminarVenta,
      refetchVentas,
    },
  };
}
