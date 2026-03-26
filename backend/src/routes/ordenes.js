import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as ordenesController from "../controllers/ordenesController.js";

const router = Router();

router.get("/", ordenesController.listar);
router.get("/ventas", ordenesController.listarVentas);
router.post("/generar", requireAuth, ordenesController.generar);
router.post("/generar-colaborador", requireAuth, ordenesController.generarColaborador);
router.post("/crear-manual", requireAuth, ordenesController.crearManual);
router.delete("/:id", requireAuth, ordenesController.eliminar);

export default router;
