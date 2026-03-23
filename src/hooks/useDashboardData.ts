import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Usuario } from "../types";
import { useAuth } from "./useAuth";
import { backendApi } from "../lib/backendApi";
import { useClientes } from "./useClientes";
import { usePantallas } from "./usePantallas";
import { useProductosExtra } from "./useProductosExtra";
import { useVentas } from "./useVentas";
import { useConfiguracion } from "./useConfiguracion";

type EstadoBD = "checking" | "ok" | "error";

export function useDashboardData() {
  const { profile, session, loading, error: authError, signIn, signOut } = useAuth();

  const [estadoBD, setEstadoBD] = useState<EstadoBD>("checking");
  const [mensajeBD, setMensajeBD] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [tiposPago, setTiposPago] = useState<{ id: string; nombre: string }[]>([]);

  const clientes = useClientes(profile, session);
  const pantallas = usePantallas(profile, session);
  const productosExtra = useProductosExtra(profile, session);
  const ventas = useVentas(profile, session);
  const configuracion = useConfiguracion(profile, session);

  // Lista de usuarios (solo admin puede GET /api/vendedores) — para selector de vendedor en ventas
  useEffect(() => {
    if (!profile || !session?.access_token || profile.rol !== "admin") return;
    const cargar = async () => {
      try {
        const data = (await backendApi.get("/api/vendedores")) as any[];
        if (!Array.isArray(data)) return;
        setUsuarios(
          data.map((u: any) => {
            const r = u.rol;
            const rol: Usuario["rol"] =
              r === "admin" ? "admin" : r === "vendedor" ? "vendedor" : "usuario";
            return {
              id: u.id,
              nombre: u.nombre ?? "",
              email: u.email ?? "",
              rol,
              activo: true,
            };
          }),
        );
      } catch (e) {
        console.error("Error cargando usuarios (vendedores):", e);
        toast.error("Error cargando usuarios (vendedores)");
      }
    };
    void cargar();
  }, [profile, session?.access_token]);

  // Cargar tipos de pago
  useEffect(() => {
    if (!profile || !session?.access_token) return;
    const cargar = async () => {
      try {
        const tiposData = (await backendApi.get("/api/tipo-pago")) as any[];
        setTiposPago(
          Array.isArray(tiposData)
            ? tiposData.map((t: any) => ({ id: t.id, nombre: t.nombre }))
            : [],
        );
      } catch (e) {
        console.error("Error cargando tipos de pago:", e);
        toast.error("Error cargando tipos de pago");
      }
    };
    cargar();
  }, [profile, session?.access_token]);

  // Healthcheck BD
  useEffect(() => {
    if (!profile) return;
    let cancelado = false;

    const probarConexion = async () => {
      setEstadoBD("checking");
      setMensajeBD(null);
      try {
        await backendApi.get("/api/health");
        if (!cancelado) {
          setEstadoBD("ok");
          setMensajeBD(null);
        }
      } catch (e) {
        if (!cancelado) {
          setEstadoBD("error");
          setMensajeBD(
            e instanceof Error ? e.message : "Error desconocido de conexión",
          );
        }
      }
    };

    probarConexion();
    return () => {
      cancelado = true;
    };
  }, [profile]);

  const handleCrearUsuario = (nuevoUsuario: Usuario) => {
    setUsuarios((prev) => [...prev, nuevoUsuario]);
  };

  return {
    auth: { profile, loading, authError, signIn, signOut },
    estadoBD,
    mensajeBD,
    errorVenta: ventas.errorVenta,
    datos: {
      usuarios,
      tiposPago,
      ...clientes,
      ...pantallas,
      ...productosExtra,
      ...ventas,
      ...configuracion,
    },
    acciones: {
      ...clientes.acciones,
      ...pantallas.acciones,
      ...productosExtra.acciones,
      ...ventas.acciones,
      ...configuracion.acciones,
      handleCrearUsuario,
    },
  };
}
