import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import * as colaboradoresController from "../controllers/colaboradoresController.js";

const router = Router();

router.get("/", colaboradoresController.listar);
router.post("/", colaboradoresController.crear);
router.patch("/:id", requireAuth, colaboradoresController.actualizar);
router.delete("/:id", requireAuth, requireAdmin, colaboradoresController.eliminar);
router.get("/:id", requireAuth, colaboradoresController.obtenerPorId);

export default router;
