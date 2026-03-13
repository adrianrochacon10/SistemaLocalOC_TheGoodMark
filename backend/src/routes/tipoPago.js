import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as tipoPagoController from "../controllers/tipoPagoController.js";

const router = Router();

/**
 * @swagger
 * /tipo-pago:
 *   get:
 *     summary: Listar tipos de pago
 *     tags:
 *       - Tipo de pago
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tipos de pago obtenida correctamente
 *       500:
 *         description: Error interno del servidor
 */
router.get("/", requireAuth, tipoPagoController.listar);

export default router;
