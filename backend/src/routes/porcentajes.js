import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as porcentajesController from "../controllers/porcentajesController.js";

const router = Router();
router.get("/", requireAuth, porcentajesController.listar);
router.post("/", requireAuth, porcentajesController.crear);

export default router;
