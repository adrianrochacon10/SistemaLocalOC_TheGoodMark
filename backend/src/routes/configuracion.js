import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as configuracionController from "../controllers/configuracionController.js";

const router = Router();
router.use(requireAuth);

router.get("/", configuracionController.obtener);
router.post("/", configuracionController.guardar);

export default router;
