import { useEffect, useState } from "react";
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
      }
    };
    cargar();
  }, [profile, session?.access_token]);

  // Healthcheck BD (sin auth: no depende de Supabase; reintentos por arranque lento del sidecar en Tauri)
  useEffect(() => {
    if (!profile) return;
    let cancelado = false;

    const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const probarConexion = async () => {
      setEstadoBD("checking");
      setMensajeBD(null);
      const intentos = 35;
      const pausaMs = 400;
      let ultimo: string | null = null;

      for (let i = 0; i < intentos; i++) {
        if (cancelado) return;
        try {
          await backendApi.get("/api/health", { skipAuth: true });
          if (!cancelado) {
            setEstadoBD("ok");
            setMensajeBD(null);
          }
          return;
        } catch (e) {
          ultimo =
            e instanceof Error ? e.message : "Error desconocido de conexión";
          if (!cancelado) setMensajeBD(ultimo);
          if (i < intentos - 1) await esperar(pausaMs);
        }
      }

      if (!cancelado) {
        setEstadoBD("error");
        setMensajeBD(ultimo);
      }
    };

    void probarConexion();
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
    /** URL base del API Express (healthcheck); no es Supabase directo. */
    apiBaseUrl: backendApi.BACKEND_URL,
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
