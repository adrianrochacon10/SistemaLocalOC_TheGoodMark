import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as pantallasController from "../controllers/pantallasController.js";

const router = Router();
router.use(requireAuth);

router.get("/", pantallasController.listar);
router.post("/", pantallasController.crear);
router.patch("/:id", pantallasController.actualizar);
router.get("/:id", pantallasController.obtenerPorId);

export default router;
