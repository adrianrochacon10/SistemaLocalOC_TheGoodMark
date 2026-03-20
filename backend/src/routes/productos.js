import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as productosController from "../controllers/productosController.js";

const router = Router();
router.get("/", requireAuth, productosController.listar);
router.post("/", requireAuth, productosController.crear);

export default router;
