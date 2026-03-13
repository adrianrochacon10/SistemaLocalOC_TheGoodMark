import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as ventasController from "../controllers/ventasController.js";

const router = Router();
router.use(requireAuth);

/**
 * @swagger
 * /ventas:
 *   get:
 *     summary: Listar ventas
 *     description: |
 *       Lista todas las ventas. Permite filtrar por mes/año o por orden del mes.
 *     tags:
 *       - Ventas
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: mes
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Mes (1-12) para filtrar por fecha_inicio/fecha_fin
 *       - in: query
 *         name: anio
 *         schema:
 *           type: integer
 *         description: Año para filtrar por fecha_inicio/fecha_fin
 *       - in: query
 *         name: orden_mes_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la orden del mes a la que pertenecen las ventas
 *     responses:
 *       200:
 *         description: Lista de ventas obtenida correctamente
 *       500:
 *         description: Error interno del servidor
 */
router.get("/", ventasController.listar);

/**
 * @swagger
 * /ventas:
 *   post:
 *     summary: Crear venta
 *     description: Crea una nueva venta para un cliente en una pantalla, usando producto o precio manual.
 *     tags:
 *       - Ventas
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cliente_id
 *               - estado
 *               - pantalla_id
 *               - fecha_inicio
 *               - fecha_fin
 *               - duracion_meses
 *             properties:
 *               cliente_id:
 *                 type: string
 *                 format: uuid
 *               estado:
 *                 type: string
 *                 enum: [prospecto, aceptado, rechazado]
 *               pantalla_id:
 *                 type: string
 *                 format: uuid
 *               fecha_inicio:
 *                 type: string
 *                 format: date
 *               fecha_fin:
 *                 type: string
 *                 format: date
 *               duracion_meses:
 *                 type: integer
 *               cantidad:
 *                 type: integer
 *                 default: 1
 *               producto_id:
 *                 type: string
 *                 format: uuid
 *               precio_unitario_manual:
 *                 type: number
 *               tipo_pago_id:
 *                 type: string
 *                 format: uuid
 *               comisiones:
 *                 type: number
 *     responses:
 *       201:
 *         description: Venta creada correctamente
 *       400:
 *         description: Datos inválidos
 *       500:
 *         description: Error interno del servidor
 */
router.post("/", ventasController.crear);

/**
 * @swagger
 * /ventas/{id}:
 *   patch:
 *     summary: Actualizar venta
 *     description: Actualiza una venta existente. Los vendedores requieren código de edición.
 *     tags:
 *       - Ventas
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la venta
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               estado:
 *                 type: string
 *               fecha_inicio:
 *                 type: string
 *                 format: date
 *               fecha_fin:
 *                 type: string
 *                 format: date
 *               duracion_meses:
 *                 type: integer
 *               tipo_pago_id:
 *                 type: string
 *                 format: uuid
 *               renovable:
 *                 type: boolean
 *               producto_id:
 *                 type: string
 *                 format: uuid
 *               cantidad:
 *                 type: integer
 *               precio_unitario_manual:
 *                 type: number
 *               precio_total:
 *                 type: number
 *               comisiones:
 *                 type: number
 *               codigo_edicion:
 *                 type: string
 *                 description: Código de edición requerido para vendedores
 *     responses:
 *       200:
 *         description: Venta actualizada correctamente
 *       400:
 *         description: Código inválido o datos incorrectos
 *       404:
 *         description: Venta no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.patch("/:id", ventasController.actualizar);

/**
 * @swagger
 * /ventas/{id}/renovar:
 *   post:
 *     summary: Renovar venta
 *     description: Crea una nueva venta renovada a partir de una existente. Solo administradores.
 *     tags:
 *       - Ventas
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la venta original
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fecha_inicio:
 *                 type: string
 *                 format: date
 *               fecha_fin:
 *                 type: string
 *                 format: date
 *               duracion_meses:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Venta renovada creada correctamente
 *       400:
 *         description: Datos inválidos
 *       403:
 *         description: Solo admin puede renovar
 *       404:
 *         description: Venta no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.post("/:id/renovar", ventasController.renovar);

export default router;
