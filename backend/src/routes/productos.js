import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import * as productosController from "../controllers/productosController.js";

const router = Router();
router.get("/", requireAuth, productosController.listar);
router.post("/", requireAuth, requireAdmin, productosController.crear);

export default router;
