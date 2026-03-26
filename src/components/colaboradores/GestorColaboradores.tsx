import { useMemo, useState } from "react";
import {
  Pantalla,
  AsignacionPantalla,
  Colaborador,
  Producto,
  AsignacionProductoExtra,
} from "../../types";
import { useFilasFormulario } from "../../hooks/useFormulario";
import { backendApi } from "../../lib/backendApi";

interface Props {
  profile: { id: string; rol: string } | null;
  tiposPago: { id: string; nombre: string }[];
  pantallas: Pantalla[];
  asignaciones: AsignacionPantalla[];
  productos: Producto[];
  asignacionesProductos: AsignacionProductoExtra[];
  onAgregarPantalla: (p: Pantalla) => void;
  onActualizarPantalla: (p: Pantalla) => void;
  onEliminarPantalla: (id: string) => void;
  onAgregarCliente: (
    c: Colaborador,
    extras?: {
      tipo_pago_id: string;
      pantalla_ids: string[];
      producto_ids: string[];
      es_porcentaje?: boolean;
      porcentaje?: number;
    },
  ) => void | Promise<Colaborador | void>;
  onActualizarCliente: (
    c: Colaborador,
    extras?: {
      tipo_pago_id?: string;
      pantalla_ids?: string[];
      producto_ids?: string[];
      es_porcentaje?: boolean;
      porcentaje?: number;
      codigo_edicion?: string;
    },
  ) => void | Promise<Colaborador | void>;
  onAsignarPantalla: (a: AsignacionPantalla) => void;
  onEliminarPantallasYAsignaciones: (id: string) => void;
  onAgregarProducto?: (p: Producto) => void;
  onActualizarProducto?: (p: Producto) => void;
  onEliminarProducto?: (id: string) => void;
  onAsignarProducto?: (a: AsignacionProductoExtra) => void;
}

