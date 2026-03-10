import { useEffect, useState } from "react";
import {
  Usuario,
  Pantalla,
  Colaborador,
  AsignacionPantalla,
  RegistroVenta,
  OrdenDeCompra,
  ConfiguracionEmpresa,
} from "../types";
import { useAuth } from "../hooks/useAuth";
import { backendApi } from "../lib/backendApi";
import { registrarVenta } from "../lib/ventas";

type EstadoBD = "checking" | "ok" | "error";

export function useDashboardData() {
  const { profile, loading, error: authError, signIn, signOut } = useAuth();

  const [estadoBD, setEstadoBD] = useState<EstadoBD>("checking");
  const [mensajeBD, setMensajeBD] = useState<string | null>(null);
  const [errorVenta, setErrorVenta] = useState<string | null>(null);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [tiposPago, setTiposPago] = useState<{ id: string; nombre: string }[]>([]);
  const [productos, setProductos] = useState<{ id: string; nombre: string; precio: number }[]>([]);
  const [pantallas, setPantallas] = useState<Pantalla[]>([]);
  const [clientes, setClientes] = useState<Colaborador[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionPantalla[]>([]);
  const [ventasRegistradas, setVentasRegistradas] = useState<RegistroVenta[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenDeCompra[]>([]);
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

  // localStorage inicial
  useEffect(() => {
    const datosGuardados = localStorage.getItem("datosApp");
    if (!datosGuardados) return;
    try {
      const datos = JSON.parse(datosGuardados);
      setPantallas(datos.pantallas || []);
      setClientes(datos.clientes || []);
      setAsignaciones(datos.asignaciones || []);
      setVentasRegistradas(datos.ventasRegistradas || []);
      setOrdenes(datos.ordenes || []);
      setConfig(datos.config || config);
    } catch (e) {
      console.error("Error cargando datos desde localStorage", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // cargar desde backend
  useEffect(() => {
    if (!profile) return;

    const cargarDatos = async () => {
      try {
        const colabsData = (await backendApi.get("/api/clientes")) as any[];
        const clientesNormalizados: Colaborador[] = colabsData.map((row: any) => ({
          id: row.id,
          nombre: row.nombre,
          contacto: row.contacto ?? undefined,
          telefono: row.telefono ?? undefined,
          email: row.email ?? undefined,
          color: row.color ?? undefined,
          porcentajeSocio: row.porcentaje_socio ?? undefined,
          tipoPdf: row.tipo_pdf === 2 ? 2 : 1,
          tipoPagoId: row.tipo_pago_id ?? row.tipo_pago?.id ?? undefined,
          activo: row.activo ?? true,
          fechaCreacion: row.fecha_creacion ? new Date(row.fecha_creacion) : new Date(),
        }));
        setClientes(clientesNormalizados);

        const productosData = (await backendApi.get("/api/productos")) as any[];
        setProductos(
          Array.isArray(productosData)
            ? productosData.map((p: any) => ({
                id: p.id,
                nombre: p.nombre,
                precio: Number(p.precio) || 0,
              }))
            : [],
        );

        const tiposData = (await backendApi.get("/api/tipo-pago")) as any[];
        setTiposPago(
          Array.isArray(tiposData)
            ? tiposData.map((t: any) => ({ id: t.id, nombre: t.nombre }))
            : [],
        );

        const pantallasData = (await backendApi.get("/api/pantallas")) as any[];
        const pantallasNormalizadas: Pantalla[] = pantallasData.map((row: any) => ({
          id: row.id,
          nombre: row.nombre ?? row.nombre_pantalla,
          ubicacion: row.ubicacion ?? row.direccion ?? undefined,
          plaza: row.plaza ?? undefined,
          precioUnitario: 0,
          activa: true,
          fechaCreacion: row.fecha_creacion ? new Date(row.fecha_creacion) : new Date(),
        }));
        setPantallas(pantallasNormalizadas);

        const ventasData = (await backendApi.get("/api/ventas")) as any[];
        setVentasRegistradas(ventasData.map(mapVentaFromApi));

        const configData = await backendApi.get("/api/configuracion");
        if (configData) {
          setConfig({
            id: configData.id ?? "cfg1",
            nombreEmpresa: configData.nombre_empresa ?? "Mi Empresa de Pantallas",
            rfc: configData.rfc ?? undefined,
            direccion: configData.direccion ?? undefined,
            telefono: configData.telefono ?? undefined,
            email: configData.email ?? undefined,
            ivaPercentaje: configData.iva_percentaje ?? 16,
            activo: configData.activo ?? true,
          });
        }
      } catch (e) {
        console.error("Error cargando datos iniciales desde backend:", e);
      }
    };

    cargarDatos();
  }, [profile]);

  // persistir en localStorage
  useEffect(() => {
    if (!profile) return;
    try {
      localStorage.setItem(
        "datosApp",
        JSON.stringify({
          pantallas,
          clientes,
          asignaciones,
          ventasRegistradas,
          ordenes,
          config,
        }),
      );
    } catch (e) {
      console.error("Error guardando datos en localStorage", e);
    }
  }, [pantallas, clientes, asignaciones, ventasRegistradas, ordenes, config, profile]);

  // healthcheck BD
  useEffect(() => {
    if (!profile) return;
    let cancelado = false;

    const probarConexion = async () => {
      setEstadoBD("checking");
      setMensajeBD(null);
      try {
        await backendApi.get("/api/health");
        if (!cancelado) {
          setEstadoBD("ok");
          setMensajeBD(null);
        }
      } catch (e) {
        if (!cancelado) {
          setEstadoBD("error");
          setMensajeBD(
            e instanceof Error ? e.message : "Error desconocido de conexión",
          );
        }
      }
    };

    probarConexion();
    return () => {
      cancelado = true;
    };
  }, [profile]);

  // handlers (mismos que ya tenías)
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
        venta.precioGeneral > 0 && !venta.productoId ? venta.precioGeneral : null,
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
          console.error("Error al guardar venta en Supabase:", error);
          setErrorVenta(
            error instanceof Error
              ? `Error al guardar: ${error.message}`
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
      console.error("Excepción al guardar venta en Supabase:", e);
      setErrorVenta(
        e instanceof Error
          ? `Error: ${e.message}`
          : "Error desconocido al guardar en la base de datos.",
      );
      setVentasRegistradas((prev) => [...prev, venta]);
    }
  };

  const handleEliminarVenta = (ventaId: string) => {
    setVentasRegistradas((prev) => prev.filter((v) => v.id !== ventaId));
  };

  const handleAgregarPantalla = async (pantalla: Pantalla) => {
    let pantallaParaEstado: Pantalla = pantalla;
    try {
      const data = await backendApi.post("/api/pantallas", {
        nombre: pantalla.nombre,
        direccion: pantalla.ubicacion ?? null,
      });

      if (data) {
        pantallaParaEstado = {
          id: data.id,
          nombre: data.nombre ?? data.nombre_pantalla,
          ubicacion: data.ubicacion ?? data.direccion ?? undefined,
          precioUnitario: Number(data.precio ?? data.precio_unitario ?? 0) || 0,
          activa: true,
          fechaCreacion:
            (data.fecha_creacion ?? data.created_at)
              ? new Date(data.fecha_creacion ?? data.created_at)
              : pantalla.fechaCreacion,
        };
      }
    } catch (e) {
      console.error("Error guardando pantalla en backend:", e);
    }

    setPantallas((prev) => {
      const existe = prev.find((p) => p.id === pantallaParaEstado.id);
      return existe
        ? prev.map((p) => (p.id === pantallaParaEstado.id ? pantallaParaEstado : p))
        : [...prev, pantallaParaEstado];
    });
  };

  const handleAgregarCliente = async (
    cliente: Colaborador,
    extras?: { tipo_pago_id: string; pantalla_id: string },
  ) => {
    let clienteParaEstado: Colaborador = cliente;

    if (extras?.tipo_pago_id && extras?.pantalla_id) {
      try {
        const data = await backendApi.post("/api/clientes", {
          nombre: cliente.nombre,
          contacto: cliente.alias ?? null,
          telefono: cliente.telefono ?? null,
          email: cliente.email ?? null,
          tipo_pago_id: extras.tipo_pago_id,
          pantalla_id: extras.pantalla_id,
          tipo_pdf: cliente.tipoPdf ?? 1,
        });

        if (data) {
          clienteParaEstado = {
            id: data.id,
            nombre: data.nombre,
            alias: data.contacto ?? undefined,
            telefono: data.telefono ?? undefined,
            email: data.email ?? undefined,
            color: (data as any).color ?? undefined,
            porcentajeSocio: (data as any).porcentaje_socio ?? undefined,
            tipoPdf: (data as any).tipo_pdf === 2 ? 2 : 1,
            activo: (data as any).activo ?? true,
            fechaCreacion: data.created_at
              ? new Date(data.created_at)
              : new Date(),
          };
        }
      } catch (e) {
        console.error("Error guardando cliente en backend:", e);
        throw e;
      }
    }

    setClientes((prev) => {
      const existe = prev.find((c) => c.id === clienteParaEstado.id);
      return existe
        ? prev.map((c) => (c.id === clienteParaEstado.id ? clienteParaEstado : c))
        : [...prev, clienteParaEstado];
    });
    return clienteParaEstado;
  };

  const handleEliminarPantalla = async (pantallaId: string) => {
    try {
      await backendApi.del(`/api/pantallas/${pantallaId}`);
    } catch (e) {
      console.error("Error eliminando pantalla en backend:", e);
    }
    setPantallas((prev) => prev.filter((p) => p.id !== pantallaId));
    setAsignaciones((prev) => prev.filter((a) => a.pantallaId !== pantallaId));
  };

  const handleAsignarPantalla = (asignacion: AsignacionPantalla) => {
    setAsignaciones((prev) => {
      const existe = prev.find((a) => a.id === asignacion.id);
      return existe
        ? prev.map((a) => (a.id === asignacion.id ? asignacion : a))
        : [...prev, asignacion];
    });
  };

  const handleGenerarOrden = (orden: OrdenDeCompra) => {
    setOrdenes((prev) => [...prev, orden]);
  };

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
      console.error("Error guardando configuración en backend:", e);
      alert(
        e instanceof Error
          ? `Error al guardar configuración: ${e.message}`
          : "Error al guardar configuración de la empresa",
      );
    }
  };

  const handleDesasignarPantalla = (clienteId: string, pantallaId: string) => {
    setAsignaciones((prev) =>
      prev.filter(
        (a) => !(a.clienteId === clienteId && a.pantallaId === pantallaId),
      ),
    );
  };

  const eliminarPantallasYAsignacionesDeColaborador = async (
    colaboradorId: string,
  ) => {
    try {
      await backendApi.del(`/api/colaboradores/${colaboradorId}`);
    } catch (e) {
      console.error("Error eliminando colaborador en backend:", e);
    }

    const pantallasAsignadas = asignaciones
      .filter((a) => a.clienteId === colaboradorId)
      .map((a) => a.pantallaId);

    setClientes((prev) => prev.filter((c) => c.id !== colaboradorId));
    setAsignaciones((prev) =>
      prev.filter((a) => a.clienteId !== colaboradorId),
    );
    setPantallas((prev) =>
      prev.filter((p) => !pantallasAsignadas.includes(p.id)),
    );
  };

  const handleCrearUsuario = (nuevoUsuario: Usuario) => {
    setUsuarios((prev) => [...prev, nuevoUsuario]);
  };

  return {
    auth: { profile, loading, authError, signIn, signOut },
    estadoBD,
    mensajeBD,
    errorVenta,
    datos: {
      usuarios,
      tiposPago,
      productos,
      pantallas,
      clientes,
      asignaciones,
      ventasRegistradas,
      ordenes,
      config,
    },
    acciones: {
      handleRegistrarVentaConSupabase,
      handleEliminarVenta,
      handleAgregarPantalla,
      handleAgregarCliente,
      handleEliminarPantalla,
      handleAsignarPantalla,
      handleGenerarOrden,
      handleGuardarConfiguracion,
      handleDesasignarPantalla,
      eliminarPantallasYAsignacionesDeColaborador,
      handleCrearUsuario,
    },
  };
}
