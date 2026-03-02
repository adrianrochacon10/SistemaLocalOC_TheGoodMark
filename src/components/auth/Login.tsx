import React, { useState } from "react";
import { Usuario } from "../../types";
import "./Login.css";

interface LoginProps {
  usuarios: Usuario[];
  onLogin: (usuario: Usuario) => void;
}

export const Login: React.FC<LoginProps> = ({ usuarios, onLogin }) => {
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleLogin = () => {
    if (!usuarioSeleccionado) {
      setError("Por favor selecciona un usuario");
      return;
    }

    const usuario = usuarios.find((u) => u.id === usuarioSeleccionado);
    if (usuario) {
      onLogin(usuario);
    } else {
      setError("Usuario no encontrado");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Sistema de Órdenes de Compra</h1>
        <p className="login-subtitle">Inicia sesión para continuar</p>

        <div className="login-form">
          <div className="form-group">
            <label htmlFor="usuario">Selecciona tu usuario:</label>
            <select
              id="usuario"
              value={usuarioSeleccionado}
              onChange={(e) => {
                setUsuarioSeleccionado(e.target.value);
                setError("");
              }}
              className="form-select"
            >
              <option value="">-- Seleccionar usuario --</option>
              {usuarios
                .filter((u) => u.activo)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}
                  </option>
                ))}
            </select>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button className="btn btn-primary btn-lg" onClick={handleLogin}>
            Ingresar
          </button>
        </div>
      </div>
    </div>
  );
};
