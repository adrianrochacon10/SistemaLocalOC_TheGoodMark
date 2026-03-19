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
 *       Lista todas las ventas. Permite filtrar por mes/año o por orden de compra.
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
 *         name: orden_de_compra_id
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la orden de compra (alias obsoleto orden_mes_id)
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
 *     description: |
 *       Crea una venta para un colaborador (colaborador_id). Pantalla y producto vienen de
 *       la ficha en public.colaboradores.
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
 *               - colaborador_id
 *               - estado_venta
 *               - fecha_inicio
 *               - fecha_fin
 *               - duracion_meses
 *             properties:
 *               colaborador_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID del colaborador (alias obsoleto cliente_id aún aceptado en el body)
 *               estado_venta:
 *                 type: string
 *                 enum: [prospecto, aceptado, rechazado]
 *               estado:
 *                 type: string
 *                 description: Alias obsoleto de estado_venta
 *               client_name:
 *                 type: string
 *                 description: Nombre del cliente (facturación / documento)
 *               precio_por_mes:
 *                 type: number
 *               costos:
 *                 type: number
 *               utilidad_neta:
 *                 type: number
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
 *               estado_venta:
 *                 type: string
 *               estado:
 *                 type: string
 *               client_name:
 *                 type: string
 *               precio_por_mes:
 *                 type: number
 *               costos:
 *                 type: number
 *               utilidad_neta:
 *                 type: number
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
