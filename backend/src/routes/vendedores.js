import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import * as vendedoresController from "../controllers/vendedoresController.js";

const router = Router();
router.use(requireAuth);
router.use(requireAdmin);

router.get("/", vendedoresController.listar);
router.post("/", vendedoresController.crear);
router.patch("/:id", vendedoresController.actualizar);
router.delete("/:id", vendedoresController.eliminar);

export default router;
