import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { sendEmail } from "../lib/email.js";

const router = Router();

function generarCodigo() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function validarYConsumirCodigo(codigo, vendedorId, entidad, entidadId) {
  if (!codigo || typeof codigo !== "string" || !String(codigo).trim()) return { ok: false, error: "Código de edición obligatorio para vendedores" };
  const codigoClean = String(codigo).trim().toUpperCase();
  const now = new Date().toISOString();
  const { data: row, error: errSelect } = await supabase
    .from("codigos_edicion")
    .select("id")
    .eq("codigo", codigoClean)
    .eq("vendedor_id", vendedorId)
    .eq("entidad", entidad)
    .eq("entidad_id", entidadId)
    .eq("usado", false)
    .gt("expira_at", now)
    .limit(1)
    .maybeSingle();
  if (errSelect || !row) return { ok: false, error: "Código inválido, expirado o ya usado" };
  const { error: errUpdate } = await supabase.from("codigos_edicion").update({ usado: true }).eq("id", row.id);
  if (errUpdate) return { ok: false, error: "Error al usar el código" };
  return { ok: true };
}

router.post("/solicitar", requireAuth, async (req, res) => {
  if (req.user.rol === "admin") return res.status(400).json({ error: "El admin no necesita codigo para editar" });
  const { entidad, entidad_id } = req.body || {};
  if (!entidad || !entidad_id) return res.status(400).json({ error: "entidad (cliente|orden) y entidad_id son obligatorios" });
  if (entidad !== "cliente" && entidad !== "orden") return res.status(400).json({ error: "entidad debe ser cliente u orden" });

  // Destino del correo: fijo por .env o primer admin en BD
  const adminEmail = process.env.ADMIN_EMAIL?.trim() || (await supabase.from("perfiles").select("email").eq("rol", "admin").limit(1)).data?.[0]?.email;
  if (!adminEmail) return res.status(500).json({ error: "No hay administrador registrado. Configura ADMIN_EMAIL en .env o crea un perfil admin." });

  const codigo = generarCodigo();
  const expiraAt = new Date();
  expiraAt.setMinutes(expiraAt.getMinutes() + 15);

  try {
    const { data, error } = await supabase.from("codigos_edicion").insert({
      codigo,
      vendedor_id: req.user.id,
      entidad,
      entidad_id,
      admin_email: adminEmail,
      expira_at: expiraAt.toISOString(),
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });

    const tipoEntidad = entidad === "cliente" ? "un cliente" : "una venta/orden";
    const nombreVendedor = req.user.nombre || req.user.email || "Un vendedor";
    const texto = `El vendedor ${nombreVendedor} (${req.user.email}) ha solicitado un código para editar ${tipoEntidad}.\n\nCódigo: ${codigo}\nVálido por 15 minutos.\n\nPásale este código solo a ${nombreVendedor} para que pueda realizar los cambios.`;
    const html = `<p>El vendedor <strong>${nombreVendedor}</strong> (${req.user.email}) ha solicitado un código para editar ${tipoEntidad}.</p><p><strong>Código: ${codigo}</strong></p><p>Válido por 15 minutos.</p><p>Pásale este código solo a <strong>${nombreVendedor}</strong> para que pueda realizar los cambios.</p>`;
    await sendEmail(adminEmail, "Código de edición TGM - Pásalo al vendedor", texto, html);

    res.status(201).json({ id: data.id, mensaje: "Codigo generado y enviado al correo del administrador", expira_at: data.expira_at });
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
