import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as colaboradoresController from "../controllers/colaboradoresController.js";

const router = Router();
router.use(requireAuth);

router.get("/", colaboradoresController.listar);
router.post("/", colaboradoresController.crear);
router.patch("/:id", colaboradoresController.actualizar);
router.get("/:id", colaboradoresController.obtenerPorId);

export default router;
