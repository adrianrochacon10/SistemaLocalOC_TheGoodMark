import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import * as costosCategoriasController from "../controllers/costosCategoriasController.js";

const router = Router();

router.get("/", costosCategoriasController.listar);
router.post("/", requireAuth, requireAdmin, costosCategoriasController.crear);
router.patch("/:id", requireAuth, requireAdmin, costosCategoriasController.actualizar);
router.delete("/:id", requireAuth, requireAdmin, costosCategoriasController.eliminar);

router.post("/:id/asociados", requireAuth, requireAdmin, costosCategoriasController.crearAsociado);
router.patch("/:id/asociados/:asociadoId", requireAuth, requireAdmin, costosCategoriasController.actualizarAsociado);
router.delete("/:id/asociados/:asociadoId", requireAuth, requireAdmin, costosCategoriasController.eliminarAsociado);
router.delete("/:id/asociados", requireAuth, requireAdmin, costosCategoriasController.eliminarTodosAsociados);

export default router;
