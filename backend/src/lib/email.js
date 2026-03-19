import nodemailer from "nodemailer";

const resendKey = process.env.RESEND_API_KEY?.trim();
const host = process.env.SMTP_HOST;
const port = Number(process.env.SMTP_PORT) || 587;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const from = process.env.EMAIL_FROM || process.env.SMTP_USER || "onboarding@resend.dev";

let transporter = null;
let useResend = false;
if (resendKey) {
  useResend = true;
} else if (host && user && pass) {
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
} else {
  console.warn("[EMAIL] SMTP o Resend no configurado. Añade RESEND_API_KEY (recomendado) o SMTP_HOST/SMTP_USER/SMTP_PASS en .env. Los códigos se guardan pero no se envían por correo.");
}

/**
 * @param {string} to 
 * @param {string} subject 
 * @param {string} text 
 * @param {string} [html] 
 */
export async function sendEmail(to, subject, text, html) {
  if (useResend && resendKey) {
    const fromResend = process.env.EMAIL_FROM?.trim() && process.env.EMAIL_FROM.includes("@")
      ? (process.env.EMAIL_FROM.includes("<") ? process.env.EMAIL_FROM : `"TGM" <${process.env.EMAIL_FROM}>`)
      : "The Good Mark Sistema <onboarding@resend.dev>";
    console.log("[EMAIL] Enviando a", to, "desde", fromResend);
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(resendKey);
      const { data, error } = await resend.emails.send({
        from: fromResend,
        to: [to],
        subject,
        html: html || text.replace(/\n/g, "<br>"),
      });
      if (error) {
        console.error("[EMAIL] Resend error:", JSON.stringify(error));
        throw new Error(error.message || "Resend error");
      }
      console.log("[EMAIL] OK enviado a", to, "id:", data?.id);
    } catch (e) {
      console.error("[EMAIL] Error enviando correo (Resend):", e?.message || e);
    }
    return;
  }
  console.warn("[EMAIL] Resend no activo (falta RESEND_API_KEY?)");
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
