import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import * as codigosController from "../controllers/codigosController.js";

const router = Router();

/**
 * @swagger
 * /codigos/solicitar:
 *   post:
 *     summary: Solicitar código de edición
 *     description: |
 *       Un vendedor solicita un código para editar un colaborador o una venta (orden).
 *       "cliente" se acepta como alias de colaborador.
 *     tags:
 *       - Códigos de edición
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entidad
 *               - entidad_id
 *             properties:
 *               entidad:
 *                 type: string
 *                 enum: [colaborador, cliente, orden]
 *               entidad_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Código generado y enviado
 *       400:
 *         description: Datos inválidos o admin solicitando código
 *       500:
 *         description: Error al generar código
 */
router.post("/solicitar", requireAuth, codigosController.solicitar);

/**
 * @swagger
 * /codigos/validar:
 *   post:
 *     summary: Validar código de edición
 *     tags:
 *       - Códigos de edición
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - codigo
 *               - entidad
 *               - entidad_id
 *             properties:
 *               codigo:
 *                 type: string
 *               entidad:
 *                 type: string
 *                 enum: [colaborador, cliente, orden]
 *               entidad_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Resultado de validación
 *       400:
 *         description: Datos inválidos
 *       500:
 *         description: Error interno del servidor
 */
router.post("/validar", requireAuth, codigosController.validar);

/**
 * @swagger
 * /codigos:
 *   get:
 *     summary: Listar códigos vigentes
 *     description: Lista códigos de edición no usados y no expirados. Solo administradores.
 *     tags:
 *       - Códigos de edición
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de códigos vigentes
 *       403:
 *         description: Solo admin puede ver códigos
 *       500:
 *         description: Error interno del servidor
 */
router.get("/", requireAuth, requireAdmin, codigosController.listar);

export default router;
