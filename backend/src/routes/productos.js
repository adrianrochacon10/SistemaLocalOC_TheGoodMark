import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import * as productosController from "../controllers/productosController.js";

const router = Router();

/**
 * @swagger
 * /productos:
 *   get:
 *     summary: Listar productos
 *     tags:
 *       - Productos
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de productos obtenida correctamente
 *       500:
 *         description: Error interno del servidor
 */
router.get("/", requireAuth, productosController.listar);

/**
 * @swagger
 * /productos:
 *   post:
 *     summary: Crear producto
 *     description: Solo administradores pueden crear productos.
 *     tags:
 *       - Productos
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - precio
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Paquete mensual"
 *               precio:
 *                 type: number
 *                 example: 1500.5
 *     responses:
 *       201:
 *         description: Producto creado correctamente
 *       400:
 *         description: Datos inválidos
 *       403:
 *         description: Solo admin puede crear productos
 *       500:
 *         description: Error interno del servidor
 */
router.post("/", requireAuth, requireAdmin, productosController.crear);

export default router;
