import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import * as codigosController from "../controllers/codigosController.js";

const router = Router();
router.post("/solicitar", requireAuth, codigosController.solicitar);
router.post("/validar", requireAuth, codigosController.validar);
router.get("/", requireAuth, requireAdmin, codigosController.listar);

export default router;
