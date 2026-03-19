import { useState, useEffect } from "react";
import { RegistroVenta, Colaborador, AsignacionPantalla } from "../types";
import { backendApi } from "../lib/backendApi";
import { registrarVenta } from "../lib/ventas";

export function useVentas(
  profile: any,
  clientes: Colaborador[],
  asignaciones: AsignacionPantalla[],
) {
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
      clienteId: row.colaborador_id ?? row.cliente_id,
      productoId: row.producto_id ?? undefined,
      vendidoA: row.vendido_a ?? row.cliente?.nombre ?? "-",
      precioGeneral: row.precio_general ?? 0,
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
      importeTotal: row.precio_total ?? row.importe_total ?? 0,
      activo: row.activo ?? true,
      usuarioRegistroId: row.vendedor_id ?? row.usuario_registro_id ?? "",
      estadoVenta: row.estado
        ? ((row.estado.charAt(0).toUpperCase() + row.estado.slice(1)) as
            | "Aceptado"
            | "Rechazado"
            | "Prospecto")
        : undefined,
      tipoPagoId: row.tipo_pago_id ?? row.tipo_pago?.id,
    };
  };

  // Cargar desde backend
  useEffect(() => {
    if (!profile) return;
    const cargar = async () => {
      try {
        const data = (await backendApi.get("/api/ventas")) as any[];
        setVentasRegistradas(data.map(mapVentaFromApi));
      } catch (e) {
        console.error("Error cargando ventas:", e);
      }
    };
    cargar();
  }, [profile]);

  // Persistir
  useEffect(() => {
    if (!profile) return;
    try {
      localStorage.setItem("ventas", JSON.stringify(ventasRegistradas));
    } catch (e) {
      console.error("Error guardando ventas:", e);
    }
  }, [ventasRegistradas, profile]);

  // Cargar inicial
  useEffect(() => {
    const datos = localStorage.getItem("ventas");
    if (datos) {
      try {
        setVentasRegistradas(JSON.parse(datos));
      } catch (e) {
        console.error("Error cargando ventas desde localStorage:", e);
      }
    }
  }, []);

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
      cliente_id: venta.clienteId,
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
      setErrorVenta(
        e instanceof Error ? `Error: ${e.message}` : "Error desconocido.",
      );
      setVentasRegistradas((prev) => [...prev, venta]);
    }
  };

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
