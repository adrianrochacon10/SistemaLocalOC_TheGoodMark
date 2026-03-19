import { useState, useEffect } from "react";
import { Colaborador } from "../types";
import { backendApi } from "../lib/backendApi";

const mapBackendColaborador = (row: any): Colaborador => ({
  id: row.id,
  nombre: row.nombre,
  alias: row.contacto ?? row.alias ?? undefined,
  telefono: row.telefono ?? undefined,
  email: row.email ?? undefined,
  productoId: row.producto_id ?? row.productoId ?? row.producto?.id ?? "",
  tipoPagoId: row.tipo_pago_id ?? row.tipoPagoId ?? row.tipo_pago?.id ?? undefined,
  pantallaId: row.pantalla_id ?? row.pantallaId ?? row.pantalla?.id ?? "",
  fechaCreacion: row.created_at
    ? new Date(row.created_at)
    : row.fecha_creacion
      ? new Date(row.fecha_creacion)
      : new Date(),
});

export function useClientes(profile: any) {
  const [clientes, setClientes] = useState<Colaborador[]>([]);

  // Cargar desde backend
  useEffect(() => {
    if (!profile) return;
    const cargar = async () => {
      try {
        const data = (await backendApi.get("/api/colaboradores")) as any[];
        setClientes(data.map((row: any) => mapBackendColaborador(row)));
      } catch (e) {
        console.error("Error cargando Colaboradores:", e);
      }
    };
    cargar();
  }, [profile]);

  // Persistir en localStorage
  useEffect(() => {
    if (!profile) return;
    try {
      localStorage.setItem("Colaboradores", JSON.stringify(clientes));
    } catch (e) {
      console.error("Error guardando colaboradores en localStorage:", e);
    }
  }, [clientes, profile]);

  // Cargar desde localStorage inicial
  useEffect(() => {
    const datos = localStorage.getItem("Colaboradores");
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
        const data = await backendApi.post("/api/colaboradores", {
          nombre: cliente.nombre,
          contacto: cliente.alias ?? null,
          telefono: cliente.telefono ?? null,
          email: cliente.email ?? null,
          // tipo_comision: cliente.tipoComision ?? "fijo",
          // porcentaje_socio: cliente.porcentajeSocio ?? null,
          tipo_pago_id: extras.tipo_pago_id,
          pantalla_id: extras.pantalla_id,
          // tipo_pdf: cliente.tipoPdf ?? 1,
        });

        if (data) {
          clienteParaEstado = mapBackendColaborador(data);
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

  return {
    clientes,
    acciones: {
      handleAgregarCliente,
    },
  };
}
