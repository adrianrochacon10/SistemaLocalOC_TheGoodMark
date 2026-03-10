import { useState, useEffect } from "react";
import { Colaborador } from "../types";
import { backendApi } from "../lib/backendApi";

export function useClientes(profile: any) {
  const [clientes, setClientes] = useState<Colaborador[]>([]);

  // Cargar desde backend
  useEffect(() => {
    if (!profile) return;
    const cargar = async () => {
      try {
        const data = (await backendApi.get("/api/clientes")) as any[];
        setClientes(
          data.map((row: any) => ({
            id: row.id,
            nombre: row.nombre,
            contacto: row.contacto ?? undefined,
            telefono: row.telefono ?? undefined,
            email: row.email ?? undefined,
            color: row.color ?? undefined,
            porcentajeSocio: row.porcentaje_socio ?? undefined,
            tipoComision: row.tipo_comision ?? "fijo",
            tipoPdf: row.tipo_pdf === 2 ? 2 : 1,
            tipoPagoId: row.tipo_pago_id ?? row.tipo_pago?.id ?? undefined,
            activo: row.activo ?? true,
            fechaCreacion: row.fecha_creacion
              ? new Date(row.fecha_creacion)
              : new Date(),
          })),
        );
      } catch (e) {
        console.error("Error cargando clientes:", e);
      }
    };
    cargar();
  }, [profile]);

  // Persistir en localStorage
  useEffect(() => {
    if (!profile) return;
    try {
      localStorage.setItem("clientes", JSON.stringify(clientes));
    } catch (e) {
      console.error("Error guardando clientes en localStorage:", e);
    }
  }, [clientes, profile]);

  // Cargar desde localStorage inicial
  useEffect(() => {
    const datos = localStorage.getItem("clientes");
    if (datos) {
      try {
        setClientes(JSON.parse(datos));
      } catch (e) {
        console.error("Error cargando clientes desde localStorage:", e);
      }
    }
  }, []);

  const handleAgregarCliente = async (
    cliente: Colaborador,
    extras?: { tipo_pago_id: string; pantalla_id: string },
  ) => {
    let clienteParaEstado: Colaborador = cliente;

    if (extras?.tipo_pago_id && extras?.pantalla_id) {
      try {
        const data = await backendApi.post("/api/clientes", {
          nombre: cliente.nombre,
          contacto: cliente.alias ?? null,
          telefono: cliente.telefono ?? null,
          email: cliente.email ?? null,
          tipo_comision: cliente.tipoComision ?? "fijo",
          porcentaje_socio: cliente.porcentajeSocio ?? null,
          tipo_pago_id: extras.tipo_pago_id,
          pantalla_id: extras.pantalla_id,
          tipo_pdf: cliente.tipoPdf ?? 1,
        });

        if (data) {
          clienteParaEstado = {
            id: data.id,
            nombre: data.nombre,
            alias: data.contacto ?? undefined,
            telefono: data.telefono ?? undefined,
            email: data.email ?? undefined,
            color: data.color ?? undefined,
            porcentajeSocio: data.porcentaje_socio ?? undefined,
            tipoComision: data.tipo_comision ?? "fijo",
            tipoPdf: data.tipo_pdf === 2 ? 2 : 1,
            activo: data.activo ?? true,
            fechaCreacion: data.created_at
              ? new Date(data.created_at)
              : new Date(),
          };
        }
      } catch (e) {
        console.error("Error guardando cliente en backend:", e);
        throw e;
      }
    }

    setClientes((prev) => {
      const existe = prev.find((c) => c.id === clienteParaEstado.id);
      return existe
        ? prev.map((c) =>
            c.id === clienteParaEstado.id ? clienteParaEstado : c,
          )
        : [...prev, clienteParaEstado];
    });
    return clienteParaEstado;
  };

  return {
    clientes,
    acciones: {
      handleAgregarCliente,
    },
  };
}
