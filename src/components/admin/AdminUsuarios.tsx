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

import React, { useState } from "react";
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
  usuarios: UsuarioRow[];
  onCrearUsuario: (usuario: UsuarioRow) => void;
}

const labelRol = (rol: string) => {
  if (rol === "admin") return "Administrador";
  if (rol === "usuario") return "Gerente de Ventas";
  return rol;
};

const OPCIONES_ROL = [
  { value: "usuario", label: "Gerente de Ventas" },
  { value: "admin", label: "Administrador" },
];

export const AdminUsuarios: React.FC<AdminUsuariosProps> = ({
  usuarioActualId,
  usuarios,
  onCrearUsuario,
}) => {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("usuario");
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const handleCrearUsuario = () => {
    setError(null);
    setExito(null);

    if (!nombre.trim() || !email.trim() || !password.trim()) {
      setError("Nombre, email y contraseña son obligatorios");
      return;
    }

    // Validar email duplicado
    if (usuarios.some((u) => u.email === email.trim())) {
      setError("Ya existe un usuario con ese email");
      return;
    }

    const nuevoUsuario: UsuarioRow = {
      id: "u" + Date.now(),
      nombre: nombre.trim(),
      email: email.trim(),
      rol,
    };

    onCrearUsuario(nuevoUsuario);

    // Reset form
    setNombre("");
    setEmail("");
    setPassword("");
    setRol("usuario");
    setExito("Usuario creado correctamente");
    setTimeout(() => setExito(null), 3000);
  };

  return (
    <div className="admin-usuarios">
      <h2 className="admin-usuarios-titulo">👤 Administración de Usuarios</h2>

      <div className="admin-usuarios-grid">
        {/* FORMULARIO */}
        <div className="admin-card">
          <h3 className="admin-card-titulo">Crear nuevo usuario</h3>

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
            label="Contraseña"
            value={password}
            onChange={setPassword}
            placeholder="Contraseña inicial"
          />
          <SelectField
            label="Rol"
            value={rol}
            onChange={setRol}
            options={OPCIONES_ROL}
          />

          {error && <div className="error-message">{error}</div>}
          {exito && <div className="success-message">{exito}</div>}

          <BotonAccion
            onClick={handleCrearUsuario}
            variante="primario"
            fullWidth
          >
            ➕ Crear Usuario
          </BotonAccion>
        </div>

        {/* LISTA */}
        <div className="admin-card">
          <h3 className="admin-card-titulo">Usuarios registrados</h3>

          {usuarios.length === 0 ? (
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
