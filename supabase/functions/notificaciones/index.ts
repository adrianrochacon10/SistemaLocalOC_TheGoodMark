// @ts-nocheck
import nodemailer from "npm:nodemailer@6.9.10";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const transport = nodemailer.createTransport({
  host: Deno.env.get("SMTP_HOSTNAME") ?? "smtp.gmail.com",
  port: Number(Deno.env.get("SMTP_PORT") ?? 587),
  secure: Deno.env.get("SMTP_SECURE") === "true",
  auth: {
    user: Deno.env.get("SMTP_USERNAME"),
    pass: Deno.env.get("SMTP_PASSWORD"),
  },
});

interface VentaRecord {
  id?: string;
  vendedor_id: string;
  cliente_id: string;
  precio_total?: number;
  estado?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  [key: string]: unknown;
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método no permitido" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const raw = await req.json() as Record<string, unknown>;
    const venta: VentaRecord = raw && typeof raw === "object" && "record" in raw && raw.record && typeof raw.record === "object"
      ? (raw.record as VentaRecord)
      : (raw as VentaRecord);

    const vendedorId = venta.vendedor_id;
    const clienteId = venta.cliente_id;

    if (!vendedorId) {
      return new Response(
        JSON.stringify({ error: "vendedor_id es obligatorio en el payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: perfil, error: errPerfil } = await supabase
      .from("perfiles")
      .select("email, nombre")
      .eq("id", vendedorId)
      .single();

    if (errPerfil || !perfil?.email) {
      return new Response(
        JSON.stringify({
          error: "No se encontró el correo del vendedor en perfiles",
          detail: errPerfil?.message,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    let nombreCliente = "Cliente";
    if (clienteId) {
      const { data: cliente } = await supabase
        .from("clientes")
        .select("nombre")
        .eq("id", clienteId)
        .single();
      if (cliente?.nombre) nombreCliente = cliente.nombre;
    }

    const monto = venta.precio_total != null ? Number(venta.precio_total) : 0;
    const montoFormato = new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(monto);

    const subject = "Venta Exitosa";
    const text = `
Venta Exitosa

Cliente: ${nombreCliente}
Monto: ${montoFormato}
${venta.estado ? `Estado: ${venta.estado}` : ""}
${venta.fecha_inicio ? `Fecha inicio: ${venta.fecha_inicio}` : ""}
${venta.fecha_fin ? `Fecha fin: ${venta.fecha_fin}` : ""}
`;
    const html = `
<p><strong>Venta Exitosa</strong></p>
<ul>
  <li><strong>Cliente:</strong> ${nombreCliente}</li>
  <li><strong>Monto:</strong> ${montoFormato}</li>
  ${venta.estado ? `<li><strong>Estado:</strong> ${venta.estado}</li>` : ""}
  ${venta.fecha_inicio ? `<li><strong>Fecha inicio:</strong> ${venta.fecha_inicio}</li>` : ""}
  ${venta.fecha_fin ? `<li><strong>Fecha fin:</strong> ${venta.fecha_fin}</li>` : ""}
</ul>
`;

    await new Promise<void>((resolve, reject) => {
      transport.sendMail(
        {
          from: Deno.env.get("SMTP_FROM") ?? Deno.env.get("SMTP_USERNAME"),
          to: perfil.email,
          subject,
          text: text.trim(),
          html: html.trim(),
        },
        (error) => {
          if (error) reject(error);
          else resolve();
        }
      );
    });

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Notificación enviada",
        to: perfil.email,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ error: "Error enviando notificación", detail: message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
