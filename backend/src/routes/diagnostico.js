import { Router } from "express";
import { sendEmail } from "../lib/email.js";

const router = Router();

router.get("/email", async (req, res) => {
  const to = String(req.query.to || "").trim();
  if (!to) return res.status(400).json({ ok: false, error: "Parámetro ?to= obligatorio" });

  try {
    await sendEmail(
      to,
      "Prueba correo TGM (Resend/SMTP)",
      "Este es un correo de prueba enviado desde el backend de TGM."
    );
    res.json({
      ok: true,
      message: "Correo de prueba enviado. Revisa tu bandeja (y spam) y la consola del backend.",
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: e instanceof Error ? e.message : "Error enviando correo de prueba",
    });
  }
});

export default router;