export function useGestorColaboradores(props: Props) {
  const {
    profile,
    tiposPago,
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
  const [porcentaje, setPorcentaje] = useState<number>(30);
  const [tipoPagoId, setTipoPagoId] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mostrarModalCodigo, setMostrarModalCodigo] = useState(false);
  const [colaboradorPendiente, setColaboradorPendiente] = useState<Colaborador | null>(
    null,
  );
  const [codigoEdicion, setCodigoEdicion] = useState("");
  const [codigoValidado, setCodigoValidado] = useState(false);
  const [mensajeCodigo, setMensajeCodigo] = useState("");
  const [errorCodigo, setErrorCodigo] = useState("");
  const [mensajeGuardado, setMensajeGuardado] = useState("");
  const tipoPagoPorcentajeId =
    tiposPago.find((t) => t.nombre?.toLowerCase().trim().includes("porcentaje"))
      ?.id ?? "";
  const esTipoPagoPorcentaje = useMemo(
    () =>
      Boolean(tipoPagoId) && Boolean(tipoPagoPorcentajeId) && tipoPagoId === tipoPagoPorcentajeId,
    [tipoPagoId, tipoPagoPorcentajeId],
  );

  // ─── ERRORES ─────────────────────────────────────────────────────────
  const [errorColaborador, setErrorColaborador] = useState("");
  const [errorPantalla, setErrorPantalla] = useState("");

  // ─── FILAS DINÁMICAS ─────────────────────────────────────────────────
  const pantallasForm = useFilasFormulario({ nombre: "", ubicacion: "" });
  const productosForm = useFilasFormulario({ nombre: "", precio: 0 });

  // ─── HELPERS INTERNOS ────────────────────────────────────────────────
  const genId = (prefix: string, idx = 0) =>
    prefix + (Date.now() + idx + Math.floor(Math.random() * 10000));
  const toIds = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.map((v) => String(v));
    if (typeof value === "string") {
      return value.split(",").map((v) => v.trim()).filter(Boolean);
    }
    return [];
  };

  // ─── RESET ───────────────────────────────────────────────────────────
  const resetFormulario = () => {
    setNombre("");
    setAlias("");
    setTelefono("");
    setEmail("");
    setColor("");
    setPorcentaje(30);
    setTipoPagoId("");
    setErrorColaborador("");
    setErrorPantalla("");
    pantallasForm.resetFilas();
    productosForm.resetFilas();
    setMostrarModal(false);
    setModoEdicion(false);
    setColaboradorEditando(null);
    setCodigoEdicion("");
    setCodigoValidado(false);
    setMostrarModalCodigo(false);
    setColaboradorPendiente(null);
    setMensajeCodigo("");
    setErrorCodigo("");
    setMensajeGuardado("");
  };

  const abrirEditor = (colaborador: Colaborador) => {
    setNombre(colaborador.nombre);
    setAlias(colaborador.alias || "");
    setTelefono(colaborador.telefono || "");
    setEmail(colaborador.email || "");
    setColor((colaborador as Colaborador & { color?: string }).color || "");
    setPorcentaje(30);
    setTipoPagoId(
      (colaborador as Colaborador & { tipoPagoId?: string }).tipoPagoId || "",
    );

    const colabAny = colaborador as Colaborador & {
      pantalla_ids?: string[] | string;
      producto_ids?: string[] | string;
      pantallas?: Array<{ id: string; nombre: string }>;
      productos?: Array<{ id: string; nombre: string; precio?: number }>;
    };

    const pantallasAsociadasDesdeBackend = (colabAny.pantallas ?? []).map((p) => ({
      nombre: p.nombre,
      tempId: p.id,
    }));
    const pantallasAsociadasDesdeAsignaciones = asignaciones
      .filter((a) => a.clienteId === colaborador.id && a.activa)
      .map((a) => {
        const p = pantallas.find((x) => x.id === a.pantallaId);
        return p ? { nombre: p.nombre, tempId: p.id } : null;
      })
      .filter(Boolean) as { nombre: string; tempId: string }[];
    const pantallasAsociadas =
      pantallasAsociadasDesdeBackend.length > 0
        ? pantallasAsociadasDesdeBackend
        : pantallasAsociadasDesdeAsignaciones.length > 0
        ? pantallasAsociadasDesdeAsignaciones
        : [];

    const pantallasPorIds =
      pantallasAsociadas.length > 0
        ? pantallasAsociadas
        : toIds(colabAny.pantalla_ids).map((id) => {
            const p = pantallas.find((x) => x.id === id);
            return p ? { nombre: p.nombre, tempId: p.id } : null;
          }).filter(Boolean) as { nombre: string; tempId: string }[];

    pantallasForm.setFilas(
      pantallasPorIds.length > 0
        ? pantallasPorIds
        : [
            {
              nombre: "",
              tempId: Math.random().toString(36).substring(2, 15),
            },
          ],
    );

    const productosAsociadosDesdeBackend = (colabAny.productos ?? []).map((p) => ({
      nombre: p.nombre,
      precio: Number(p.precio ?? 0),
      tempId: p.id,
    }));
    const productosAsociadosDesdeAsignaciones = asignacionesProductos
      .filter((a) => a.clienteId === colaborador.id && a.activo)
      .map((a) => {
        const p = productos.find((x) => x.id === a.productoId);
        return p
          ? { nombre: p.nombre, precio: Number(p.precio ?? 0), tempId: p.id }
          : null;
      })
      .filter(Boolean) as { nombre: string; precio: number; tempId: string }[];
    const productosAsociados =
      productosAsociadosDesdeBackend.length > 0
        ? productosAsociadosDesdeBackend
        : productosAsociadosDesdeAsignaciones.length > 0
        ? productosAsociadosDesdeAsignaciones
        : [];

    const productosPorIds =
      productosAsociados.length > 0
        ? productosAsociados
        : toIds(colabAny.producto_ids).map((id) => {
            const p = productos.find((x) => x.id === id);
            return p
              ? { tempId: p.id, nombre: p.nombre, precio: Number(p.precio ?? 0) }
              : null;
          }).filter(Boolean) as { nombre: string; precio: number; tempId: string }[];

    productosForm.setFilas(
      productosPorIds.length > 0
        ? productosPorIds
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

  // ─── GUARDAR COLABORADOR ─────────────────────────────────────────────
  const handleGuardar = async () => {
    if (guardando) return;
    setErrorColaborador("");
    setErrorPantalla("");
    setMensajeGuardado("");

    if (!nombre.trim()) {
      setErrorColaborador("El nombre del colaborador es requerido");
      return;
    }
    if (!alias.trim()) {
      setErrorColaborador("El alias es requerido");
      return;
    }
    if (!telefono.trim()) {
      setErrorColaborador("El teléfono es requerido");
      return;
    }
    if (!email.trim()) {
      setErrorColaborador("El email es requerido");
      return;
    }
    if (!color.trim()) {
      setErrorColaborador("El color es requerido");
      return;
    }

    const pantallasValidas = pantallasForm.filasValidas() as Array<{
      tempId: string;
      nombre?: string;
    }>;
    if (pantallasValidas.length === 0) {
      setErrorPantalla("Debe agregar al menos una pantalla");
      return;
    }

    const productosValidos = productosForm.filasValidas() as Array<{
      tempId: string;
      nombre?: string;
      precio?: number | string;
    }>;

    const pantallaNombres = pantallasValidas
      .map((p) => String(p.nombre ?? "").trim())
      .filter(Boolean);
    const productoRows = productosValidos
      .map((p) => ({
        nombre: String(p.nombre ?? "").trim(),
        precio: Number(p.precio ?? 0),
      }))
      .filter((p) => p.nombre);

    const tipoPagoFinal = tipoPagoId || "";
    if (!tipoPagoFinal) {
      setErrorColaborador("Selecciona un tipo de pago");
      return;
    }
    if (esTipoPagoPorcentaje && (!Number.isFinite(porcentaje) || porcentaje < 0)) {
      setErrorColaborador("Captura un porcentaje valido");
      return;
    }
    if (modoEdicion && profile?.rol === "vendedor" && !codigoValidado) {
      setMostrarModalCodigo(true);
      setMensajeCodigo("Para guardar los cambios, ingresa tu código de autorización.");
      setErrorCodigo("");
      return;
    }

    try {
      setGuardando(true);
      const pantallaIds: string[] = [];
      for (const nombrePantalla of pantallaNombres) {
        const existente = pantallas.find(
          (x) => x.nombre.trim().toLowerCase() === nombrePantalla.toLowerCase(),
        );
        if (existente) {
          pantallaIds.push(existente.id);
          continue;
        }
        const creada = await backendApi.post("/api/pantallas", { nombre: nombrePantalla });
        if (creada?.id) {
          pantallaIds.push(creada.id);
        }
      }
      if (pantallaIds.length === 0) {
        setErrorPantalla("Debe agregar al menos una pantalla válida");
        return;
      }

      const productoIds: string[] = [];
      for (const row of productoRows) {
        const existente = productos.find(
          (x) => x.nombre.trim().toLowerCase() === row.nombre.toLowerCase(),
        );
        if (existente) {
          if (Number(row.precio) >= 0 && Number(row.precio) !== Number(existente.precio ?? 0)) {
            await backendApi.patch(`/api/productos/${existente.id}`, {
              nombre: existente.nombre,
              precio: Number(row.precio),
            });
          }
          productoIds.push(existente.id);
          continue;
        }
        const creado = await backendApi.post("/api/productos", {
          nombre: row.nombre,
          precio: row.precio,
        });
        if (creado?.id) {
          productoIds.push(creado.id);
        }
      }

      const primeraPantallaId = pantallaIds[0] || "";
      const primerProductoId = productoIds[0] || "";

      const colaborador: Colaborador = {
        id: modoEdicion && colaboradorEditando ? colaboradorEditando : genId("c"),
        nombre,
        alias: alias || undefined,
        telefono: telefono || undefined,
        email: email || undefined,
        pantallaId: primeraPantallaId,
        productoId: primerProductoId,
        fechaCreacion: new Date(),
      } as Colaborador;
      (colaborador as Colaborador & { color?: string }).color = color || undefined;

      if (modoEdicion && colaboradorEditando) {
        await onActualizarCliente(colaborador, {
          tipo_pago_id: profile?.rol === "admin" ? tipoPagoFinal || undefined : undefined,
          pantalla_ids: pantallaIds,
          producto_ids: productoIds,
          es_porcentaje: esTipoPagoPorcentaje,
          porcentaje: esTipoPagoPorcentaje ? porcentaje : undefined,
          codigo_edicion: profile?.rol === "vendedor" ? codigoEdicion : undefined,
        });
        setMensajeGuardado("Código válido y cambios guardados");
      } else {
        await onAgregarCliente(colaborador, {
          tipo_pago_id: tipoPagoFinal,
          pantalla_ids: pantallaIds,
          producto_ids: productoIds,
          es_porcentaje: esTipoPagoPorcentaje,
          porcentaje: esTipoPagoPorcentaje ? porcentaje : undefined,
        });
        setMensajeGuardado("Colaborador guardado correctamente");
      }
      resetFormulario();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "No se pudo guardar el colaborador";
      if (
        msg.toLowerCase().includes("codigo") &&
        (msg.toLowerCase().includes("inval") ||
          msg.toLowerCase().includes("expir") ||
          msg.toLowerCase().includes("utilizado"))
      ) {
        setErrorColaborador("Código inválido/expirado");
      } else {
        setErrorColaborador(msg);
      }
    } finally {
      setGuardando(false);
    }
  };

  // ─── EDITAR COLABORADOR ──────────────────────────────────────────────
  const handleEditar = (colaborador: Colaborador) => {
    setColaboradorPendiente(colaborador);
    abrirEditor(colaborador);
  };

  const solicitarCodigoEdicion = async () => {
    if (!colaboradorPendiente) return;
    setErrorCodigo("");
    const data = await backendApi.post("/api/codigos/solicitar", {
      entidad: "colaborador",
      entidad_id: colaboradorPendiente.id,
    });
    setMensajeCodigo(data?.mensaje ?? "Código solicitado. Revisa tu correo.");
  };

  const validarCodigoEdicion = async () => {
    if (!codigoEdicion.trim()) {
      setErrorCodigo("Ingresa un código");
      return;
    }
    setErrorCodigo("");
    setCodigoValidado(true);
    setMostrarModalCodigo(false);
    setMensajeCodigo("Código capturado. Guardando cambios...");
    void handleGuardar();
  };

  // ─── ELIMINAR COLABORADOR ────────────────────────────────────────────
  const handleEliminar = (colaboradorId: string) => {
    const eliminar = async () => {
      try {
        await onEliminarPantallasYAsignaciones(colaboradorId);
        resetFormulario();
      } catch (e) {
        alert(e instanceof Error ? e.message : "No se pudo eliminar colaborador");
      }
    };
    if (profile?.rol !== "admin") {
      alert("Solo administrador puede eliminar colaboradores");
      return;
    }
    if (
      confirm(
        "¿Está seguro de que desea eliminar este colaborador y todas sus pantallas asociadas?",
      )
    ) {
      void eliminar();
    }
  };

  // ─── DATOS DEL FORM EXPUESTOS ────────────────────────────────────────
  const formData = {
    nombre,
    alias,
    telefono,
    email,
    color,
    porcentaje,
    tipoPagoId,
    esTipoPagoPorcentaje,
  };
  const formSetters = {
    setNombre,
    setAlias,
    setTelefono,
    setEmail,
    setColor,
    setPorcentaje,
    setTipoPagoId,
  };

  return {
    mostrarModal,
    setMostrarModal,
    modoEdicion,
    formData,
    formSetters,
    pantallasForm,
    productosForm,
    tiposPago,
    canCrear: profile?.rol === "admin",
    canEditarTipoPago: true,
    pantallas,
    productos,
    errorColaborador,
    errorPantalla,
    mensajeGuardado,
    guardando,
    mostrarModalCodigo,
    codigoEdicion,
    setCodigoEdicion,
    codigoValidado,
    mensajeCodigo,
    errorCodigo,
    setMostrarModalCodigo,
    solicitarCodigoEdicion,
    validarCodigoEdicion,
    handleGuardar,
    handleEditar,
    handleEliminar,
    resetFormulario,
  };
}
