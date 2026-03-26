import { Router } from "express";
import * as tipoPagoController from "../controllers/tipoPagoController.js";

const router = Router();
router.get("/", tipoPagoController.listar);

export default router;
