import { useState, useEffect, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { Colaborador } from "../types";
import { backendApi } from "../lib/backendApi";

type ExtrasColaborador = {
  pantalla_ids?: string[];
  producto_ids?: string[];
  pantallas?: Array<{ id: string; nombre: string; precio?: number }>;
  productos?: Array<{ id: string; nombre: string; precio?: number }>;
  color?: string;
};

const coloresKey = "ColaboradoresColors";
const leerColores = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(coloresKey) ?? "{}");
  } catch {
    return {};
  }
};
const guardarColor = (id: string, color?: string) => {
  try {
    const current = leerColores();
    if (color) current[id] = color;
    localStorage.setItem(coloresKey, JSON.stringify(current));
  } catch {
    // noop
  }
};

const mapBackendColaborador = (row: any): Colaborador & ExtrasColaborador => {
  const colores = leerColores();
  const pantallaIds = Array.isArray(row.pantalla_ids)
    ? row.pantalla_ids
    : row.pantalla_id
      ? [row.pantalla_id]
      : [];
  const productoIds = Array.isArray(row.producto_ids)
    ? row.producto_ids
    : row.producto_id
      ? [row.producto_id]
      : [];

  return {
    id: row.id,
    nombre: row.nombre,
    alias: row.contacto ?? row.alias ?? undefined,
    telefono: row.telefono ?? undefined,
    email: row.email ?? undefined,
    productoId: row.producto_id ?? row.productoId ?? row.producto?.id ?? "",
    tipoPagoId: row.tipo_pago_id ?? row.tipoPagoId ?? row.tipo_pago?.id ?? undefined,
    tipoComision: (() => {
      const raw = String(row.tipo_comision ?? row.tipoComision ?? "").trim().toLowerCase();
      if (raw === "porcentaje") return "porcentaje";
      const nombreTp = String(row.tipo_pago?.nombre ?? "").trim().toLowerCase();
      return nombreTp.includes("porcentaje") ? "porcentaje" : undefined;
    })(),
    porcentajeSocio: Number(
      row.porcentaje_socio ??
        row.porcentajeSocio ??
        row.porcentaje ??
        0,
    ) || undefined,
    pantallaId: row.pantalla_id ?? row.pantallaId ?? row.pantalla?.id ?? "",
    pantalla_ids: pantallaIds,
    producto_ids: productoIds,
    pantallas: Array.isArray(row.pantallas)
      ? row.pantallas
      : row.pantalla
        ? [row.pantalla]
        : [],
    productos: Array.isArray(row.productos)
      ? row.productos
      : row.producto
        ? [row.producto]
        : [],
    color: colores[row.id],
    fechaCreacion: row.created_at
      ? new Date(row.created_at)
      : row.fecha_creacion
        ? new Date(row.fecha_creacion)
        : new Date(),
  };
};

function porcentajeColaboradorDesdeLista(
  row: any,
  porcentajes: any[],
): number | undefined {
  const tipoNombre = String(row?.tipo_pago?.nombre ?? "").toLowerCase();
  const esPorcentaje =
    String(row?.tipo_comision ?? row?.tipoComision ?? "").toLowerCase() ===
      "porcentaje" || tipoNombre.includes("porcentaje");
  if (!esPorcentaje) return undefined;
  const id = String(row?.id ?? "");
  const nombre = String(row?.nombre ?? "").trim().toLowerCase();
  const porId = id
    ? porcentajes.find((p: any) => {
        const desc = String(p?.descripcion ?? "").toLowerCase();
        return desc && desc.includes(id.toLowerCase());
      })
    : undefined;
  const hit =
    porId ??
    porcentajes.find((p: any) => {
      const desc = String(p?.descripcion ?? "").toLowerCase();
      if (!desc) return false;
      if (nombre && desc.includes(nombre)) return true;
      return false;
    });
  const valor = Number(hit?.valor ?? 0);
  return Number.isFinite(valor) && valor >= 0 ? valor : undefined;
}

function descripcionPorcentajeColaborador(colaborador: {
  id?: string;
  nombre?: string;
}): string {
  const id = String(colaborador?.id ?? "").trim();
  const nombre = String(colaborador?.nombre ?? "").trim();
  if (id) return `Porcentaje para colaborador ${nombre} (${id})`;
  return `Porcentaje para colaborador ${nombre}`;
}

