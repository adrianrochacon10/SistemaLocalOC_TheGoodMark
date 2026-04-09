// src/components/pantallas/hooks/useGestorColaboradores.ts
import { useState } from "react";
import {
  Pantalla,
  AsignacionPantalla,
  Colaborador,
  Producto,
  AsignacionProductoExtra,
} from "../types";
import { useFilasFormulario } from "./useFormulario";
import { confirmWithToast } from "../lib/confirmWithToast";

export type TipoComision =
  | "porcentaje"
  | "ninguno"
  | "consideracion"
  | "precio_fijo";

interface Props {
  pantallas: Pantalla[];
  asignaciones: AsignacionPantalla[];
  productos: Producto[];
  asignacionesProductos: AsignacionProductoExtra[];
  onAgregarPantalla: (p: Pantalla) => void;
  onActualizarPantalla: (p: Pantalla) => void;
  onEliminarPantalla: (id: string) => void;
  onAgregarCliente: (
    c: Colaborador,
    extras?: { tipo_pago_id: string; pantalla_id: string },
  ) => void | Promise<Colaborador | void>;
  onActualizarCliente: (c: Colaborador) => void;
  onAsignarPantalla: (a: AsignacionPantalla) => void;
  onEliminarPantallasYAsignaciones: (id: string) => void;
  onAgregarProducto?: (p: Producto) => void;
  onActualizarProducto?: (p: Producto) => void;
  onEliminarProducto?: (id: string) => void;
  onAsignarProducto?: (a: AsignacionProductoExtra) => void;
}

