import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as pantallasController from "../controllers/pantallasController.js";

const router = Router();

router.get("/", pantallasController.listar);
router.post("/", pantallasController.crear);
router.patch("/:id", requireAuth, pantallasController.actualizar);
router.get("/:id", requireAuth, pantallasController.obtenerPorId);

export default router;
