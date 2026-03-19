import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as colaboradoresController from "../controllers/colaboradoresController.js";

const router = Router();
router.use(requireAuth);

/**
 * @swagger
 * /colaboradores:
 *   get:
 *     summary: Listar colaboradores
 *     description: Colaboradores con tipo de pago, pantalla y producto.
 *     tags:
 *       - Colaboradores
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista obtenida correctamente
 *       500:
 *         description: Error interno del servidor
 */
router.get("/", colaboradoresController.listar);

/**
 * @swagger
 * /colaboradores:
 *   post:
 *     summary: Crear colaborador
 *     description: Crea un colaborador (pantalla y producto para ventas).
 *     tags:
 *       - Colaboradores
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
 *               - tipo_pago_id
 *               - pantalla_id
 *             properties:
 *               nombre:
 *                 type: string
 *               telefono:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               contacto:
 *                 type: string
 *               tipo_pago_id:
 *                 type: string
 *                 format: uuid
 *               pantalla_id:
 *                 type: string
 *                 format: uuid
 *               producto_id:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Creado correctamente
 *       400:
 *         description: Datos inválidos
 *       500:
 *         description: Error interno del servidor
 */
router.post("/", colaboradoresController.crear);

/**
 * @swagger
 * /colaboradores/{id}:
 *   patch:
 *     summary: Actualizar colaborador
 *     description: Vendedores requieren codigo_edicion.
 *     tags:
 *       - Colaboradores
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               telefono:
 *                 type: string
 *               email:
 *                 type: string
 *               contacto:
 *                 type: string
 *               tipo_pago_id:
 *                 type: string
 *                 format: uuid
 *               pantalla_id:
 *                 type: string
 *                 format: uuid
 *               producto_id:
 *                 type: string
 *                 format: uuid
 *               codigo_edicion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Actualizado correctamente
 *       400:
 *         description: Código inválido o datos incorrectos
 *       404:
 *         description: No encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.patch("/:id", colaboradoresController.actualizar);

/**
 * @swagger
 * /colaboradores/{id}:
 *   get:
 *     summary: Obtener colaborador por ID
 *     tags:
 *       - Colaboradores
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Encontrado
 *       404:
 *         description: No encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get("/:id", colaboradoresController.obtenerPorId);

export default router;
