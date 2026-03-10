import React, { useState } from "react";
import { Login } from "../auth/Login";
import { GestorPantallasClientes } from "../pantallas/GestorPantallasClientes";
import { RegistroVentasNuevo } from "../ventas/RegistroVentasNuevo";
import { OrdenesMensualesNuevo } from "../ordenes/OrdenesMensualesNuevo";
import { AdminUsuarios } from "../admin/AdminUsuarios";
import "./Dashboard.css";
import { useDashboardData } from "../../hooks/useDashboardData";

export const Dashboard: React.FC = () => {
  const {
    auth: { profile, loading, authError, signIn, signOut },
    estadoBD,
    errorVenta,
    datos,
    acciones,
  } = useDashboardData();

  const [vistaActual, setVistaActual] = useState<
    "gestor" | "catalogo" | "ventas" | "ordenes" | "config" | "admin"
  >("ordenes");

  if (loading) {
    return <div className="cargando-perfil">Cargando perfil...</div>;
  }

  if (!profile) {
    return <Login onSignIn={signIn} error={authError} loading={loading} />;
  }

  const usuarioActual = {
    id: profile.id,
    nombre: profile.nombre,
    email: profile.email,
    rol: profile.rol,
    activo: true,
  };

  const esAdmin = usuarioActual.rol === "admin";

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
          <button className="btn btn-logout" onClick={signOut}>
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
            tiposPago={datos.tiposPago}
            pantallas={datos.pantallas}
            clientes={datos.clientes}
            asignaciones={datos.asignaciones}
            onAgregarPantalla={acciones.handleAgregarPantalla}
            onActualizarPantalla={acciones.handleAgregarPantalla}
            onEliminarPantalla={acciones.handleEliminarPantalla}
            onAgregarCliente={acciones.handleAgregarCliente}
            onActualizarCliente={acciones.handleAgregarCliente}
            onAsignarPantalla={acciones.handleAsignarPantalla}
            onDesasignarPantalla={acciones.handleDesasignarPantalla}
            onEliminarPantallasYAsignaciones={
              acciones.eliminarPantallasYAsignacionesDeColaborador
            }
          />
        )}

        {vistaActual === "ventas" && (
          <RegistroVentasNuevo
            pantallas={datos.pantallas}
            asignaciones={datos.asignaciones}
            asignacionProductos={datos.asignacionesProductos}
            clientes={datos.clientes}
            productos={datos.productos}
            ventasRegistradas={datos.ventasRegistradas}
            usuarioActual={usuarioActual}
            onRegistrarVenta={acciones.handleRegistrarVentaConSupabase}
            onEliminarVenta={acciones.handleEliminarVenta}
            errorExterno={errorVenta}
          />
        )}

        {vistaActual === "ordenes" && (
          <OrdenesMensualesNuevo
            ordenes={datos.ordenes}
            ventasRegistradas={datos.ventasRegistradas}
            config={datos.config}
            usuarioActual={usuarioActual}
            clientes={datos.clientes}
            pantallas={datos.pantallas}
            onGenerarOrden={acciones.handleGenerarOrden}
          />
        )}

        {vistaActual === "config" && (
          <div className="config-panel">
            {/* igual que antes pero usando datos.config y acciones.handleGuardarConfiguracion */}
          </div>
        )}

        {vistaActual === "admin" && esAdmin && (
          <AdminUsuarios
            usuarioActualId={usuarioActual.id}
            usuarios={datos.usuarios}
            onCrearUsuario={acciones.handleCrearUsuario}
          />
        )}
      </main>
    </div>
  );
};
