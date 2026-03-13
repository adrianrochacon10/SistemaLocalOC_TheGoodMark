import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as clientesController from "../controllers/clientesController.js";

const router = Router();
router.use(requireAuth);

router.get("/", clientesController.listar);
router.post("/", clientesController.crear);
router.patch("/:id", clientesController.actualizar);
router.get("/:id", clientesController.obtenerPorId);

export default router;
