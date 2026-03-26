import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import * as configuracionController from "../controllers/configuracionController.js";

const router = Router();

router.get("/", configuracionController.obtener);
router.post("/", requireAuth, requireAdmin, configuracionController.guardar);

export default router;
