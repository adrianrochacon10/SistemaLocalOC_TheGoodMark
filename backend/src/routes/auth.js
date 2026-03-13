import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as authController from "../controllers/authController.js";

const router = Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     description: |
 *       Autentica a un usuario de The Good Mark con email y contraseña.
 *       Devuelve el usuario de Supabase, la sesión (token JWT) y el perfil (rol).
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Correo registrado en Supabase
 *                 example: Administracion@thegoodmark.com.mx
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Contraseña del usuario
 *                 example: Thegoodmark22$
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   description: Usuario de Supabase
 *                 session:
 *                   type: object
 *                   description: Sesión de Supabase (incluye access_token JWT)
 *                 perfil:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     nombre:
 *                       type: string
 *                     email:
 *                       type: string
 *                       format: email
 *                     rol:
 *                       type: string
 *                       enum: [admin, vendedor]
 *             example:
 *               user:
 *                 id: "9a2b5c7d-4e3f-5a6b-7c8d-9e0f1a2b3c4d"
 *                 email: "admin@tgm.com"
 *               session:
 *                 access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 token_type: "bearer"
 *               perfil:
 *                 id: "9a2b5c7d-4e3f-5a6b-7c8d-9e0f1a2b3c4d"
 *                 nombre: "Administrador"
 *                 email: "admin@tgm.com"
 *                 rol: "admin"
 *       400:
 *         description: Faltan credenciales
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               status: 400
 *               message: "Email y contrasena son obligatorios"
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *             example:
 *               error: "Invalid login credentials"
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/login", authController.login);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Obtener perfil autenticado
 *     description: Devuelve el perfil (`perfiles`) asociado al token JWT actual.
 *     tags:
 *       - Auth
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtenido correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 perfil:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     nombre:
 *                       type: string
 *                     email:
 *                       type: string
 *                       format: email
 *                     rol:
 *                       type: string
 *                       enum: [admin, vendedor]
 *       401:
 *         description: Token inválido o ausente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UnauthorizedError'
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/me", requireAuth, authController.me);

export default router;
