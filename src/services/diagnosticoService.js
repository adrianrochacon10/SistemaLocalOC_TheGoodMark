import { sendEmail } from "../lib/email.js";

export async function enviarCorreoPrueba(to) {
  const email = String(to || "").trim();
  if (!email) return { error: "Parámetro ?to= obligatorio" };
  await sendEmail(email, "Prueba correo TGM (Resend/SMTP)", "Este es un correo de prueba enviado desde el backend de TGM.");
  return { ok: true, message: "Correo de prueba enviado. Revisa tu bandeja (y spam) y la consola del backend." };
}
