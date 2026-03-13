import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as pantallasController from "../controllers/pantallasController.js";

const router = Router();
router.use(requireAuth);

/**
 * @swagger
 * /pantallas:
 *   get:
 *     summary: Listar pantallas
 *     tags:
 *       - Pantallas
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pantallas obtenida correctamente
 *       500:
 *         description: Error interno del servidor
 */
router.get("/", pantallasController.listar);

/**
 * @swagger
 * /pantallas:
 *   post:
 *     summary: Crear pantalla
 *     tags:
 *       - Pantallas
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
 *             properties:
 *               nombre:
 *                 type: string
 *                 example: "Pantalla Centro"
 *     responses:
 *       201:
 *         description: Pantalla creada correctamente
 *       400:
 *         description: Datos inválidos
 *       500:
 *         description: Error interno del servidor
 */
router.post("/", pantallasController.crear);

/**
 * @swagger
 * /pantallas/{id}:
 *   patch:
 *     summary: Actualizar pantalla
 *     tags:
 *       - Pantallas
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la pantalla
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pantalla actualizada correctamente
 *       400:
 *         description: Nada que actualizar
 *       404:
 *         description: Pantalla no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.patch("/:id", pantallasController.actualizar);

/**
 * @swagger
 * /pantallas/{id}:
 *   get:
 *     summary: Obtener pantalla por ID
 *     tags:
 *       - Pantallas
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la pantalla
 *     responses:
 *       200:
 *         description: Pantalla encontrada
 *       404:
 *         description: Pantalla no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.get("/:id", pantallasController.obtenerPorId);

export default router;
