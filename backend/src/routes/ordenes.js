import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as ordenesController from "../controllers/ordenesController.js";

const router = Router();
router.use(requireAuth);

/**
 * @swagger
 * /ordenes:
 *   get:
 *     summary: Listar órdenes del mes
 *     description: Devuelve las órdenes del mes (resumen por mes/año) con sus ventas incluidas.
 *     tags:
 *       - Órdenes del mes
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: mes
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Mes para filtrar
 *       - in: query
 *         name: anio
 *         schema:
 *           type: integer
 *         description: Año para filtrar
 *     responses:
 *       200:
 *         description: Lista de órdenes del mes
 *       500:
 *         description: Error interno del servidor
 */
router.get("/", ordenesController.listar);

/**
 * @swagger
 * /ordenes/ventas:
 *   get:
 *     summary: Listar ventas por mes/año
 *     description: Lista las ventas cuya fecha de inicio/fin cae en el mes y año indicados.
 *     tags:
 *       - Órdenes del mes
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: mes
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *       - in: query
 *         name: anio
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de ventas del mes
 *       400:
 *         description: Faltan parámetros mes/anio
 *       500:
 *         description: Error interno del servidor
 */
router.get("/ventas", ordenesController.listarVentas);

/**
 * @swagger
 * /ordenes/generar:
 *   post:
 *     summary: Generar orden del mes
 *     description: Genera o actualiza la orden del mes para un mes/año y enlaza las ventas correspondientes.
 *     tags:
 *       - Órdenes del mes
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mes
 *               - anio
 *             properties:
 *               mes:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *               anio:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Orden generada correctamente
 *       400:
 *         description: mes/anio inválidos
 *       500:
 *         description: Error interno del servidor
 */
router.post("/generar", ordenesController.generar);

export default router;
