import { supabase } from "../config/supabase.js";
import { sendEmail } from "../lib/email.js";

export function generarCodigo() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** API antigua usaba "cliente"; BD y códigos nuevos usan "colaborador" */
export function normalizarEntidadCodigo(entidad) {
  if (entidad == null) return null;
  const e = String(entidad).toLowerCase().trim();
  if (e === "cliente") return "colaborador";
  return e;
}

export async function validarYConsumirCodigo(codigo, vendedorId, entidad, entidadId) {
  if (!codigo || typeof codigo !== "string" || !String(codigo).trim()) {
    return { ok: false, error: "Código de edición obligatorio para vendedores" };
  }
  const codigoClean = String(codigo).trim().toUpperCase();

  const entidadNorm = normalizarEntidadCodigo(entidad);
  const entidadesPermitidas =
    entidadNorm === "colaborador" ? ["colaborador", "cliente"] : [entidadNorm];

  const { data: row, error: errSelect } = await supabase
    .from("codigos_edicion")
    .select("id, vendedor_id, usado, expira_at, entidad, entidad_id")
    .eq("codigo", codigoClean)
    .eq("entidad_id", entidadId)
    .in("entidad", entidadesPermitidas)
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
  const entidadNorm = normalizarEntidadCodigo(entidad);
  const entidadesPermitidas =
    entidadNorm === "colaborador" ? ["colaborador", "cliente"] : [entidadNorm];

  const { data: row, error } = await supabase
    .from("codigos_edicion")
    .select("id, usado, expira_at, vendedor_id")
    .eq("codigo", codigo.toUpperCase())
    .eq("entidad_id", entidadId)
    .in("entidad", entidadesPermitidas)
    .single();
  if (error || !row) return { valido: false, error: "Codigo invalido" };
  if (row.usado) return { valido: false, error: "Codigo ya utilizado" };
  if (new Date(row.expira_at) < new Date()) return { valido: false, error: "Codigo expirado" };
  if (row.vendedor_id !== userId) return { valido: false, error: "Codigo no corresponde al vendedor" };

  await supabase.from("codigos_edicion").update({ usado: true }).eq("id", row.id);
  return { valido: true };
}

export async function solicitarCodigo(entidad, entidadId, user) {
  if (!entidad || !entidadId) return { error: "entidad (colaborador|orden) y entidad_id son obligatorios" };
  const entidadNorm = normalizarEntidadCodigo(entidad);
  if (entidadNorm !== "colaborador" && entidadNorm !== "orden") {
    return { error: "entidad debe ser colaborador u orden (cliente se acepta como alias de colaborador)" };
  }

  const { data: admins } = await supabase.from("perfiles").select("email").eq("rol", "admin");
  const adminEmails = admins?.map((a) => a.email).filter(Boolean) ?? [];
  const destinatarios = new Set(adminEmails);
  if (adminEmails.length === 0) return { error: "No hay administradores registrados en perfiles." };
  if (user.email) destinatarios.add(user.email);
  if (entidadNorm === "colaborador") {
    const { data: col } = await supabase.from("colaboradores").select("email").eq("id", entidadId).single();
    if (col?.email?.trim()) destinatarios.add(col.email.trim());
  }
  if (entidadNorm === "orden") {
    const { data: venta } = await supabase
      .from("ventas")
      .select("colaborador_id, cliente_id")
      .eq("id", entidadId)
      .single();
    const cid = venta?.colaborador_id ?? venta?.cliente_id;
    if (cid) {
      const { data: col } = await supabase.from("colaboradores").select("email").eq("id", cid).single();
      if (col?.email?.trim()) destinatarios.add(col.email.trim());
    }
  }
  const listaCorreos = [...destinatarios];

  const codigo = generarCodigo();
  const expiraAt = new Date();
  expiraAt.setMinutes(expiraAt.getMinutes() + 30);

  const { data, error } = await supabase
    .from("codigos_edicion")
    .insert({
      codigo,
      vendedor_id: user.id,
      entidad: entidadNorm,
      entidad_id: entidadId,
      admin_email: adminEmails[0],
      expira_at: expiraAt.toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const tipoEntidad = entidadNorm === "colaborador" ? "un colaborador" : "una venta/orden";
  const nombreVendedor = user.nombre || user.email || "Un vendedor";
  const texto =
    `El vendedor ${nombreVendedor} (${user.email}) ha solicitado un código para EDITAR o ELIMINAR ${tipoEntidad}.\n\n` +
    `Código: ${codigo}\n` +
    `Válido por 30 minutos.\n\n` +
    `Pásale este código solo a ${nombreVendedor} para que pueda realizar los cambios.`;
  const html =
    `<p>El vendedor <strong>${nombreVendedor}</strong> (${user.email}) ha solicitado un código para <strong>EDITAR o ELIMINAR</strong> ${tipoEntidad}.</p>` +
    `<p><strong>Código: ${codigo}</strong></p>` +
    `<p>Válido por <strong>30 minutos</strong>.</p>` +
    `<p>Pásale este código solo a <strong>${nombreVendedor}</strong> para que pueda realizar los cambios.</p>`;
  for (const to of listaCorreos) {
    await sendEmail(to, "Código de edición TGM - Pásalo al vendedor", texto, html);
  }

  return { data: { id: data.id, mensaje: "Codigo generado y enviado a los destinatarios", expira_at: data.expira_at } };
}
