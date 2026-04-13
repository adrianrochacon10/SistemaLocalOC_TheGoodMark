import { Router } from "express";
import * as clientsController from "../controllers/clientsController.js";

const router = Router();

/** Sin requireAuth: mismo criterio que GET/POST /api/ventas (API local + service role en Supabase). */
router.get("/", clientsController.listar);
router.post("/", clientsController.crear);
router.patch("/:id", clientsController.actualizar);
router.delete("/:id", clientsController.eliminar);

export default router;
