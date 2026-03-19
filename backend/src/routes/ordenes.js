import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as ordenesController from "../controllers/ordenesController.js";
import { streamOrdenCompraPdf } from "../services/ordenCompraPdf.js";

const router = Router();
router.use(requireAuth);

/**
 * @swagger
 * /ordenes:
 *   get:
 *     summary: Listar órdenes de compra
 *     description: Devuelve órdenes de compra (por colaborador y mes/año) con ventas enlazadas.
 *     tags:
 *       - Órdenes de compra
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
 *       - in: query
 *         name: colaborador_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrar por colaborador
 *     responses:
 *       200:
 *         description: Lista de órdenes de compra
 *       500:
 *         description: Error interno del servidor
 */
router.get("/", ordenesController.listar);

/**
 * @swagger
 * /ordenes/ventas:
 *   get:
 *     summary: Listar ventas por mes/año
 *     description: Lista ventas que solapan el mes y año; opcionalmente por colaborador_id.
 *     tags:
 *       - Órdenes de compra
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
 *       - in: query
 *         name: colaborador_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Opcional — solo ventas de ese colaborador
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
 *     summary: Generar orden de compra
 *     description: Crea o actualiza orden_de_compra para un colaborador y mes/año; calcula subtotal, IVA 16% y total; enlaza ventas del periodo.
 *     tags:
 *       - Órdenes de compra
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - colaborador_id
 *               - mes
 *               - anio
 *             properties:
 *               colaborador_id:
 *                 type: string
 *                 format: uuid
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
 *         description: Parámetros inválidos
 *       500:
 *         description: Error interno del servidor
 */
router.post("/generar", ordenesController.generar);

/**
 * @swagger
 * /ordenes/{id}/pdf:
 *   get:
 *     summary: PDF de la orden de compra
 *     description: Descarga el PDF generado desde la fila orden_de_compra y sus ventas enlazadas.
 *     tags:
 *       - Órdenes de compra
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
 *         description: Archivo PDF
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Orden no encontrada
 */
router.get("/:id/pdf", streamOrdenCompraPdf);

export default router;
