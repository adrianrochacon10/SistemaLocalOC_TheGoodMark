import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import * as vendedoresController from "../controllers/vendedoresController.js";

const router = Router();

router.get("/", vendedoresController.listar);
router.post("/", requireAuth, requireAdmin, vendedoresController.crear);
router.patch("/:id", requireAuth, requireAdmin, vendedoresController.actualizar);
router.delete("/:id", requireAuth, requireAdmin, vendedoresController.eliminar);

export default router;
