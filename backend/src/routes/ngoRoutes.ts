import { Router } from "express";
import { getNgos, getNgoById, updateNgo, verifyNgo } from "../controllers/ngoController";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware";
import { Role } from "@prisma/client";

const router = Router();

router.get("/", authenticateToken, getNgos);
router.get("/:id", authenticateToken, getNgoById);
router.patch("/:id", authenticateToken, updateNgo);
router.patch("/:id/verify", authenticateToken, authorizeRoles([Role.SUPER_ADMIN]), verifyNgo);

export default router;
