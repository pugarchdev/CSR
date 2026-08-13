import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import { requirePermission } from "../middlewares/accessControlMiddleware";
import {
  createRequirement,
  getRequirements,
  getRequirementById,
  updateRequirement,
  deleteRequirement,
  verifyRequirement,
  submitRequirement,
  approveRequirement,
  rejectRequirement,
  requestRequirementClarification,
  publishRequirement,
  upsertBeneficiaryProfile,
  getMyBeneficiaryProfile,
  addRequirementDocument,
  confirmProjectHandover,
  getDepartmentCompanyInterests
} from "../controllers/csrRequirementController";

const router = Router();
router.use(authenticateToken);

router.post("/", requirePermission("requirement:create"), createRequirement);
router.get("/", requirePermission("requirement:view"), getRequirements);
router.get("/:id", getRequirementById);
router.put("/:id", requirePermission("requirement:update"), updateRequirement);
router.delete("/:id", requirePermission("requirement:delete"), deleteRequirement);
router.post("/:id/verify", requirePermission("requirement:verify"), verifyRequirement);
router.post("/:id/submit", requirePermission("requirement:submit"), submitRequirement);
router.post("/:id/approve", requirePermission("requirement:approve"), approveRequirement);
router.post("/:id/reject", requirePermission("requirement:reject"), rejectRequirement);
router.post("/:id/clarification", requirePermission("requirement:update"), requestRequirementClarification);
router.post("/:id/publish", requirePermission("requirement:publish"), publishRequirement);
router.put("/beneficiary-profile", requirePermission("requirement:update"), upsertBeneficiaryProfile);
router.get("/beneficiary-profile/me", requirePermission("requirement:view"), getMyBeneficiaryProfile);
router.post("/:id/documents", requirePermission("requirement:update"), addRequirementDocument);
router.post("/:id/handover", requirePermission("requirement:handover"), confirmProjectHandover);
router.get("/:id/company-interests", requirePermission("requirement:view"), getDepartmentCompanyInterests);

export default router;
