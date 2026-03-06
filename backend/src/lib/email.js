import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT) || 587;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.EMAIL_FROM || process.env.SMTP_USER || "noreply@tgm.com";

let transporter = null;
if (host && user && pass) {
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
} else {
  console.warn("[EMAIL] SMTP no configurado (SMTP_HOST, SMTP_USER, SMTP_PASS). Los códigos se guardan pero no se envían por correo.");
}

/**
 * Envía un correo. Si SMTP no está configurado, no hace nada (no falla).
 * @param {string} to - Email del destinatario
 * @param {string} subject - Asunto
 * @param {string} text - Cuerpo en texto plano
 * @param {string} [html] - Cuerpo HTML opcional
 */
export async function sendEmail(to, subject, text, html) {
  if (!transporter) return;
  try {
    await transporter.sendMail({
      from: from.includes("<") ? from : `"The Good Mark Sistema" <${from}>`,
      to,
      subject,
      text,
      html: html || text.replace(/\n/g, "<br>"),
    });
  } catch (e) {
    console.error("[EMAIL] Error enviando correo:", e.message);
  }
}
