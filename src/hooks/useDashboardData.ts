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
  const { profile, loading, error: authError, signIn, signOut } = useAuth();

  const [estadoBD, setEstadoBD] = useState<EstadoBD>("checking");
  const [mensajeBD, setMensajeBD] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [tiposPago, setTiposPago] = useState<{ id: string; nombre: string }[]>([]);

  const clientes = useClientes(profile);
  const pantallas = usePantallas(profile);
  const productosExtra = useProductosExtra(profile);
  const ventas = useVentas(profile, clientes.clientes, pantallas.asignaciones);
  const configuracion = useConfiguracion(profile);

  // Cargar tipos de pago
  useEffect(() => {
    if (!profile) return;
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
  }, [profile]);

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
