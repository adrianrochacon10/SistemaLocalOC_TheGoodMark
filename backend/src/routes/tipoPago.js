import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as tipoPagoController from "../controllers/tipoPagoController.js";

const router = Router();
router.get("/", requireAuth, tipoPagoController.listar);

export default router;
