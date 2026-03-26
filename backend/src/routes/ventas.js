import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as ventasController from "../controllers/ventasController.js";

const router = Router();
router.use(requireAuth);

router.get("/", ventasController.listar);
router.post("/", ventasController.crear);
router.patch("/:id", ventasController.actualizar);
router.delete("/:id", ventasController.eliminar);
router.post("/:id/renovar", ventasController.renovar);

export default router;
