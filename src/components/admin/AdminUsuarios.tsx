// // AdminUsuarios.tsx
// import React, { useEffect, useState } from "react";
// import { backendApi } from "../../lib/backendApi";
// import { InputField } from "../ui/InputField";
// import { SelectField } from "../ui/SelectField";
// import { BotonAccion } from "../ui/BotonAccion";
// import "./AdminUsuarios.css";

// interface UsuarioRow {
//   id: string;
//   nombre: string;
//   email: string;
//   rol: string;
// }

// interface AdminUsuariosProps {
//   usuarioActualId: string;
// }

// const labelRol = (rol: string) => {
//   if (rol === "admin") return "Administrador";
//   if (rol === "usuario") return "Gerente de Ventas";
//   return rol;
// };

// const OPCIONES_ROL = [
//   { value: "usuario", label: "Gerente de Ventas" },
//   { value: "admin",   label: "Administrador" },
// ];

// export const AdminUsuarios: React.FC<AdminUsuariosProps> = ({
//   usuarioActualId,
// }) => {
//   const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
//   const [cargando, setCargando] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [exito, setExito] = useState<string | null>(null);

//   const [nombre, setNombre]     = useState("");
//   const [email, setEmail]       = useState("");
//   const [password, setPassword] = useState("");
//   const [rol, setRol]           = useState("usuario");

//   const cargarUsuarios = async () => {
//     setCargando(true);
//     setError(null);
//     try {
//       const data = (await backendApi.get("/api/usuarios")) as UsuarioRow[];
//       setUsuarios(data);
//     } catch (e) {
//       setError(e instanceof Error ? e.message : "Error al cargar usuarios");
//     } finally {
//       setCargando(false);
//     }
//   };

//   useEffect(() => { cargarUsuarios(); }, []);

//   const handleCrearUsuario = async () => {
//     setError(null);
//     setExito(null);
//     if (!nombre.trim() || !email.trim() || !password.trim()) {
//       setError("Nombre, email y contraseña son obligatorios");
//       return;
//     }
//     try {
//       await backendApi.post("/api/usuarios", {
//         email:     email.trim(),
//         password:  password.trim(),
//         nombre:    nombre.trim(),
//         rol,
//         creado_por: usuarioActualId,
//       });
//       setNombre(""); setEmail(""); setPassword(""); setRol("usuario");
//       setExito("Usuario creado correctamente");
//       setTimeout(() => setExito(null), 3000);
//       await cargarUsuarios();
//     } catch (e) {
//       setError(e instanceof Error ? e.message : "Error al crear el usuario");
//     }
//   };

//   return (
//     <div className="admin-usuarios">
//       <h2 className="admin-usuarios-titulo">👤 Administración de Usuarios</h2>

//       <div className="admin-usuarios-grid">

//         {/* FORMULARIO */}
//         <div className="admin-card">
//           <h3 className="admin-card-titulo">Crear nuevo usuario</h3>

//           <InputField
//             label="Nombre"
//             value={nombre}
//             onChange={setNombre}
//             placeholder="Nombre completo"
//           />
//           <InputField
//             label="Email"
//             value={email}
//             onChange={setEmail}
//             placeholder="correo@empresa.com"
//           />
//           <InputField
//             label="Contraseña"
//             value={password}
//             onChange={setPassword}
//             placeholder="Contraseña inicial"
//           />
//           <SelectField
//             label="Rol"
//             value={rol}
//             onChange={setRol}
//             options={OPCIONES_ROL}
//           />

//           {error && <div className="error-message">{error}</div>}
//           {exito && <div className="success-message">{exito}</div>}

//           <BotonAccion onClick={handleCrearUsuario} variante="primario" fullWidth>
//             ➕ Crear Usuario
//           </BotonAccion>
//         </div>

//         {/* LISTA */}
//         <div className="admin-card">
//           <h3 className="admin-card-titulo">Usuarios registrados</h3>

