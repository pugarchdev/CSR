import { Router } from "express";
import { getCompanies, getCompanyById, updateCompany, verifyCompany } from "../controllers/companyController";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware";
import { Role } from "@prisma/client";

const router = Router();

router.get("/", authenticateToken, getCompanies);
router.get("/:id", authenticateToken, getCompanyById);
router.patch("/:id", authenticateToken, updateCompany);
router.patch("/:id/verify", authenticateToken, authorizeRoles([Role.SUPER_ADMIN]), verifyCompany);

export default router;
