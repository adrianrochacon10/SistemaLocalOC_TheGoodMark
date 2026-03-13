import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as clientesController from "../controllers/clientesController.js";

const router = Router();
router.use(requireAuth);

/**
 * @swagger
 * /clientes:
 *   get:
 *     summary: Listar clientes
 *     description: Devuelve todos los clientes (colaboradores) con su tipo de pago y pantalla.
 *     tags:
 *       - Clientes
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de clientes obtenida correctamente
 *       500:
 *         description: Error interno del servidor
 */
router.get("/", clientesController.listar);

/**
 * @swagger
 * /clientes:
 *   post:
 *     summary: Crear cliente
 *     description: Crea un nuevo cliente asociado a un tipo de pago y una pantalla.
 *     tags:
 *       - Clientes
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
 *                 example: "Cliente Ejemplo"
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
 *     responses:
 *       201:
 *         description: Cliente creado correctamente
 *       400:
 *         description: Datos inválidos
 *       500:
 *         description: Error interno del servidor
 */
router.post("/", clientesController.crear);

/**
 * @swagger
 * /clientes/{id}:
 *   patch:
 *     summary: Actualizar cliente
 *     description: Actualiza los datos de un cliente existente. Los vendedores requieren código de edición.
 *     tags:
 *       - Clientes
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del cliente
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
 *                 format: email
 *               contacto:
 *                 type: string
 *               tipo_pago_id:
 *                 type: string
 *                 format: uuid
 *               pantalla_id:
 *                 type: string
 *                 format: uuid
 *               codigo_edicion:
 *                 type: string
 *                 description: Código de edición requerido para vendedores
 *     responses:
 *       200:
 *         description: Cliente actualizado correctamente
 *       400:
 *         description: Código inválido o datos incorrectos
 *       404:
 *         description: Cliente no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.patch("/:id", clientesController.actualizar);

/**
 * @swagger
 * /clientes/{id}:
 *   get:
 *     summary: Obtener cliente por ID
 *     tags:
 *       - Clientes
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID del cliente
 *     responses:
 *       200:
 *         description: Cliente encontrado
 *       404:
 *         description: Cliente no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get("/:id", clientesController.obtenerPorId);

export default router;