//           {cargando ? (
//             <p className="admin-estado-texto">Cargando usuarios…</p>
//           ) : usuarios.length === 0 ? (
//             <p className="admin-estado-texto">No hay usuarios registrados aún.</p>
//           ) : (
//             <table className="tabla-usuarios">
//               <thead>
//                 <tr>
//                   <th>Nombre</th>
//                   <th>Email</th>
//                   <th>Rol</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {usuarios.map((u) => (
//                   <tr key={u.id}>
//                     <td>{u.nombre}</td>
//                     <td>{u.email}</td>
//                     <td>
//                       <span className={`badge-rol badge-rol--${u.rol}`}>
//                         {labelRol(u.rol)}
//                       </span>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           )}
//         </div>

//       </div>
//     </div>
//   );
// }

// ;

import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { backendApi } from "../../lib/backendApi";
import { InputField } from "../ui/InputField";
import { SelectField } from "../ui/SelectField";
import { BotonAccion } from "../ui/BotonAccion";
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

const labelRol = (rol: string) => {
  if (rol === "admin") return "Administrador";
  if (rol === "usuario" || rol === "vendedor") return "Vendedor";
  return rol;
};

export const AdminUsuarios: React.FC<AdminUsuariosProps> = ({
  usuarioActualId,
}) => {
  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [cargando, setCargando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [rolEdicion, setRolEdicion] = useState("vendedor");
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const OPCIONES_ROL = [
    { value: "vendedor", label: "Vendedor" },
    { value: "admin", label: "Administrador" },
  ];

  const cargarUsuarios = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = (await backendApi.get("/api/vendedores")) as UsuarioRow[];
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al cargar usuarios";
      setError(msg);
      toast.error(msg);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    void cargarUsuarios();
  }, []);

  const handleCrearUsuario = async () => {
    setError(null);
    setExito(null);

    if (!nombre.trim() || !email.trim() || !password.trim()) {
      const msg = "Nombre, email y contraseña son obligatorios";
      setError(msg);
      toast.warning(msg);
      return;
    }

    if (usuarios.some((u) => u.email === email.trim())) {
      const msg = "Ya existe un usuario con ese email";
      setError(msg);
      toast.warning(msg);
      return;
    }

    try {
      const nuevo = (await backendApi.post("/api/vendedores", {
        nombre: nombre.trim(),
        email: email.trim(),
        password: password.trim(),
        rol: rolEdicion,
        creado_por: usuarioActualId,
      })) as UsuarioRow;

      setUsuarios((prev) => [...prev, nuevo]);
      setNombre("");
      setEmail("");
      setPassword("");
      setRolEdicion("vendedor");
      setExito("Usuario creado correctamente");
      toast.success("Usuario creado correctamente.");
      setTimeout(() => setExito(null), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al crear usuario";
      setError(msg);
      toast.error(msg);
    }
  };

  const handleIniciarEdicion = (usuario: UsuarioRow) => {
    setEditandoId(usuario.id);
    setNombre(usuario.nombre);
    setEmail(usuario.email);
    setPassword("");
    setRolEdicion(usuario.rol || "vendedor");
    setError(null);
    setExito(null);
  };

  const handleCancelarEdicion = () => {
    setEditandoId(null);
    setNombre("");
    setEmail("");
    setPassword("");
    setRolEdicion("vendedor");
    setError(null);
  };

  const handleGuardarEdicion = async () => {
    if (!editandoId) return;
    setError(null);
    setExito(null);

    if (!nombre.trim() || !email.trim()) {
      const msg = "Nombre y email son obligatorios";
      setError(msg);
      toast.warning(msg);
      return;
    }

    try {
      const actualizado = (await backendApi.patch(`/api/vendedores/${editandoId}`, {
        nombre: nombre.trim(),
        email: email.trim(),
        rol: rolEdicion,
        ...(password.trim() ? { password: password.trim() } : {}),
      })) as UsuarioRow;

      setUsuarios((prev) => prev.map((u) => (u.id === editandoId ? actualizado : u)));
      setExito("Usuario actualizado correctamente");
      toast.success("Usuario actualizado correctamente.");
      handleCancelarEdicion();
      setTimeout(() => setExito(null), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al actualizar usuario";
      setError(msg);
      toast.error(msg);
    }
  };

  const handleEliminarUsuario = async (usuario: UsuarioRow) => {
    if (usuario.id === usuarioActualId) {
      const msg = "No puedes eliminar tu propio usuario";
      setError(msg);
      toast.warning(msg);
      return;
    }

    const ok = window.confirm(`¿Eliminar a ${usuario.nombre}? Esta acción no se puede deshacer.`);
    if (!ok) return;

    setError(null);
    setExito(null);
    try {
      await backendApi.del(`/api/vendedores/${usuario.id}`);
      setUsuarios((prev) => prev.filter((u) => u.id !== usuario.id));
      setExito("Usuario eliminado correctamente");
      toast.success("Usuario eliminado correctamente.");
      setTimeout(() => setExito(null), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al eliminar usuario";
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="admin-usuarios">
      <h2 className="admin-usuarios-titulo">👤 Administración de Usuarios</h2>

      <div className="admin-usuarios-grid">
        {/* FORMULARIO */}
        <div className="admin-card">
          <h3 className="admin-card-titulo">
            {editandoId ? "Editar usuario" : "Crear nuevo usuario"}
          </h3>

          <InputField
            label="Nombre"
            value={nombre}
            onChange={setNombre}
            placeholder="Nombre completo"
          />
          <InputField
            label="Email"
            value={email}
            onChange={setEmail}
            placeholder="correo@empresa.com"
          />
          <InputField
            label={editandoId ? "Nueva contraseña (opcional)" : "Contraseña"}
            value={password}
            onChange={setPassword}
            placeholder={
              editandoId
                ? "Déjala vacía para conservar la actual"
                : "Contraseña inicial"
            }
          />
          <SelectField
            label="Rol"
            value={rolEdicion}
            onChange={(v: any) => setRolEdicion(String(v ?? "vendedor"))}
            options={OPCIONES_ROL}
          />

          {error && <div className="error-message">{error}</div>}
          {exito && <div className="success-message">{exito}</div>}

          {editandoId ? (
            <div className="admin-acciones-form">
              <BotonAccion onClick={handleGuardarEdicion} variante="primario" fullWidth>
                Guardar cambios
              </BotonAccion>
              <BotonAccion onClick={handleCancelarEdicion} variante="secundario" fullWidth>
                Cancelar
              </BotonAccion>
            </div>
          ) : (
            <BotonAccion
              onClick={handleCrearUsuario}
              variante="primario"
              fullWidth
            >
              ➕ Crear Usuario
            </BotonAccion>
          )}
        </div>

        {/* LISTA */}
        <div className="admin-card">
          <h3 className="admin-card-titulo">Usuarios registrados</h3>

          {cargando ? (
            <p className="admin-estado-texto">Cargando usuarios…</p>
          ) : usuarios.length === 0 ? (
            <p className="admin-estado-texto">
              No hay usuarios registrados aún.
            </p>
          ) : (
            <table className="tabla-usuarios">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id}>
                    <td>{u.nombre}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge-rol badge-rol--${u.rol}`}>
                        {labelRol(u.rol)}
                      </span>
                    </td>
                    <td>
                      <div className="acciones-fila">
                        <button
                          type="button"
                          className="btn-tabla btn-tabla--editar"
                          onClick={() => handleIniciarEdicion(u)}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn-tabla btn-tabla--eliminar"
                          onClick={() => handleEliminarUsuario(u)}
                          disabled={u.id === usuarioActualId}
                          title={u.id === usuarioActualId ? "No puedes eliminar tu usuario actual" : ""}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
