import React, { useEffect, useState } from "react";
import { backendApi } from "../../lib/backendApi";
import "./AdminUsuarios.css";

interface UsuarioRow {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

interface AdminUsuariosProps {
  usuarioActualId: string;
}

export const AdminUsuarios: React.FC<AdminUsuariosProps> = ({
  usuarioActualId,
}) => {
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<"admin" | "usuario">("usuario");

  const cargarUsuarios = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = (await backendApi.get("/api/usuarios")) as UsuarioRow[];
      setUsuarios(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Error al cargar la lista de usuarios",
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const handleCrearUsuario = async () => {
    setError(null);
    if (!email.trim() || !password.trim() || !nombre.trim()) {
      setError("Email, contraseña y nombre son obligatorios");
      return;
    }
    try {
      await backendApi.post("/api/usuarios", {
        email: email.trim(),
        password: password.trim(),
        nombre: nombre.trim(),
        rol,
        creado_por: usuarioActualId,
      });
      setEmail("");
      setPassword("");
      setNombre("");
      setRol("usuario");
      await cargarUsuarios();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Error al crear el usuario nuevo",
      );
    }
  };

  return (
    <div className="admin-usuarios">
      <h2>👤 Administración de Usuarios</h2>

      <div className="admin-usuarios-grid">
        <div className="admin-usuarios-form">
          <h3>Crear nuevo usuario</h3>
          <div className="form-group-config">
            <label>Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre completo"
            />
          </div>
          <div className="form-group-config">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@empresa.com"
            />
          </div>
          <div className="form-group-config">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña inicial"
            />
          </div>
          <div className="form-group-config">
            <label>Rol</label>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value as "admin" | "usuario")}
            >
              <option value="usuario">Gerente de Ventas</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          {error && <div className="error-message">{error}</div>}
          <button
            className="btn btn-primary"
            style={{ marginTop: "1rem" }}
            onClick={handleCrearUsuario}
          >
            ➕ Crear Usuario
          </button>
        </div>

        <div className="admin-usuarios-lista">
          <h3>Usuarios registrados</h3>
          {cargando ? (
            <p>Cargando usuarios…</p>
          ) : usuarios.length === 0 ? (
            <p>No hay usuarios registrados aún.</p>
          ) : (
            <table className="tabla-usuarios">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td>{u.nombre}</td>
                    <td>{u.email}</td>
                    <td>{u.rol === "admin" ? "Administrador" : "Gerente Ventas"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

