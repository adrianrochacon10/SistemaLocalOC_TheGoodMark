import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as authController from "../controllers/authController.js";

const router = Router();

router.post("/login", authController.login);
router.get("/me", requireAuth, authController.me);

export default router;
