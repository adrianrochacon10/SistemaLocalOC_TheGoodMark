import React, { useState, useEffect } from "react";
import {
  Usuario,
  Pantalla,
  Cliente,
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
import { CatalogoPantallas } from "../pantallas/CatalogoPantallas";
import { RegistroVentasNuevo } from "../ventas/RegistroVentasNuevo";
import { OrdenesMensualesNuevo } from "../ordenes/OrdenesMensualesNuevo";
import { AdminUsuarios } from "../admin/AdminUsuarios";
import "./Dashboard.css";

export const Dashboard: React.FC = () => {
  const { profile, loading, error: authError, signIn, signOut } = useAuth();
  
  const usuarioActual: Usuario = profile
    ? {
        id: profile.id,
        nombre: profile.nombre,
        email: profile.email,
        rol: profile.rol,
        activo: true,
      }
    : null

  const [errorVenta, setErrorVenta] = useState<string | null>(null);
  const [estadoBD, setEstadoBD] = useState<"checking" | "ok" | "error">(
    "checking",
  );
  const [mensajeBD, setMensajeBD] = useState<string | null>(null);

  // Estado del negocio
  const [tiposPago, setTiposPago] = useState<{ id: string; nombre: string }[]>([]);
  const [pantallas, setPantallas] = useState<Pantalla[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionPantalla[]>([]);
  const [ventasRegistradas, setVentasRegistradas] = useState<RegistroVenta[]>(
    [],
  );
  const [ordenes, setOrdenes] = useState<OrdenDeCompra[]>([]);

  // Configuración
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

  // Vista actual
  const [vistaActual, setVistaActual] = useState<
    "gestor" | "catalogo" | "ventas" | "ordenes" | "config" | "admin"
  >("ordenes");

  // Cargar datos desde localStorage (fallback) al iniciar
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

  // Cargar datos iniciales desde el backend cuando el usuario está autenticado
  useEffect(() => {
    if (!profile) return;

    const cargarDatos = async () => {
      try {
        // Clientes (misma API que /api/colaboradores)
        const colabsData = (await backendApi.get(
          "/api/clientes",
        )) as any[];
        const clientesNormalizados: Cliente[] = colabsData.map((row: any) => ({
          id: row.id,
          nombre: row.nombre,
          contacto: row.contacto ?? undefined,
          telefono: row.telefono ?? undefined,
          email: row.email ?? undefined,
          color: row.color ?? undefined,
          porcentajeSocio: row.porcentaje_socio ?? undefined,
          tipoPdf: row.tipo_pdf === 2 ? 2 : 1,
          activo: row.activo ?? true,
          fechaCreacion: row.fecha_creacion
            ? new Date(row.fecha_creacion)
            : new Date(),
        }));
        setClientes(clientesNormalizados);

        // Tipos de pago
        const tiposData = (await backendApi.get("/api/tipo-pago")) as any[];
        setTiposPago(Array.isArray(tiposData) ? tiposData.map((t: any) => ({ id: t.id, nombre: t.nombre })) : []);

        // Pantallas
        const pantallasData = (await backendApi.get("/api/pantallas")) as any[];
        const pantallasNormalizadas: Pantalla[] = pantallasData.map(
          (row: any) => ({
            id: row.id,
            nombre: row.nombre ?? row.nombre_pantalla,
            ubicacion: row.ubicacion ?? undefined,
            plaza: row.plaza ?? undefined,
            precioUnitario: row.precio_unitario ?? 0,
            activa: true,
            fechaCreacion: row.fecha_creacion
              ? new Date(row.fecha_creacion)
              : new Date(),
          }),
        );
        setPantallas(pantallasNormalizadas);

        // Ventas
        const ventasData = (await backendApi.get("/api/ventas")) as any[];
        const ventasNormalizadas: RegistroVenta[] = ventasData.map(
          (row: any) => ({
            id: row.id,
            pantallasIds: row.pantallas_ids ?? [],
            clienteId: row.colaborador_id ?? row.cliente_id,
            productoId: row.producto_id ?? undefined,
            vendidoA: row.vendido_a,
            precioGeneral: row.precio_general,
            fechaRegistro: row.fecha_registro
              ? new Date(row.fecha_registro)
              : new Date(),
            fechaInicio: new Date(row.fecha_inicio),
            fechaFin: new Date(row.fecha_fin),
            mesesRenta: row.meses_renta,
            importeTotal: row.importe_total,
            activo: row.activo ?? true,
            usuarioRegistroId: row.usuario_registro_id ?? "",
          }),
        );
        setVentasRegistradas(ventasNormalizadas);

        // Configuración de empresa
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

  // Guardar siempre una copia en localStorage (sin importar Supabase)
  useEffect(() => {
    if (!usuarioActual) return;
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
    usuarioActual,
  ]);

  const handleLogout = () => {
    signOut();
  };

  const handleRegistrarVentaConSupabase = async (venta: RegistroVenta) => {
    setErrorVenta(null);

    try {
      const { error } = await registrarVenta({
        pantallas_ids: venta.pantallasIds,
        colaborador_id: venta.clienteId,
        producto_id: venta.productoId ?? undefined,
        vendido_a: venta.vendidoA,
        precio_general: venta.precioGeneral,
        fecha_inicio: venta.fechaInicio.toISOString().slice(0, 10),
        fecha_fin: venta.fechaFin.toISOString().slice(0, 10),
        meses_renta: venta.mesesRenta,
        importe_total: venta.importeTotal,
        usuario_registro_id: usuarioActual.id,
      });

      if (error) {
        console.error("Error al guardar venta en Supabase:", error);
        setErrorVenta(
          error instanceof Error
            ? `La venta se guardó solo en este dispositivo.\nDetalle BD: ${error.message}`
            : "La venta se guardó solo en este dispositivo. Error al guardar en la base de datos."
        );
      }
    } catch (e) {
      console.error("Excepción al guardar venta en Supabase:", e);
      setErrorVenta(
        e instanceof Error
          ? `La venta se guardó solo en este dispositivo.\nDetalle BD: ${e.message}`
          : "La venta se guardó solo en este dispositivo. Error desconocido al guardar en la base de datos."
      );
    }

    // Siempre guardamos en estado/localStorage, aunque falle la BD remota
    setVentasRegistradas((prev) => [...prev, venta]);
  };

  const handleAgregarPantalla = async (pantalla: Pantalla) => {
    let pantallaParaEstado: Pantalla = pantalla;

    try {
      const data = await backendApi.post("/api/pantallas", {
        nombre: pantalla.nombre,
        ubicacion: pantalla.ubicacion ?? null,
        // ya no enviamos plaza ni precio al backend
        creadoPor: usuarioActual.id,
        actualizadoPor: usuarioActual.id,
      });

      if (data) {
        pantallaParaEstado = {
          id: data.id,
          nombre: data.nombre ?? data.nombre_pantalla,
          ubicacion: data.ubicacion ?? undefined,
          // mantenemos compatibilidad local con precioUnitario en 0
          precioUnitario: data.precio_unitario ?? 0,
          activa: true,
          fechaCreacion: data.fecha_creacion
            ? new Date(data.fecha_creacion)
            : pantalla.fechaCreacion,
        };
      }
    } catch (e) {
      console.error("Error guardando pantalla en backend:", e);
    }

    // Siempre actualizamos el estado, aunque falle backend
    setPantallas((prev) => {
      const existe = prev.find((p) => p.id === pantallaParaEstado.id);
      return existe
        ? prev.map((p) => (p.id === pantallaParaEstado.id ? pantallaParaEstado : p))
        : [...prev, pantallaParaEstado];
    });
  };

  const handleAgregarCliente = async (
    cliente: Cliente,
    extras?: { tipo_pago_id: string; pantalla_id: string },
  ) => {
    let clienteParaEstado: Cliente = cliente;

    if (extras?.tipo_pago_id && extras?.pantalla_id) {
      try {
        const data = await backendApi.post("/api/clientes", {
          nombre: cliente.nombre,
          contacto: cliente.contacto ?? null,
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
            contacto: data.contacto ?? undefined,
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
      // Si la asignación ya existe (por id), actualizarla, si no, agregarla
      const existe = prev.find((a) => a.id === asignacion.id);
      if (existe) {
        return prev.map((a) => (a.id === asignacion.id ? asignacion : a));
      } else {
        return [...prev, asignacion];
      }
    });
  };

  const handleRegistrarVenta = (venta: RegistroVenta) => {
    setVentasRegistradas((prev) => [...prev, venta]);
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

      if (data?.id) {
        setConfig((prev) => ({ ...prev, id: data.id }));
      }
    } catch (e) {
      console.error("Error guardando configuración en backend:", e);
      alert(
        e instanceof Error
          ? `Error al guardar configuración: ${e.message}`
          : "Error al guardar configuración de la empresa"
      );
    }
  };

  // Verificar conexión con Supabase (BD) después de autenticación
  useEffect(() => {
    if (!profile) return;

    let cancelado = false;

    const probarConexion = async () => {
      setEstadoBD("checking");
      setMensajeBD(null);
      try {
        await backendApi.get("/api/health");
        if (cancelado) return;
        setEstadoBD("ok");
        setMensajeBD(null);
      } catch (e) {
        if (cancelado) return;
        setEstadoBD("error");
        setMensajeBD(
          e instanceof Error ? e.message : "Error desconocido de conexión",
        );
      }
    };

    probarConexion();

    return () => {
      cancelado = true;
    };
  }, [profile]);

  // Quita solo la asignación colaborador–pantalla (la pantalla sigue en el catálogo)
  const handleDesasignarPantalla = (clienteId: string, pantallaId: string) => {
    setAsignaciones((prev) =>
      prev.filter(
        (a) => !(a.clienteId === clienteId && a.pantallaId === pantallaId),
      ),
    );
  };

  // Elimina todas las pantallas y asignaciones de un colaborador
  const eliminarPantallasYAsignacionesDeColaborador = (
    colaboradorId: string,
  ) => {
    // Obtener los IDs de pantallas asignadas a este colaborador
    const pantallasAsignadas = asignaciones
      .filter((a) => a.clienteId === colaboradorId)
      .map((a) => a.pantallaId);
    setAsignaciones((prev) =>
      prev.filter((a) => a.clienteId !== colaboradorId),
    );
    setPantallas((prev) =>
      prev.filter((p) => !pantallasAsignadas.includes(p.id)),
    );
  };

  if (loading) {
    return (
      <div className="dashboard-nuevo" style={{ padding: "2rem", textAlign: "center" }}>
        Cargando...
      </div>
    );
  }

  if (!profile || !usuarioActual) {
    return (
      <Login
        onSignIn={signIn}
        error={authError}
        loading={loading}
      />
    );
  }

  // Dashboard principal
  const esAdmin = usuarioActual.rol === "admin";

  return (
    <div className="dashboard-nuevo">
      {/* HEADER */}
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

      {/* NAVEGACIÓN */}
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

      {/* CONTENIDO */}
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

        {vistaActual === "catalogo" && (
          <CatalogoPantallas
            pantallas={pantallas}
            onAgregarPantalla={handleAgregarPantalla}
            onEliminarPantalla={handleEliminarPantalla}
          />
        )}

        {vistaActual === "ventas" && (
          <RegistroVentasNuevo
            pantallas={pantallas}
            asignaciones={asignaciones}
            clientes={clientes}
            ventasRegistradas={ventasRegistradas}
            usuarioActual={usuarioActual}
            onRegistrarVenta={handleRegistrarVentaConSupabase}
            errorExterno={errorVenta}
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
          <AdminUsuarios usuarioActualId={usuarioActual.id} />
        )}
      </main>
    </div>
  );
};
