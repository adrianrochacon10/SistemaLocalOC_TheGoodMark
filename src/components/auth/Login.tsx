import React, { useState } from "react";
import "./Login.css";

interface LoginProps {
  onSignIn: (email: string, password: string) => Promise<{ error: unknown } | void>;
  error: string | null;
  loading?: boolean;
}

export const Login: React.FC<LoginProps> = ({
  onSignIn,
  error: errorProp,
  loading = false,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setSubmitting(true);
    const result = await onSignIn(email.trim(), password);
    setSubmitting(false);
    if (result?.error) {
      setPassword("");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Sistema de Órdenes de Compra</h1>
        <p className="login-subtitle">Inicia sesión con tu correo</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Correo</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@empresa.com"
              className="form-select"
              autoComplete="email"
              disabled={loading || submitting}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-select"
              autoComplete="current-password"
              disabled={loading || submitting}
            />
          </div>

          {(errorProp || (submitting && !errorProp)) && (
            <div className="error-message">
              {errorProp || "Verificando..."}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading || submitting || !email.trim() || !password}
          >
            {submitting ? "Entrando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
};
