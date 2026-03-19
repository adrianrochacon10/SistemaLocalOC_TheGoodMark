import React, { useState, useEffect } from "react";
import {
  Usuario,
  Pantalla,
  Colaborador,
  AsignacionPantalla,
  RegistroVenta,
  OrdenDeCompra,
  ConfiguracionEmpresa,
} from "../../types";
import { useAuth } from "../../hooks/useAuth";
import { registrarVenta } from "../../lib/ventas";
import { backendApi } from "../../lib/backendApi";
import { Login } from "../auth/Login";
import { GestorPantallasClientes } from "../pantallas/GestorPantallasClientes";
import { RegistroVentas } from "../ventas/RegistroVentas";
import { OrdenesMensualesNuevo } from "../ordenes/OrdenesMensualesNuevo";
import { AdminUsuarios } from "../admin/AdminUsuarios";
import "./Dashboard.css";

export const Dashboard: React.FC = () => {
  const { profile, loading, error: authError, signIn, signOut } = useAuth();

  const [errorVenta, setErrorVenta] = useState<string | null>(null);
  const [estadoBD, setEstadoBD] = useState<"checking" | "ok" | "error">(
    "checking",
  );
  const [mensajeBD, setMensajeBD] = useState<string | null>(null);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [tiposPago, setTiposPago] = useState<{ id: string; nombre: string }[]>(
    [],
  );
  const [productos, setProductos] = useState<
    { id: string; nombre: string; precio: number }[]
  >([]);
  const [pantallas, setPantallas] = useState<Pantalla[]>([]);
  const [clientes, setClientes] = useState<Colaborador[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionPantalla[]>([]);
  const [ventasRegistradas, setVentasRegistradas] = useState<RegistroVenta[]>(
    [],
  );
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

  const [vistaActual, setVistaActual] = useState<
    "gestor" | "catalogo" | "ventas" | "ordenes" | "config" | "admin"
  >("ordenes");

  // ─── HELPER: normaliza una fila de venta desde la API ────
  // ✅ itemsVenta se construye desde pantallas_ids
  const mapVentaFromApi = (row: any): RegistroVenta => {
    const pantallaId =
      row.colaborador?.pantalla_id ??
      row.cliente?.pantalla_id ??
      row.pantalla_id ??
      row.pantallas_ids?.[0];
    const pantallasIds: string[] =
      row.pantallas_ids ?? (pantallaId ? [pantallaId] : []);

    return {
      id: row.id,
      pantallasIds,
      // ✅ construye itemsVenta desde los ids disponibles
      itemsVenta: pantallasIds.map((pantallaId) => ({
        pantallaId,
        sinDescuento: false,
      })),
      clienteId: row.colaborador_id ?? row.cliente_id,
      productoId:
        row.colaborador?.producto_id ??
        row.cliente?.producto_id ??
        row.producto_id ??
        undefined,
      vendidoA:
        row.client_name ??
        row.vendido_a ??
        row.colaborador?.nombre ??
        row.cliente?.nombre ??
        "-",
      precioGeneral: row.precio_general ?? row.precio_por_mes ?? 0,
      cantidad: 1,
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
      estadoVenta: (() => {
        const ev = row.estado_venta ?? row.estado;
        if (!ev || typeof ev !== "string") return undefined;
        return (ev.charAt(0).toUpperCase() + ev.slice(1)) as
          | "Aceptado"
          | "Rechazado"
          | "Prospecto";
      })(),
      tipoPagoId: row.tipo_pago_id ?? row.tipo_pago?.id,
    };
  };

  // ─── CARGAR DESDE LOCALSTORAGE ───────────────────────────
  useEffect(() => {
    const datosGuardados = localStorage.getItem("datosApp");
    if (datosGuardados) {
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
    }
  }, []);

  // ─── CARGAR DESDE BACKEND ────────────────────────────────
  useEffect(() => {
    if (!profile) return;

    const cargarDatos = async () => {
      try {
        // Clientes
        const colabsData = (await backendApi.get("/api/colaboradores")) as any[];
        const clientesNormalizados: Colaborador[] = colabsData.map((row: any) => ({
          id: row.id,
          nombre: row.nombre,
          alias: row.contacto ?? undefined,
          telefono: row.telefono ?? undefined,
          email: row.email ?? undefined,
          color: row.color ?? undefined,
          porcentajeSocio: row.porcentaje_socio ?? undefined,
          tipoPdf: row.tipo_pdf === 2 ? 2 : 1,
          tipoPagoId: row.tipo_pago_id ?? row.tipo_pago?.id ?? undefined,
          pantallaId: row.pantalla_id ?? row.pantalla?.id,
          productoId: row.producto_id ?? row.producto?.id,
          activo: row.activo ?? true,
          fechaCreacion: row.created_at
            ? new Date(row.created_at)
            : row.fecha_creacion
              ? new Date(row.fecha_creacion)
              : new Date(),
        }));
        setClientes(clientesNormalizados);

        // Productos
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

        // Tipos de pago
        const tiposData = (await backendApi.get("/api/tipo-pago")) as any[];
        setTiposPago(
          Array.isArray(tiposData)
            ? tiposData.map((t: any) => ({ id: t.id, nombre: t.nombre }))
            : [],
        );

        // Pantallas
        const pantallasData = (await backendApi.get("/api/pantallas")) as any[];
        const pantallasNormalizadas: Pantalla[] = pantallasData.map(
          (row: any) => ({
            id: row.id,
            nombre: row.nombre ?? row.nombre_pantalla,
            ubicacion: row.ubicacion ?? row.direccion ?? undefined,
            plaza: row.plaza ?? undefined,
            precioUnitario: 0,
            activa: true,
            fechaCreacion: row.fecha_creacion
              ? new Date(row.fecha_creacion)
              : new Date(),
          }),
        );
        setPantallas(pantallasNormalizadas);

        // ✅ Ventas — usa mapVentaFromApi para incluir itemsVenta
        const ventasData = (await backendApi.get("/api/ventas")) as any[];
        setVentasRegistradas(ventasData.map(mapVentaFromApi));

        // Configuración
        const configData = await backendApi.get("/api/configuracion");
        if (configData) {
          setConfig({
            id: configData.id ?? "cfg1",
            nombreEmpresa:
              configData.nombre_empresa ?? "Mi Empresa de Pantallas",
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

  // ─── PERSISTIR EN LOCALSTORAGE ───────────────────────────
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
  }, [
    pantallas,
    clientes,
    asignaciones,
    ventasRegistradas,
    ordenes,
    config,
    profile,
  ]);

  // ─── VERIFICAR CONEXIÓN BD ───────────────────────────────
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

  if (loading) return <div className="cargando-perfil">Cargando perfil...</div>;
  if (!profile) return <Login onSignIn={signIn} error={authError} loading={loading} />;

  const usuarioActual: Usuario = {
    id: profile.id,
    nombre: profile.nombre,
    email: profile.email,
    rol: profile.rol,
    activo: true,
  };

  const handleCrearUsuario = (nuevoUsuario: Usuario) => {
    setUsuarios((prev) => [...prev, nuevoUsuario]);
  };

  const handleLogout = () => signOut();

  // ─── HANDLERS DE VENTA ───────────────────────────────────
  const handleRegistrarVentaConSupabase = async (venta: RegistroVenta) => {
    setErrorVenta(null);

    if (!venta.clienteId?.trim()) {
      setErrorVenta("Selecciona un colaborador");
      return;
    }

    const estadoApi = venta.estadoVenta?.toLowerCase() ?? "prospecto";
    const payload = {
      colaborador_id: venta.clienteId,
      tipo_pago_id: venta.tipoPagoId ?? null,
      estado_venta: estadoApi,
      client_name:
        venta.vendidoA && venta.vendidoA !== "-"
          ? venta.vendidoA.trim()
          : undefined,
      fecha_inicio: venta.fechaInicio.toISOString().slice(0, 10),
      fecha_fin: venta.fechaFin.toISOString().slice(0, 10),
      duracion_meses: venta.mesesRenta,
    };

    try {
      const { data, error } = await registrarVenta(payload);

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
      if (data) {
        setVentasRegistradas((prev) => [...prev, mapVentaFromApi(data)]);
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

  // ─── HANDLERS DE PANTALLA ────────────────────────────────
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
        ? prev.map((p) =>
            p.id === pantallaParaEstado.id ? pantallaParaEstado : p,
          )
        : [...prev, pantallaParaEstado];
    });
  };

  // ─── HANDLERS DE CLIENTE ─────────────────────────────────
  const handleAgregarCliente = async (
    cliente: Colaborador,
    extras?: { tipo_pago_id: string; pantalla_id: string; producto_id?: string },
  ) => {
    let clienteParaEstado: Colaborador = cliente;

    if (extras?.tipo_pago_id && extras?.pantalla_id) {
      try {
        const data = await backendApi.post("/api/colaboradores", {
          nombre: cliente.nombre,
          contacto: cliente.alias ?? null,
          telefono: cliente.telefono ?? null,
          email: cliente.email ?? null,
          tipo_pago_id: extras.tipo_pago_id,
          pantalla_id: extras.pantalla_id,
          producto_id: extras.producto_id ?? cliente.productoId ?? undefined,
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
        ? prev.map((c) =>
            c.id === clienteParaEstado.id ? clienteParaEstado : c,
          )
        : [...prev, clienteParaEstado];
    });
    return clienteParaEstado;
  };

  // ─── HANDLERS VARIOS ─────────────────────────────────────
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

  if (!profile || !usuarioActual) {
    return <Login onSignIn={signIn} error={authError} loading={loading} />;
  }

  const esAdmin = usuarioActual.rol === "admin";

  // ─── JSX ─────────────────────────────────────────────────
  return (
    <div className="dashboard-nuevo">
      <header className="dashboard-header-nuevo">
        <div className="header-left">
          <h1>The Good Mark</h1>
        </div>
        <div className="header-right">
          <div className="bd-status">
            {estadoBD === "checking" && <span>BD: verificando…</span>}
            {estadoBD === "ok" && <span>BD: conectada</span>}
            {estadoBD === "error" && <span>BD: error de conexión</span>}
          </div>
          <div className="usuario-info">
            <span className="usuario-nombre">{usuarioActual.nombre}</span>
            <span className="usuario-rol">{usuarioActual.rol}</span>
          </div>
          <button className="btn btn-logout" onClick={handleLogout}>
            Cerrar Sesión
          </button>
        </div>
      </header>

      <nav className="dashboard-nav-nuevo">
        <button
          className={`nav-btn-nuevo ${vistaActual === "gestor" ? "active" : ""}`}
          onClick={() => setVistaActual("gestor")}
        >
          👥 Colaboradores
        </button>
        <button
          className={`nav-btn-nuevo ${vistaActual === "ventas" ? "active" : ""}`}
          onClick={() => setVistaActual("ventas")}
        >
          💰 Registrar Ventas
        </button>
        <button
          className={`nav-btn-nuevo ${vistaActual === "ordenes" ? "active" : ""}`}
          onClick={() => setVistaActual("ordenes")}
        >
          📋 Órdenes Mensuales
        </button>
        <button
          className={`nav-btn-nuevo ${vistaActual === "config" ? "active" : ""}`}
          onClick={() => setVistaActual("config")}
        >
          ⚙️ Configuración
        </button>
        {esAdmin && (
          <button
            className={`nav-btn-nuevo ${vistaActual === "admin" ? "active" : ""}`}
            onClick={() => setVistaActual("admin")}
          >
            👤 Usuarios
          </button>
        )}
      </nav>

      <main className="dashboard-content-nuevo">
        {vistaActual === "gestor" && (
          <GestorPantallasClientes
            tiposPago={tiposPago}
            pantallas={pantallas}
            clientes={clientes}
            asignaciones={asignaciones}
            onAgregarPantalla={handleAgregarPantalla}
            onActualizarPantalla={handleAgregarPantalla}
            onEliminarPantalla={handleEliminarPantalla}
            onAgregarCliente={handleAgregarCliente}
            onActualizarCliente={handleAgregarCliente}
            onAsignarPantalla={handleAsignarPantalla}
            onDesasignarPantalla={handleDesasignarPantalla}
            onEliminarPantallasYAsignaciones={
              eliminarPantallasYAsignacionesDeColaborador
            }
          />
        )}

        {vistaActual === "ventas" && (
          <RegistroVentas
            pantallas={pantallas}
            asignaciones={asignaciones}
            clientes={clientes}
            ventasRegistradas={ventasRegistradas}
            usuarioActual={usuarioActual}
            onRegistrarVenta={handleRegistrarVentaConSupabase}
          />
        )}

        {vistaActual === "ordenes" && (
          <OrdenesMensualesNuevo
            ordenes={ordenes}
            ventasRegistradas={ventasRegistradas}
            config={config}
            usuarioActual={usuarioActual}
            clientes={clientes}
            pantallas={pantallas}
            onGenerarOrden={handleGenerarOrden}
          />
        )}

        {vistaActual === "config" && (
          <div className="config-panel">
            <h2>⚙️ Configuración de la Empresa</h2>
            <div className="config-form">
              <div className="form-group-config">
                <label>Nombre de la Empresa</label>
                <input
                  type="text"
                  value={config.nombreEmpresa}
                  onChange={(e) =>
                    setConfig({ ...config, nombreEmpresa: e.target.value })
                  }
                  className="config-input"
                />
              </div>
              <div className="form-group-config">
                <label>RFC</label>
                <input
                  type="text"
                  value={config.rfc || ""}
                  onChange={(e) =>
                    setConfig({ ...config, rfc: e.target.value })
                  }
                  className="config-input"
                />
              </div>
              <div className="form-group-config">
                <label>Dirección</label>
                <input
                  type="text"
                  value={config.direccion || ""}
                  onChange={(e) =>
                    setConfig({ ...config, direccion: e.target.value })
                  }
                  className="config-input"
                />
              </div>
              <div className="form-group-config">
                <label>Teléfono</label>
                <input
                  type="text"
                  value={config.telefono || ""}
                  onChange={(e) =>
                    setConfig({ ...config, telefono: e.target.value })
                  }
                  className="config-input"
                />
              </div>
              <div className="form-group-config">
                <label>Email</label>
                <input
                  type="email"
                  value={config.email || ""}
                  onChange={(e) =>
                    setConfig({ ...config, email: e.target.value })
                  }
                  className="config-input"
                />
              </div>
              <div className="form-group-config">
                <label>IVA (%)</label>
                <input
                  type="number"
                  value={config.ivaPercentaje}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      ivaPercentaje: parseFloat(e.target.value),
                    })
                  }
                  className="config-input"
                />
              </div>
              <button
                className="btn btn-primary"
                style={{ marginTop: "1rem" }}
                onClick={handleGuardarConfiguracion}
              >
                ✔️ Guardar Configuración
              </button>
            </div>
          </div>
        )}

        {vistaActual === "admin" && esAdmin && (
          <AdminUsuarios
            usuarioActualId={usuarioActual.id}
            usuarios={usuarios}
            onCrearUsuario={handleCrearUsuario}
          />
        )}
      </main>
    </div>
  );
};