export function useGestorColaboradores(props: Props) {
  const {
    pantallas,
    asignaciones,
    productos,
    asignacionesProductos,
    onAgregarPantalla,
    onActualizarPantalla,
    onEliminarPantalla,
    onAgregarCliente,
    onActualizarCliente,
    onAsignarPantalla,
    onEliminarPantallasYAsignaciones,
    onAgregarProducto,
    onActualizarProducto,
    onEliminarProducto,
    onAsignarProducto,
  } = props;

  // ─── ESTADO DEL MODAL ────────────────────────────────────────────────
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [colaboradorEditando, setColaboradorEditando] = useState<string | null>(
    null,
  );

  // ─── ESTADO DEL FORMULARIO ───────────────────────────────────────────
  const [nombre, setNombre] = useState("");
  const [alias, setAlias] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [color, setColor] = useState("");
  const [tipoComision, setTipoComision] = useState<TipoComision>("ninguno");
  const [porcentaje, setPorcentaje] = useState<number>(30);

  // ─── ERRORES ─────────────────────────────────────────────────────────
  const [errorColaborador, setErrorColaborador] = useState("");
  const [errorPantalla, setErrorPantalla] = useState("");

  // ─── FILAS DINÁMICAS ─────────────────────────────────────────────────
  const pantallasForm = useFilasFormulario({ nombre: "", ubicacion: "" });
  const productosForm = useFilasFormulario({ nombre: "", precio: 0 });

  // ─── HELPERS INTERNOS ────────────────────────────────────────────────
  const genId = (prefix: string, idx = 0) =>
    prefix + (Date.now() + idx + Math.floor(Math.random() * 10000));

  const crearPantallaYAsignar = (
    data: { nombre: string; ubicacion: string },
    clienteId: string,
    idx: number,
  ) => {
    const nuevaPantalla: Pantalla = {
      id: genId("p", idx),
      nombre: String(data.nombre),
      ubicacion: String(data.ubicacion) || undefined,
      activa: true,
      fechaCreacion: new Date(),
    };
    onAgregarPantalla(nuevaPantalla);
    onAsignarPantalla({
      id: genId("a", idx),
      pantallaId: nuevaPantalla.id,
      clienteId,
      activa: true,
      fechaAsignacion: new Date(),
    });
  };

  const crearProductoYAsignar = (
    data: { nombre: string; precio: number },
    clienteId: string,
    idx: number,
  ) => {
    const nuevoProducto: Producto = {
      id: genId("prod", idx),
      nombre: String(data.nombre),
      precio: Number(data.precio),
      activo: true,
      fechaCreacion: new Date(),
    };
    onAgregarProducto!(nuevoProducto);
    onAsignarProducto!({
      id: genId("ap", idx),
      productoId: nuevoProducto.id,
      clienteId,
      precioUnitario: nuevoProducto.precio,
      activo: true,
      fechaAsignacion: new Date(),
    });
  };

  // ─── RESET ───────────────────────────────────────────────────────────
  const resetFormulario = () => {
    setNombre("");
    setAlias("");
    setTelefono("");
    setEmail("");
    setColor("");
    setTipoComision("ninguno");
    setPorcentaje(30);
    setErrorColaborador("");
    setErrorPantalla("");
    pantallasForm.resetFilas();
    productosForm.resetFilas();
    setMostrarModal(false);
    setModoEdicion(false);
    setColaboradorEditando(null);
  };

  // ─── GUARDAR COLABORADOR ─────────────────────────────────────────────
  const handleGuardar = () => {
    setErrorColaborador("");
    setErrorPantalla("");

    if (!nombre.trim()) {
      setErrorColaborador("El nombre del colaborador es requerido");
      return;
    }

    const pantallasValidas = pantallasForm.filasValidas() as Array<{
      tempId: string;
      nombre: string;
      ubicacion: string;
    }>;
    if (pantallasValidas.length === 0) {
      setErrorPantalla("Debe agregar al menos una pantalla");
      return;
    }

    const productosValidos = productosForm.filasValidas() as Array<{
      tempId: string;
      nombre: string;
      precio: number;
    }>;

    const colaborador = {
      id: modoEdicion && colaboradorEditando ? colaboradorEditando : genId("c"),
      nombre,
      alias: alias || undefined,
      telefono: telefono || undefined,
      email: email || undefined,
      color: color || undefined,
      tipoComision,
      porcentajeSocio: tipoComision === "porcentaje" ? porcentaje : undefined,
      activo: true,
      fechaCreacion: new Date(),
    } as Colaborador;

    if (modoEdicion && colaboradorEditando) {
      onActualizarCliente(colaborador);

      // Pantallas: eliminar removidas
      const idsOriginales = asignaciones
        .filter((a) => a.clienteId === colaboradorEditando && a.activa)
        .map((a) => a.pantallaId);
      const idsEnForm = pantallasValidas
        .filter((p) => pantallas.some((e) => e.id === p.tempId))
        .map((p) => p.tempId);
      idsOriginales.forEach((id) => {
        if (!idsEnForm.includes(id)) onEliminarPantalla(id);
      });

      // Pantallas: actualizar o crear
      pantallasValidas.forEach((pd, idx) => {
        const existente = pantallas.find((p) => p.id === pd.tempId);
        if (existente) {
          onActualizarPantalla({
            ...existente,
            nombre: String(pd.nombre),
            ubicacion: String(pd.ubicacion) || undefined,
          });
        } else {
          crearPantallaYAsignar(pd, colaborador.id, idx);
        }
      });

      // Productos: eliminar removidos
      if (
        onEliminarProducto &&
        onAgregarProducto &&
        onActualizarProducto &&
        onAsignarProducto
      ) {
        const idsOrigProd = asignacionesProductos
          .filter((a) => a.clienteId === colaboradorEditando && a.activo)
          .map((a) => a.productoId);
        const idsFormProd = productosValidos
          .filter((p) => productos.some((e) => e.id === p.tempId))
          .map((p) => p.tempId);
        idsOrigProd.forEach((id) => {
          if (!idsFormProd.includes(id)) onEliminarProducto(id);
        });

        // Productos: actualizar o crear
        productosValidos.forEach((pd, idx) => {
          const existente = productos.find((p) => p.id === pd.tempId);
          if (existente) {
            onActualizarProducto({
              ...existente,
              nombre: String(pd.nombre),
              precio: Number(pd.precio),
            });
          } else {
            crearProductoYAsignar(pd, colaborador.id, idx);
          }
        });
      }
    } else {
      onAgregarCliente(colaborador);
      pantallasValidas.forEach((pd, idx) =>
        crearPantallaYAsignar(pd, colaborador.id, idx),
      );
      if (onAgregarProducto && onAsignarProducto) {
        productosValidos.forEach((pd, idx) =>
          crearProductoYAsignar(pd, colaborador.id, idx),
        );
      }
    }

    resetFormulario();
  };

  // ─── EDITAR COLABORADOR ──────────────────────────────────────────────
  const handleEditar = (colaborador: Colaborador) => {
    setNombre(colaborador.nombre);
    setAlias(colaborador.alias || "");
    setTelefono(colaborador.telefono || "");
    setEmail(colaborador.email || "");
    setColor(colaborador.color || "");
    setTipoComision(colaborador.tipoComision ?? "ninguno");
    setPorcentaje(colaborador.porcentajeSocio ?? 30);

    const pantallasAsociadas = asignaciones
      .filter((a) => a.clienteId === colaborador.id && a.activa)
      .map((a) => {
        const p = pantallas.find((p) => p.id === a.pantallaId);
        return p
          ? { nombre: p.nombre, ubicacion: p.ubicacion || "", tempId: p.id }
          : null;
      })
      .filter(Boolean) as {
      nombre: string;
      ubicacion: string;
      tempId: string;
    }[];

    pantallasForm.setFilas(
      pantallasAsociadas.length > 0
        ? pantallasAsociadas
        : [
            {
              nombre: "",
              ubicacion: "",
              tempId: Math.random().toString(36).substring(2, 15),
            },
          ],
    );

    const productosAsociados = asignacionesProductos
      .filter((a) => a.clienteId === colaborador.id && a.activo)
      .map((a) => {
        const p = productos.find((p) => p.id === a.productoId);
        return p ? { nombre: p.nombre, precio: p.precio, tempId: p.id } : null;
      })
      .filter(Boolean) as { nombre: string; precio: number; tempId: string }[];

    productosForm.setFilas(
      productosAsociados.length > 0
        ? productosAsociados
        : [
            {
              nombre: "",
              precio: 0,
              tempId: Math.random().toString(36).substring(2, 15),
            },
          ],
    );

    setModoEdicion(true);
    setColaboradorEditando(colaborador.id);
    setMostrarModal(true);
  };

  // ─── ELIMINAR COLABORADOR ────────────────────────────────────────────
  const handleEliminar = (colaboradorId: string) => {
    void (async () => {
      const ok = await confirmWithToast(
        "¿Está seguro de que desea eliminar este colaborador y todas sus pantallas asociadas?",
      );
      if (!ok) return;
      onEliminarPantallasYAsignaciones(colaboradorId);
      resetFormulario();
    })();
  };

  // ─── DATOS DEL FORM EXPUESTOS ────────────────────────────────────────
  const formData = {
    nombre,
    alias,
    telefono,
    email,
    color,
    tipoComision,
    porcentaje,
  };
  const formSetters = {
    setNombre,
    setAlias,
    setTelefono,
    setEmail,
    setColor,
    setTipoComision,
    setPorcentaje,
  };

  return {
    mostrarModal,
    setMostrarModal,
    modoEdicion,
    formData,
    formSetters,
    pantallasForm,
    productosForm,
    errorColaborador,
    errorPantalla,
    handleGuardar,
    handleEditar,
    handleEliminar,
    resetFormulario,
  };
}
