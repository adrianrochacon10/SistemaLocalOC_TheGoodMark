import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as productosController from "../controllers/productosController.js";

const router = Router();
router.get("/", productosController.listar);
router.post("/", productosController.crear);
router.patch("/:id", productosController.actualizar);

export default router;
