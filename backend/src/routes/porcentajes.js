import { Router } from "express";
import * as porcentajesController from "../controllers/porcentajesController.js";

const router = Router();
router.get("/", porcentajesController.listar);
router.post("/", porcentajesController.crear);

export default router;
