import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { validarYConsumirCodigo } from "./codigos.js";
import { sendEmail } from "../lib/email.js";

const router = Router();
router.use(requireAuth);

// Listar ventas con join a clientes
router.get("/", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("ventas")
      .select("*, cliente:clientes(id, nombre, email, telefono), pantalla:pantallas(id, nombre, direccion), producto:productos(id, nombre, precio), tipo_pago(id, nombre)")
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data ?? []);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

// Crear venta
router.post("/", async (req, res) => {
  const body = req.body;
  const vendedorId = req.user.id;
  if (!body.cliente_id) return res.status(400).json({ error: "Cliente es obligatorio" });
  if (!body.estado) return res.status(400).json({ error: "Estado de venta es obligatorio" });
  if (!body.pantalla_id) return res.status(400).json({ error: "Pantalla es obligatoria" });
  if (!body.fecha_inicio || !body.fecha_fin) return res.status(400).json({ error: "Fecha inicio y fin son obligatorias" });
  if (body.duracion_meses == null) return res.status(400).json({ error: "Duracion meses es obligatoria" });

  let tipoPagoId = body.tipo_pago_id;
  if (!tipoPagoId) {
    const { data: cliente, error: errCli } = await supabase
      .from("clientes")
      .select("tipo_pago_id")
      .eq("id", body.cliente_id)
      .single();
    if (errCli || !cliente) return res.status(400).json({ error: "Cliente no encontrado" });
    tipoPagoId = cliente.tipo_pago_id;
  }

  const insertPayload = {
    cliente_id: body.cliente_id,
    producto_id: body.producto_id ?? null,
    estado: body.estado,
    pantalla_id: body.pantalla_id,
    fecha_inicio: body.fecha_inicio,
    fecha_fin: body.fecha_fin,
    duracion_meses: Number(body.duracion_meses),
    vendedor_id: vendedorId,
    modo_venta: body.modo_venta ?? null,
    tipo_pago_id: tipoPagoId,
    renovable: body.renovable ?? false,
  };

  try {
    const { data, error } = await supabase
      .from("ventas")
      .insert(insertPayload)
      .select("*, cliente:clientes(id, nombre, email, telefono), pantalla:pantallas(id, nombre, direccion), producto:productos(id, nombre, precio), tipo_pago(id, nombre)")
      .single();
    if (error) return res.status(500).json({ error: error.message });

    // Notificar por correo a admins, vendedor que hizo la venta y cliente
    try {
      const { data: perfilesAdmins } = await supabase.from("perfiles").select("email").eq("rol", "admin");
      const { data: perfilVendedor } = await supabase.from("perfiles").select("email").eq("id", vendedorId).single();

      const destinatarios = new Set();
      for (const p of perfilesAdmins || []) {
        if (p.email) destinatarios.add(p.email);
      }
      if (perfilVendedor?.email) destinatarios.add(perfilVendedor.email);
      if (data?.cliente?.email) destinatarios.add(data.cliente.email);

      const asunto = `Nueva venta registrada - ${data?.cliente?.nombre || "Sin nombre"}`;
      const texto = [
        "Se ha registrado una nueva venta en The Good Mark.",
        "",
        `Cliente: ${data?.cliente?.nombre || "N/D"}`,
        `Pantalla: ${data?.pantalla?.nombre || "N/D"}`,
        `Producto: ${data?.producto?.nombre || "N/D"}`,
        `Estado: ${data?.estado}`,
        `Fechas: ${data?.fecha_inicio} al ${data?.fecha_fin}`,
        `Meses: ${data?.duracion_meses}`,
      ].join("\n");
      const html = `
        <p>Se ha registrado una nueva venta en <strong>The Good Mark</strong>.</p>
        <ul>
          <li><strong>Cliente:</strong> ${data?.cliente?.nombre || "N/D"}</li>
          <li><strong>Pantalla:</strong> ${data?.pantalla?.nombre || "N/D"}</li>
          <li><strong>Producto:</strong> ${data?.producto?.nombre || "N/D"}</li>
          <li><strong>Estado:</strong> ${data?.estado}</li>
          <li><strong>Fechas:</strong> ${data?.fecha_inicio} al ${data?.fecha_fin}</li>
          <li><strong>Meses:</strong> ${data?.duracion_meses}</li>
        </ul>
      `;

      for (const email of destinatarios) {
        // No bloqueamos la API aunque falle un correo individual
        // eslint-disable-next-line no-await-in-loop
        await sendEmail(email, asunto, texto, html);
      }
    } catch (e) {
      console.error("[VENTAS] Error enviando notificaciones de venta:", e?.message || e);
    }

    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

// Editar venta (con código para vendedores)
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const body = req.body;
  if (req.user.rol === "vendedor") {
    const codigo = body.codigo_edicion;
    const resultado = await validarYConsumirCodigo(codigo, req.user.id, "orden", id);
    if (!resultado.ok) return res.status(400).json({ error: resultado.error });
  }
  const payload = { updated_at: new Date().toISOString() };
  if (body.estado !== undefined) payload.estado = body.estado;
  if (body.fecha_inicio !== undefined) payload.fecha_inicio = body.fecha_inicio;
  if (body.fecha_fin !== undefined) payload.fecha_fin = body.fecha_fin;
  if (body.duracion_meses !== undefined) payload.duracion_meses = body.duracion_meses;
  if (body.modo_venta !== undefined) payload.modo_venta = body.modo_venta;
  if (body.tipo_pago_id !== undefined) payload.tipo_pago_id = body.tipo_pago_id;
  if (body.renovable !== undefined) payload.renovable = body.renovable;
  if (body.producto_id !== undefined) payload.producto_id = body.producto_id || null;

  try {
    const { data, error } = await supabase.from("ventas").update(payload).eq("id", id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: "Venta no encontrada" });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

// Renovar venta (solo admin)
router.post("/:id/renovar", async (req, res) => {
  if (req.user.rol !== "admin") return res.status(403).json({ error: "Solo admin puede renovar" });
  const { id } = req.params;
  const body = req.body;
  const { data: venta, error: errVenta } = await supabase.from("ventas").select("*").eq("id", id).single();
  if (errVenta || !venta) return res.status(404).json({ error: "Venta no encontrada" });
  const nuevaInicio = body.fecha_inicio || body.fecha_inicio_nueva;
  const nuevaFin = body.fecha_fin || body.fecha_fin_nueva;
  const duracion = body.duracion_meses ?? venta.duracion_meses;
  if (!nuevaInicio || !nuevaFin) return res.status(400).json({ error: "fecha_inicio y fecha_fin obligatorios" });

  try {
    const { data, error } = await supabase
      .from("ventas")
      .insert({
        cliente_id: venta.cliente_id,
        producto_id: venta.producto_id ?? null,
        estado: "aceptado",
        pantalla_id: venta.pantalla_id,
        fecha_inicio: nuevaInicio,
        fecha_fin: nuevaFin,
        duracion_meses: duracion,
        vendedor_id: venta.vendedor_id,
        modo_venta: venta.modo_venta,
        tipo_pago_id: venta.tipo_pago_id,
        renovable: false,
      })
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

export default router;
