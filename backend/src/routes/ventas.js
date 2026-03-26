import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import * as ventasController from "../controllers/ventasController.js";

const router = Router();

router.get("/", ventasController.listar);
router.post("/", ventasController.crear);
router.patch("/:id", requireAuth, ventasController.actualizar);
router.delete("/:id", requireAuth, requireAdmin, ventasController.eliminar);
router.post("/:id/renovar", requireAuth, requireAdmin, ventasController.renovar);

export default router;
