import { Router } from "express";
import * as diagnosticoController from "../controllers/diagnosticoController.js";

const router = Router();
router.get("/email", diagnosticoController.emailPrueba);

export default router;
