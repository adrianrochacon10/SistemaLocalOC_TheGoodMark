import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import * as vendedoresController from "../controllers/vendedoresController.js";

const router = Router();
router.use(requireAuth);
router.use(requireAdmin);

/**
 * @swagger
 * /vendedores:
 *   get:
 *     summary: Listar vendedores
 *     description: Lista los perfiles con rol `vendedor`. Solo administradores.
 *     tags:
 *       - Vendedores
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de vendedores obtenida correctamente
 *       403:
 *         description: Solo admin puede acceder
 *       500:
 *         description: Error interno del servidor
 */
router.get("/", vendedoresController.listar);

/**
 * @swagger
 * /vendedores:
 *   post:
 *     summary: Crear vendedor o admin
 *     description: Crea un usuario en Supabase y su perfil con rol `vendedor` o `admin`. Solo administradores.
 *     tags:
 *       - Vendedores
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
 *               - email
 *               - password
 *             properties:
 *               nombre:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "vendedor@tgm.com"
 *               password:
 *                 type: string
 *                 format: password
 *               rol:
 *                 type: string
 *                 enum: [vendedor, admin]
 *                 default: vendedor
 *     responses:
 *       201:
 *         description: Vendedor creado correctamente
 *       400:
 *         description: Datos inválidos o error al crear usuario
 *       403:
 *         description: Solo admin puede crear vendedores
 *       500:
 *         description: Error interno del servidor
 */
router.post("/", vendedoresController.crear);

export default router;
