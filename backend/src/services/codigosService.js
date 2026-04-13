import { supabase } from "../config/supabase.js";
import { sendEmail } from "../lib/email.js";

/** Minutos de validez del código (debe coincidir con `expira_at` en BD y con el texto del correo). */
export const MINUTOS_VALIDEZ_CODIGO_EDICION = 30;

export function generarCodigo() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtCampo(val) {
  if (val == null || val === "") return "—";
  return String(val);
}

function resumenPantallasVenta(detalle) {
  if (!Array.isArray(detalle) || detalle.length === 0) return null;
  const nombres = detalle.map((p) => p?.nombre).filter(Boolean);
  if (nombres.length) return nombres.join(", ");
  return `${detalle.length} pantalla(s)`;
}

function trunc(s, max) {
  const t = String(s);
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function asuntoSeguro(entidadClean, detalleColab, detalleVenta, entidadId) {
  if (entidadClean === "colaborador" && detalleColab?.nombre)
    return trunc(detalleColab.nombre, 45);
  if (entidadClean === "orden") {
    if (detalleVenta?.identificador_venta)
      return trunc(String(detalleVenta.identificador_venta), 45);
    if (detalleVenta?.colaborador?.nombre)
      return trunc(detalleVenta.colaborador.nombre, 45);
  }
  return String(entidadId).slice(0, 8);
}

export async function validarYConsumirCodigo(codigo, vendedorId, entidad, entidadId) {
  if (!codigo || typeof codigo !== "string" || !String(codigo).trim()) {
    return { ok: false, error: "Código de edición obligatorio para vendedores" };
  }
  const codigoClean = String(codigo).trim().toUpperCase();

  const { data: row, error: errSelect } = await supabase
    .from("codigos_edicion")
    .select("id, vendedor_id, usado, expira_at, entidad, entidad_id")
    .eq("codigo", codigoClean)
    .eq("entidad", entidad)
    .eq("entidad_id", entidadId)
    .maybeSingle();

  if (errSelect || !row) {
    return { ok: false, error: "Código inválido para esta entidad" };
  }
  if (row.vendedor_id !== vendedorId) {
    return { ok: false, error: "El código corresponde a otro vendedor" };
  }
  if (row.usado) {
    return { ok: false, error: "Código ya utilizado" };
  }
  const ahora = new Date();
  if (row.expira_at && new Date(row.expira_at) <= ahora) {
    return { ok: false, error: "Código expirado" };
  }

  const { error: errUpdate } = await supabase
    .from("codigos_edicion")
    .update({ usado: true })
    .eq("id", row.id);
  if (errUpdate) return { ok: false, error: "Error al usar el código" };
  return { ok: true };
}

export async function listarVigentes() {
  const { data, error } = await supabase
    .from("codigos_edicion")
    .select("*")
    .eq("usado", false)
    .gte("expira_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function validarCodigo(codigo, entidad, entidadId, userId) {
  const { data: row, error } = await supabase
    .from("codigos_edicion")
    .select("id, usado, expira_at, vendedor_id")
    .eq("codigo", codigo.toUpperCase())
    .eq("entidad", entidad)
    .eq("entidad_id", entidadId)
    .single();
  if (error || !row) return { valido: false, error: "Codigo invalido" };
  if (row.usado) return { valido: false, error: "Codigo ya utilizado" };
  if (new Date(row.expira_at) < new Date()) return { valido: false, error: "Codigo expirado" };
  if (row.vendedor_id !== userId) return { valido: false, error: "Codigo no corresponde al vendedor" };

  await supabase.from("codigos_edicion").update({ usado: true }).eq("id", row.id);
  return { valido: true };
}

export async function solicitarCodigo(entidad, entidadId, user) {
  const entidadClean = entidad;
  if (!entidadClean || !entidadId) return { error: "entidad (colaborador|orden) y entidad_id son obligatorios" };
  if (entidadClean !== "colaborador" && entidadClean !== "orden") return { error: "entidad debe ser colaborador u orden" };

  const { data: admins } = await supabase.from("perfiles").select("email").eq("rol", "admin");
  const adminEmails = admins?.map((a) => a.email).filter(Boolean) ?? [];
  const destinatarios = new Set(adminEmails);
  if (adminEmails.length === 0) return { error: "No hay administradores registrados en perfiles." };
  if (user.email) destinatarios.add(user.email);

  let detalleColab = null;
  let detalleVenta = null;

  if (entidadClean === "colaborador") {
    const { data: cli } = await supabase
      .from("colaboradores")
      .select("id, nombre, email, telefono, contacto")
      .eq("id", entidadId)
      .maybeSingle();
    detalleColab = cli;
    if (cli?.email?.trim()) destinatarios.add(cli.email.trim());
  }

  if (entidadClean === "orden") {
    const selectVentaRica =
      "id, estado_venta, fecha_inicio, fecha_fin, duracion_meses, identificador_venta, vendido_a, client_name, precio_por_mes, pantallas_detalle, colaborador:colaboradores(id,nombre,email,telefono,contacto), producto:productos(nombre)";
    const resVenta = await supabase
      .from("ventas")
      .select(selectVentaRica)
      .eq("id", entidadId)
      .maybeSingle();

    if (!resVenta.error && resVenta.data) {
      detalleVenta = resVenta.data;
      const emailColab = resVenta.data.colaborador?.email?.trim();
      if (emailColab) destinatarios.add(emailColab);
    } else {
      if (resVenta.error) {
        console.warn("[codigos] Detalle de venta (select enriquecido):", resVenta.error.message);
      }
      const { data: vMin } = await supabase
        .from("ventas")
        .select(
          "id, colaborador_id, estado_venta, fecha_inicio, fecha_fin, duracion_meses, identificador_venta, vendido_a, client_name, precio_por_mes, pantallas_detalle",
        )
        .eq("id", entidadId)
        .maybeSingle();
      if (vMin?.colaborador_id) {
        const { data: c2 } = await supabase
          .from("colaboradores")
          .select("id, nombre, email, telefono, contacto")
          .eq("id", vMin.colaborador_id)
          .maybeSingle();
        detalleVenta = c2 ? { ...vMin, colaborador: c2 } : vMin;
        if (c2?.email?.trim()) destinatarios.add(c2.email.trim());
      } else {
        detalleVenta = vMin;
      }
    }
  }

  const listaCorreos = [...destinatarios];

  const codigo = generarCodigo();
  const expiraAt = new Date();
  expiraAt.setMinutes(expiraAt.getMinutes() + MINUTOS_VALIDEZ_CODIGO_EDICION);
  const expiraLegible = expiraAt.toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Mexico_City",
  });

  const { data, error } = await supabase
    .from("codigos_edicion")
    .insert({
      codigo,
      vendedor_id: user.id,
      entidad: entidadClean,
      entidad_id: entidadId,
      admin_email: adminEmails[0],
      expira_at: expiraAt.toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const tipoEntidad = entidadClean === "colaborador" ? "un colaborador" : "una venta/orden";
  const nombreVendedor = user.nombre || user.email || "Un vendedor";
  const emailVendedor = fmtCampo(user.email);
  const idVendedor = fmtCampo(user.id);

  const lineasSolicitante = [
    "=== Quién solicita el código (vendedor) ===",
    `Nombre: ${nombreVendedor}`,
    `Correo: ${emailVendedor}`,
    `ID de usuario: ${idVendedor}`,
    "",
  ];

  const lineasEntidad = [];
  const filasHtmlEntidad = [];

  if (entidadClean === "colaborador") {
    lineasEntidad.push("=== Colaborador a editar / eliminar ===");
    lineasEntidad.push(`ID: ${fmtCampo(entidadId)}`);
    lineasEntidad.push(`Nombre: ${fmtCampo(detalleColab?.nombre)}`);
    lineasEntidad.push(`Correo: ${fmtCampo(detalleColab?.email)}`);
    lineasEntidad.push(`Teléfono: ${fmtCampo(detalleColab?.telefono)}`);
    lineasEntidad.push(`Contacto: ${fmtCampo(detalleColab?.contacto)}`);
    lineasEntidad.push("");
    filasHtmlEntidad.push(
      "<h3 style=\"margin:16px 0 8px;font-size:15px;\">Colaborador a editar / eliminar</h3>",
      "<table style=\"border-collapse:collapse;font-size:14px;\">",
      `<tr><td style=\"padding:4px 12px 4px 0;color:#555;\">ID</td><td><code>${escapeHtml(entidadId)}</code></td></tr>`,
      `<tr><td style=\"padding:4px 12px 4px 0;color:#555;\">Nombre</td><td>${escapeHtml(fmtCampo(detalleColab?.nombre))}</td></tr>`,
      `<tr><td style=\"padding:4px 12px 4px 0;color:#555;\">Correo</td><td>${escapeHtml(fmtCampo(detalleColab?.email))}</td></tr>`,
      `<tr><td style=\"padding:4px 12px 4px 0;color:#555;\">Teléfono</td><td>${escapeHtml(fmtCampo(detalleColab?.telefono))}</td></tr>`,
      `<tr><td style=\"padding:4px 12px 4px 0;color:#555;\">Contacto</td><td>${escapeHtml(fmtCampo(detalleColab?.contacto))}</td></tr>`,
      "</table>",
    );
  } else {
    const c = detalleVenta?.colaborador;
    const pantallasTxt = resumenPantallasVenta(detalleVenta?.pantallas_detalle);
    lineasEntidad.push("=== Venta / orden a editar / eliminar ===");
    lineasEntidad.push(`ID de la venta: ${fmtCampo(detalleVenta?.id ?? entidadId)}`);
    lineasEntidad.push(`Identificador de venta: ${fmtCampo(detalleVenta?.identificador_venta)}`);
    lineasEntidad.push(`Estado: ${fmtCampo(detalleVenta?.estado_venta)}`);
    lineasEntidad.push(`Cliente: ${fmtCampo(detalleVenta?.vendido_a)}`);
    lineasEntidad.push(`Nombre en contrato (client_name): ${fmtCampo(detalleVenta?.client_name)}`);
    lineasEntidad.push(`Fecha inicio: ${fmtCampo(detalleVenta?.fecha_inicio)}`);
    lineasEntidad.push(`Fecha fin: ${fmtCampo(detalleVenta?.fecha_fin)}`);
    lineasEntidad.push(`Duración (meses): ${fmtCampo(detalleVenta?.duracion_meses)}`);
    lineasEntidad.push(`Precio por mes: ${fmtCampo(detalleVenta?.precio_por_mes)}`);
    lineasEntidad.push(`Producto: ${fmtCampo(detalleVenta?.producto?.nombre)}`);
    lineasEntidad.push(`Pantallas: ${fmtCampo(pantallasTxt)}`);
    lineasEntidad.push("");
    lineasEntidad.push("=== Colaborador asociado a la venta ===");
    lineasEntidad.push(`ID: ${fmtCampo(c?.id)}`);
    lineasEntidad.push(`Nombre: ${fmtCampo(c?.nombre)}`);
    lineasEntidad.push(`Correo: ${fmtCampo(c?.email)}`);
    lineasEntidad.push(`Teléfono: ${fmtCampo(c?.telefono)}`);
    lineasEntidad.push(`Contacto: ${fmtCampo(c?.contacto)}`);
    lineasEntidad.push("");
    filasHtmlEntidad.push(
      "<h3 style=\"margin:16px 0 8px;font-size:15px;\">Venta / orden a editar / eliminar</h3>",
      "<table style=\"border-collapse:collapse;font-size:14px;\">",
      `<tr><td style=\"padding:4px 12px 4px 0;color:#555;\">ID venta</td><td><code>${escapeHtml(fmtCampo(detalleVenta?.id ?? entidadId))}</code></td></tr>`,
      `<tr><td style=\"padding:4px 12px 4px 0;color:#555;\">Identificador</td><td>${escapeHtml(fmtCampo(detalleVenta?.identificador_venta))}</td></tr>`,
      `<tr><td style=\"padding:4px 12px 4px 0;color:#555;\">Estado</td><td>${escapeHtml(fmtCampo(detalleVenta?.estado_venta))}</td></tr>`,
      `<tr><td style=\"padding:4px 12px 4px 0;color:#555;\">Cliente</td><td>${escapeHtml(fmtCampo(detalleVenta?.vendido_a))}</td></tr>`,
      `<tr><td style=\"padding:4px 12px 4px 0;color:#555;\">Nombre en contrato</td><td>${escapeHtml(fmtCampo(detalleVenta?.client_name))}</td></tr>`,
      `<tr><td style=\"padding:4px 12px 4px 0;color:#555;\">Fechas</td><td>${escapeHtml(fmtCampo(detalleVenta?.fecha_inicio))} → ${escapeHtml(fmtCampo(detalleVenta?.fecha_fin))}</td></tr>`,
      `<tr><td style=\"padding:4px 12px 4px 0;color:#555;\">Duración (meses)</td><td>${escapeHtml(fmtCampo(detalleVenta?.duracion_meses))}</td></tr>`,
      `<tr><td style=\"padding:4px 12px 4px 0;color:#555;\">Precio / mes</td><td>${escapeHtml(fmtCampo(detalleVenta?.precio_por_mes))}</td></tr>`,
      `<tr><td style=\"padding:4px 12px 4px 0;color:#555;\">Producto</td><td>${escapeHtml(fmtCampo(detalleVenta?.producto?.nombre))}</td></tr>`,
      `<tr><td style=\"padding:4px 12px 4px 0;color:#555;\">Pantallas</td><td>${escapeHtml(fmtCampo(pantallasTxt))}</td></tr>`,
      "</table>",
      "<h3 style=\"margin:16px 0 8px;font-size:15px;\">Colaborador de la venta</h3>",
      "<table style=\"border-collapse:collapse;font-size:14px;\">",
      `<tr><td style=\"padding:4px 12px 4px 0;color:#555;\">ID</td><td><code>${escapeHtml(fmtCampo(c?.id))}</code></td></tr>`,
      `<tr><td style=\"padding:4px 12px 4px 0;color:#555;\">Nombre</td><td>${escapeHtml(fmtCampo(c?.nombre))}</td></tr>`,
      `<tr><td style=\"padding:4px 12px 4px 0;color:#555;\">Correo</td><td>${escapeHtml(fmtCampo(c?.email))}</td></tr>`,
      `<tr><td style=\"padding:4px 12px 4px 0;color:#555;\">Teléfono</td><td>${escapeHtml(fmtCampo(c?.telefono))}</td></tr>`,
      `<tr><td style=\"padding:4px 12px 4px 0;color:#555;\">Contacto</td><td>${escapeHtml(fmtCampo(c?.contacto))}</td></tr>`,
      "</table>",
    );
  }

  const lineasCodigo = [
    "=== Código y vigencia ===",
    `Código: ${codigo}`,
    `Válido por ${MINUTOS_VALIDEZ_CODIGO_EDICION} minutos desde el envío de este correo.`,
    `Caduca aproximadamente el: ${expiraLegible} (hora Ciudad de México).`,
    "",
    `Pásale este código solo a ${nombreVendedor} para que pueda realizar los cambios.`,
  ];

  const introTexto =
    `${nombreVendedor} (${emailVendedor}) ha solicitado un código para EDITAR o ELIMINAR ${tipoEntidad}.\n\n`;
  const texto = introTexto + [...lineasSolicitante, ...lineasEntidad, ...lineasCodigo].join("\n");

  const html =
    `<p><strong>${escapeHtml(nombreVendedor)}</strong> (${escapeHtml(emailVendedor)}) ha solicitado un código para <strong>EDITAR o ELIMINAR</strong> ${escapeHtml(tipoEntidad)}.</p>` +
    `<h3 style="margin:16px 0 8px;font-size:15px;">Quién solicita el código (vendedor)</h3>` +
    `<table style="border-collapse:collapse;font-size:14px;">` +
    `<tr><td style="padding:4px 12px 4px 0;color:#555;">Nombre</td><td>${escapeHtml(nombreVendedor)}</td></tr>` +
    `<tr><td style="padding:4px 12px 4px 0;color:#555;">Correo</td><td>${escapeHtml(emailVendedor)}</td></tr>` +
    `<tr><td style="padding:4px 12px 4px 0;color:#555;">ID usuario</td><td><code>${escapeHtml(idVendedor)}</code></td></tr>` +
    `</table>` +
    filasHtmlEntidad.join("") +
    `<h3 style="margin:16px 0 8px;font-size:15px;">Código y vigencia</h3>` +
    `<p><strong>Código: ${escapeHtml(codigo)}</strong></p>` +
    `<p>Válido por <strong>${MINUTOS_VALIDEZ_CODIGO_EDICION} minutos</strong> desde el envío de este correo.</p>` +
    `<p>Caduca aproximadamente el: <strong>${escapeHtml(expiraLegible)}</strong> (hora Ciudad de México).</p>` +
    `<p>Pásale este código solo a <strong>${escapeHtml(nombreVendedor)}</strong> para que pueda realizar los cambios.</p>`;

  const asuntoHint = asuntoSeguro(entidadClean, detalleColab, detalleVenta, entidadId);
  const subject = `Código de edición TGM — ${entidadClean === "orden" ? "Venta" : "Colaborador"}: ${asuntoHint}`;

  for (const to of listaCorreos) {
    await sendEmail(to, subject, texto, html);
  }

  return {
    data: {
      id: data.id,
      mensaje: "Codigo generado y enviado a los destinatarios",
      expira_at: data.expira_at,
      vigencia_minutos: MINUTOS_VALIDEZ_CODIGO_EDICION,
    },
  };
}
