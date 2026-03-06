import { Router } from "express";
import { supabase } from "../config/supabase.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    let q = supabase.from("ordenes_mes").select("*");
    const mes = Number(req.query.mes);
    const anio = Number(req.query.anio);
    if (mes && mes >= 1 && mes <= 12) q = q.eq("mes", mes);
    if (anio) q = q.eq("anio", anio);
    const { data: ordenes, error } = await q.order("anio", { ascending: false }).order("mes", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    if (!ordenes?.length) return res.json([]);

    const ordenesConVentas = await Promise.all(
      ordenes.map(async (orden) => {
        let ids = orden.ventas_ids;
        if (typeof ids === "string") try { ids = JSON.parse(ids); } catch { ids = []; }
        ids = Array.isArray(ids) ? ids.filter(Boolean) : [];
        if (ids.length === 0) return { ...orden, ventas: [] };
        const { data: ventas } = await supabase
          .from("ventas")
          .select("*, cliente:clientes(id, nombre, email, telefono), pantalla:pantallas(id, nombre, tipo_pdf), vendedor:perfiles(id, nombre, email), tipo_pago(id, nombre)")
          .in("id", ids)
          .order("fecha_inicio");
        return { ...orden, ventas: ventas ?? [] };
      })
    );
    res.json(ordenesConVentas);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

router.get("/ventas", async (req, res) => {
  const mes = Number(req.query.mes);
  const anio = Number(req.query.anio);
  if (!mes || !anio) return res.status(400).json({ error: "Query mes y anio son obligatorios" });
  const inicio = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const fin = new Date(anio, mes, 0);
  const finStr = fin.toISOString().slice(0, 10);

  try {
    const { data, error } = await supabase
      .from("ventas")
      .select("*, cliente:clientes(id, nombre, email, telefono), pantalla:pantallas(id, nombre, tipo_pdf), vendedor:perfiles(id, nombre, email), tipo_pago(id, nombre)")
      .gte("fecha_inicio", inicio)
      .lte("fecha_fin", finStr)
      .order("fecha_inicio");
    if (error) return res.status(500).json({ error: error.message });
    res.json(data ?? []);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

router.post("/generar", async (req, res) => {
  const { mes, anio } = req.body || {};
  const userId = req.user.id;
  const m = Number(mes);
  const a = Number(anio);
  if (!m || m < 1 || m > 12 || !a) return res.status(400).json({ error: "mes (1-12) y anio son obligatorios" });
  const inicio = `${a}-${String(m).padStart(2, "0")}-01`;
  const fin = new Date(a, m, 0);
  const finStr = fin.toISOString().slice(0, 10);

  try {
    const { data: ventas, error: errVentas } = await supabase.from("ventas").select("id, pantalla_id, pantallas(id, nombre, tipo_pdf)").gte("fecha_inicio", inicio).lte("fecha_fin", finStr);
    if (errVentas) return res.status(500).json({ error: errVentas.message });
    const ventasIds = (ventas ?? []).map((v) => v.id);
    const porTipoPdf = { 1: (ventas ?? []).filter((v) => v.pantallas?.tipo_pdf === 1), 2: (ventas ?? []).filter((v) => v.pantallas?.tipo_pdf === 2) };
    const { data: orden, error: errOrden } = await supabase.from("ordenes_mes").upsert({ mes: m, anio: a, ventas_ids: ventasIds, generado_por: userId }, { onConflict: "mes,anio" }).select().single();
    if (errOrden) return res.status(500).json({ error: errOrden.message });
    res.json({ orden, ventas_ids: ventasIds, por_tipo_pdf: porTipoPdf });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : "Error interno" });
  }
});

export default router;
