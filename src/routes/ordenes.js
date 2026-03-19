import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as ordenesController from "../controllers/ordenesController.js";

const router = Router();
router.use(requireAuth);

router.get("/", ordenesController.listar);
router.post("/generar", ordenesController.generar);

export default router;
