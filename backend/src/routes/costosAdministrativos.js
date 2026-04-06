import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import * as costosAdministrativosController from "../controllers/costosAdministrativosController.js";

const router = Router();

router.get("/", costosAdministrativosController.listar);
router.post("/", requireAuth, requireAdmin, costosAdministrativosController.crear);
router.patch("/:id", requireAuth, requireAdmin, costosAdministrativosController.actualizar);
router.delete("/:id", requireAuth, requireAdmin, costosAdministrativosController.eliminar);

export default router;
