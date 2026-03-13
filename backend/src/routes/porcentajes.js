import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import * as porcentajesController from "../controllers/porcentajesController.js";

const router = Router();

/**
 * @swagger
 * /porcentajes:
 *   get:
 *     summary: Listar porcentajes
 *     description: Lista de porcentajes asociados al tipo de pago \"porcentaje\".
 *     tags:
 *       - Porcentajes
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de porcentajes obtenida correctamente
 *       500:
 *         description: Error interno del servidor
 */
router.get("/", requireAuth, porcentajesController.listar);

/**
 * @swagger
 * /porcentajes:
 *   post:
 *     summary: Crear porcentaje
 *     description: Solo administradores. Crea un nuevo porcentaje (0-100) para tipo de pago \"porcentaje\".
 *     tags:
 *       - Porcentajes
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - valor
 *             properties:
 *               valor:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               descripcion:
 *                 type: string
 *     responses:
 *       201:
 *         description: Porcentaje creado correctamente
 *       400:
 *         description: Valor inválido
 *       403:
 *         description: Solo admin puede crear porcentajes
 *       500:
 *         description: Error interno del servidor
 */
router.post("/", requireAuth, requireAdmin, porcentajesController.crear);

export default router;