export function useClientes(profile: any, session: Session | null) {
  const [clientes, setClientes] = useState<Colaborador[]>([]);

  const refetchClientes = useCallback(async () => {
    if (!profile || !session?.access_token) return;
    const [data, porcentajes] = await Promise.all([
      backendApi.get("/api/colaboradores") as Promise<any[]>,
      backendApi.get("/api/porcentajes").catch(() => []) as Promise<any[]>,
    ]);
    if (!Array.isArray(data)) return;
    setClientes(
      data.map((row: any) => {
        const c = mapBackendColaborador(row);
        const pct = porcentajeColaboradorDesdeLista(
          row,
          Array.isArray(porcentajes) ? porcentajes : [],
        );
        if (pct != null) {
          c.tipoComision = "porcentaje";
          c.porcentajeSocio = pct;
        }
        return c;
      }),
    );
  }, [profile?.id, session?.access_token]);

  // Cargar desde backend (solo con sesión lista — evita 401 por token aún no persistido)
  useEffect(() => {
    void refetchClientes().catch((e) => {
      console.error("Error cargando Colaboradores:", e);
    });
  }, [refetchClientes]);

  // Persistir en localStorage
  useEffect(() => {
    if (!profile) return;
    try {
      localStorage.setItem("Colaboradores", JSON.stringify(clientes));
    } catch (e) {
      console.error("Error guardando colaboradores en localStorage:", e);
    }
  }, [clientes, profile]);

  const handleAgregarCliente = async (
    cliente: Colaborador,
    extras?: {
      tipo_pago_id: string;
      pantalla_ids: string[];
      producto_ids: string[];
      es_porcentaje?: boolean;
      porcentaje?: number;
    },
  ) => {
    let clienteParaEstado: Colaborador = cliente;

    if (extras?.tipo_pago_id) {
      try {
        const data = await backendApi.post("/api/colaboradores", {
          nombre: cliente.nombre,
          contacto: cliente.alias ?? null,
          telefono: cliente.telefono ?? null,
          email: cliente.email ?? null,
          tipo_pago_id: extras.tipo_pago_id,
          pantalla_ids: extras.pantalla_ids,
          producto_ids: extras.producto_ids,
        });

        if (data) {
          clienteParaEstado = mapBackendColaborador(data);
          if (extras.es_porcentaje && extras.porcentaje !== undefined) {
            await backendApi.post("/api/porcentajes", {
              valor: extras.porcentaje,
              descripcion: descripcionPorcentajeColaborador({
                id: clienteParaEstado.id,
                nombre: clienteParaEstado.nombre,
              }),
              colaborador_id: clienteParaEstado.id,
            });
            clienteParaEstado.tipoComision = "porcentaje";
            clienteParaEstado.porcentajeSocio = Number(extras.porcentaje) || 0;
          }
          (clienteParaEstado as Colaborador & ExtrasColaborador).color = (
            cliente as Colaborador & ExtrasColaborador
          ).color;
          guardarColor(
            clienteParaEstado.id,
            (cliente as Colaborador & ExtrasColaborador).color,
          );
        }
      } catch (e) {
        console.error("Error guardando cliente en backend:", e);
        throw e;
      }
    }

    setClientes((prev: Colaborador[]) => {
      const existe = prev.find((c: Colaborador) => c.id === clienteParaEstado.id);
      return existe
        ? prev.map((c: Colaborador) =>
            c.id === clienteParaEstado.id ? clienteParaEstado : c,
          )
        : [...prev, clienteParaEstado];
    });
    return clienteParaEstado;
  };

  const handleActualizarCliente = async (
    cliente: Colaborador,
    extras?: {
      tipo_pago_id?: string;
      pantalla_ids?: string[];
      producto_ids?: string[];
      es_porcentaje?: boolean;
      porcentaje?: number;
      codigo_edicion?: string;
    },
  ) => {
    const payload: any = {
      nombre: cliente.nombre,
      contacto: cliente.alias ?? null,
      telefono: cliente.telefono ?? null,
      email: cliente.email ?? null,
    };

    if (extras?.tipo_pago_id) payload.tipo_pago_id = extras.tipo_pago_id;
    if (extras?.pantalla_ids) payload.pantalla_ids = extras.pantalla_ids;
    if (extras?.producto_ids) payload.producto_ids = extras.producto_ids;
    if (extras?.codigo_edicion) payload.codigo_edicion = extras.codigo_edicion;

    if (extras?.es_porcentaje && extras.porcentaje !== undefined) {
      await backendApi.post("/api/porcentajes", {
        valor: extras.porcentaje,
        descripcion: descripcionPorcentajeColaborador({
          id: cliente.id,
          nombre: cliente.nombre,
        }),
        colaborador_id: cliente.id,
      });
    }

    const data = await backendApi.patch(`/api/colaboradores/${cliente.id}`, payload);
    const actualizado = mapBackendColaborador(data);
    if (extras?.es_porcentaje && extras.porcentaje !== undefined) {
      actualizado.tipoComision = "porcentaje";
      actualizado.porcentajeSocio = Number(extras.porcentaje) || 0;
    }
    (actualizado as Colaborador & ExtrasColaborador).color = (
      cliente as Colaborador & ExtrasColaborador
    ).color;
    guardarColor(actualizado.id, (cliente as Colaborador & ExtrasColaborador).color);

    setClientes((prev: Colaborador[]) =>
      prev.map((c: Colaborador) => (c.id === actualizado.id ? actualizado : c)),
    );

    return actualizado;
  };

  const handleEliminarCliente = async (colaboradorId: string) => {
    await backendApi.del(`/api/colaboradores/${colaboradorId}`);
    setClientes((prev: Colaborador[]) =>
      prev.filter((c: Colaborador) => c.id !== colaboradorId),
    );
  };

  return {
    clientes,
    acciones: {
      handleAgregarCliente,
      handleActualizarCliente,
      handleEliminarCliente,
      refetchClientes,
    },
  };
}
