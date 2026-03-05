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
import { Login } from "../auth/Login";
import { GestorPantallasClientes } from "../pantallas/GestorPantallasClientes";
import { RegistroVentasNuevo } from "../ventas/RegistroVentasNuevo";
import { OrdenesMensualesNuevo } from "../ordenes/OrdenesMensualesNuevo";
import "./Dashboard.css";

export const Dashboard: React.FC = () => {
  // Estado de autenticación
  const [usuarioActual, setUsuarioActual] = useState<Usuario | null>(null);
  const [usuarios] = useState<Usuario[]>([
    {
      id: "u1",
      nombre: "Admin",
      email: "admin@empresa.com",
      rol: "admin",
      activo: true,
    },
    {
      id: "u2",
      nombre: "Gerente de Ventas",
      email: "ventas@empresa.com",
      rol: "usuario",
      activo: true,
    },
  ]);

  // Estado del negocio
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
    "gestor" | "ventas" | "ordenes" | "config"
  >("ordenes");

  // Cargar datos del localStorage
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
        console.error("Error cargando datos", e);
      }
    }
  }, []);

  // Guardar datos en localStorage
  useEffect(() => {
    if (usuarioActual) {
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

  // Handlers
  const handleLogin = (usuario: Usuario) => {
    setUsuarioActual(usuario);
  };

  const handleLogout = () => {
    setUsuarioActual(null);
  };

  const handleAgregarPantalla = (pantalla: Pantalla) => {
    setPantallas((prev) => {
      // Si la pantalla ya existe (por id), actualizarla, si no, agregarla
      const existe = prev.find((p) => p.id === pantalla.id);
      if (existe) {
        return prev.map((p) => (p.id === pantalla.id ? pantalla : p));
      } else {
        return [...prev, pantalla];
      }
    });
  };

  const handleAgregarCliente = (cliente: Cliente) => {
    setClientes((prev) => {
      const existe = prev.find((c) => c.id === cliente.id);
      if (existe) {
        // Actualizar cliente existente
        return prev.map((c) => (c.id === cliente.id ? cliente : c));
      } else {
        // Agregar nuevo cliente
        return [...prev, cliente];
      }
    });
  };

  const handleEliminarPantalla = (pantallaId: string) => {
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

  // Agregar handler en Dashboard.tsx
  const handleEliminarVenta = (ventaId: string) => {
    setVentasRegistradas((prev) => prev.filter((v) => v.id !== ventaId));
  };

  const handleGenerarOrden = (orden: OrdenDeCompra) => {
    setOrdenes((prev) => [...prev, orden]);
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

  // Si no hay usuario, mostrar login
  if (!usuarioActual) {
    return <Login usuarios={usuarios} onLogin={handleLogin} />;
  }

  // Dashboard principal
  return (
    <div className="dashboard-nuevo">
      {/* HEADER */}
      <header className="dashboard-header-nuevo">
        <div className="header-left">
          <h1>The Good Mark</h1>
        </div>
        <div className="header-right">
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
          Gestion de Colaboradores
        </button>
        <button
          className={`nav-btn-nuevo ${vistaActual === "ventas" ? "active" : ""}`}
          onClick={() => setVistaActual("ventas")}
        >
          Registrar Ventas
        </button>
        <button
          className={`nav-btn-nuevo ${vistaActual === "ordenes" ? "active" : ""}`}
          onClick={() => setVistaActual("ordenes")}
        >
          Órdenes Mensuales
        </button>
        <button
          className={`nav-btn-nuevo ${vistaActual === "config" ? "active" : ""}`}
          onClick={() => setVistaActual("config")}
        >
          Configuración
        </button>
      </nav>

      {/* CONTENIDO */}
      <main className="dashboard-content-nuevo">
        {vistaActual === "gestor" && (
          <GestorPantallasClientes
            pantallas={pantallas}
            clientes={clientes}
            asignaciones={asignaciones}
            onAgregarPantalla={handleAgregarPantalla}
            onActualizarPantalla={handleAgregarPantalla}
            onEliminarPantalla={handleEliminarPantalla}
            onAgregarCliente={handleAgregarCliente}
            onActualizarCliente={handleAgregarCliente}
            onAsignarPantalla={handleAsignarPantalla}
            onEliminarPantallasYAsignaciones={
              eliminarPantallasYAsignacionesDeColaborador
            }
          />
        )}

        {vistaActual === "ventas" && (
          <RegistroVentasNuevo
            pantallas={pantallas}
            asignaciones={asignaciones}
            clientes={clientes}
            ventasRegistradas={ventasRegistradas}
            usuarioActual={usuarioActual}
            onRegistrarVenta={handleRegistrarVenta}
            onEliminarVenta={handleEliminarVenta}
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

              <button className="btn btn-primary" style={{ marginTop: "1rem" }}>
                ✔️ Guardar Configuración
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
