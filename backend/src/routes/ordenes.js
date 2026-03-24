import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as ordenesController from "../controllers/ordenesController.js";

const router = Router();
router.use(requireAuth);

router.get("/", ordenesController.listar);
router.get("/ventas", ordenesController.listarVentas);
router.post("/generar", ordenesController.generar);
router.post("/crear-manual", ordenesController.crearManual);

export default router;
