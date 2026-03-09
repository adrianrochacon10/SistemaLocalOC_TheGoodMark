import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { sendEmail } from "../lib/email.js";

const router = Router();

function generarCodigo() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
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

router.post("/solicitar", requireAuth, async (req, res) => {
  if (req.user.rol === "admin") return res.status(400).json({ error: "El admin no necesita codigo para editar" });
  const { entidad, entidad_id } = req.body || {};
  if (!entidad || !entidad_id) return res.status(400).json({ error: "entidad (cliente|orden) y entidad_id son obligatorios" });
  if (entidad !== "cliente" && entidad !== "orden") return res.status(400).json({ error: "entidad debe ser cliente u orden" });

  const { data: admins } = await supabase.from("perfiles").select("email").eq("rol", "admin");
  const adminEmails = admins?.map((a) => a.email).filter(Boolean) ?? [];
  const destinatarios = new Set(adminEmails);
  if (adminEmails.length === 0) return res.status(500).json({ error: "No hay administradores registrados en perfiles." });
  if (req.user.email) destinatarios.add(req.user.email);
  if (entidad === "cliente") {
    const { data: cli } = await supabase.from("clientes").select("email").eq("id", entidad_id).single();
    if (cli?.email?.trim()) destinatarios.add(cli.email.trim());
  }
  if (entidad === "orden") {
    const { data: venta } = await supabase.from("ventas").select("cliente_id").eq("id", entidad_id).single();
    if (venta?.cliente_id) {
      const { data: cli } = await supabase.from("clientes").select("email").eq("id", venta.cliente_id).single();
      if (cli?.email?.trim()) destinatarios.add(cli.email.trim());
    }
  }
  const listaCorreos = [...destinatarios];

  const codigo = generarCodigo();
  const expiraAt = new Date();
  expiraAt.setMinutes(expiraAt.getMinutes() + 30);

  try {
    const { data, error } = await supabase
      .from("codigos_edicion")
      .insert({
        codigo,
        vendedor_id: req.user.id,
        entidad,
        entidad_id,
        admin_email: adminEmails[0],
        expira_at: expiraAt.toISOString(),
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });

    const tipoEntidad = entidad === "cliente" ? "un cliente" : "una venta/orden";
    const nombreVendedor = req.user.nombre || req.user.email || "Un vendedor";
    const texto =
      `El vendedor ${nombreVendedor} (${req.user.email}) ha solicitado un código para EDITAR o ELIMINAR ${tipoEntidad}.\n\n` +
      `Código: ${codigo}\n` +
      `Válido por 30 minutos.\n\n` +
      `Pásale este código solo a ${nombreVendedor} para que pueda realizar los cambios.`;
    const html =
      `<p>El vendedor <strong>${nombreVendedor}</strong> (${req.user.email}) ha solicitado un código para <strong>EDITAR o ELIMINAR</strong> ${tipoEntidad}.</p>` +
      `<p><strong>Código: ${codigo}</strong></p>` +
      `<p>Válido por <strong>30 minutos</strong>.</p>` +
      `<p>Pásale este código solo a <strong>${nombreVendedor}</strong> para que pueda realizar los cambios.</p>`;
    for (const to of listaCorreos) {
      await sendEmail(to, "Código de edición TGM - Pásalo al vendedor", texto, html);
    }

    res.status(201).json({ id: data.id, mensaje: "Codigo generado y enviado a los destinatarios", expira_at: data.expira_at });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error al generar codigo" });
  }
});

router.post("/validar", requireAuth, async (req, res) => {
  const { codigo, entidad, entidad_id } = req.body || {};
  if (!codigo || !entidad || !entidad_id) return res.status(400).json({ error: "codigo, entidad y entidad_id son obligatorios" });

  const { data: row, error } = await supabase.from("codigos_edicion").select("id, usado, expira_at, vendedor_id").eq("codigo", codigo.toUpperCase()).eq("entidad", entidad).eq("entidad_id", entidad_id).single();
  if (error || !row) return res.json({ valido: false, error: "Codigo invalido" });
  if (row.usado) return res.json({ valido: false, error: "Codigo ya utilizado" });
  if (new Date(row.expira_at) < new Date()) return res.json({ valido: false, error: "Codigo expirado" });
  if (row.vendedor_id !== req.user.id) return res.json({ valido: false, error: "Codigo no corresponde al vendedor" });

  await supabase.from("codigos_edicion").update({ usado: true }).eq("id", row.id);
  res.json({ valido: true });
});

router.get("/", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const { data, error } = await supabase.from("codigos_edicion").select("*").eq("usado", false).gte("expira_at", new Date().toISOString()).order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data ?? []);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

export default router;
