import { Router } from "express";
import * as diagnosticoController from "../controllers/diagnosticoController.js";

const router = Router();

/**
 * @swagger
 * /diagnostico/email:
 *   get:
 *     summary: Enviar correo de prueba
 *     description: Envía un correo de prueba usando la configuración actual de Resend/SMTP.
 *     tags:
 *       - Diagnóstico
 *     parameters:
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         description: Correo de destino para la prueba
 *     responses:
 *       200:
 *         description: Correo de prueba enviado (o intento realizado)
 *       400:
 *         description: Falta el parámetro to
 *       500:
 *         description: Error enviando el correo de prueba
 */
router.get("/email", diagnosticoController.emailPrueba);

export default router;
