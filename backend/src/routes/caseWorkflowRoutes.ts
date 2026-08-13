import { Router } from "express";
import { z } from "zod";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import { validateRequest } from "../middlewares/validationMiddleware";
import { Role } from "../types/role";
import { decideCaseFeasibility, getCaseDetail, listJsCaseDecisions, listMyCases, logCaseInteraction, submitCaseFeasibility } from "../controllers/caseWorkflowController";

const router=Router(); router.use(authenticateToken);
router.get("/mine",authorizeRoles([Role.RELATIONSHIP_MANAGER]),asyncHandler(listMyCases));
router.get("/js/decisions",authorizeRoles([Role.JOINT_SECRETARY]),asyncHandler(listJsCaseDecisions));
router.post("/js/assessments/:assessmentId/decision",authorizeRoles([Role.JOINT_SECRETARY]),validateRequest(z.object({body:z.object({decision:z.enum(["APPROVE","CLARIFICATION","REJECT"]),reason:z.string().optional(),conditions:z.any().optional()})})),asyncHandler(decideCaseFeasibility));
router.get("/:caseId",asyncHandler(getCaseDetail));
router.post("/:caseId/interactions",authorizeRoles([Role.RELATIONSHIP_MANAGER]),validateRequest(z.object({body:z.object({interactionType:z.enum(["CALL","VIDEO_CALL","PHYSICAL_MEETING","MESSAGE"]),participants:z.array(z.object({name:z.string(),role:z.string().optional(),contact:z.string().optional()})).min(1),summary:z.string().min(3),budgetDiscussion:z.string().optional(),notes:z.string().optional(),attachmentUrls:z.array(z.string().url()).optional(),occurredAt:z.string().datetime()})})),asyncHandler(logCaseInteraction));
router.post("/:caseId/feasibility",authorizeRoles([Role.RELATIONSHIP_MANAGER]),validateRequest(z.object({body:z.object({checklist:z.array(z.object({questionId:z.union([z.string(),z.number()]),answer:z.any(),remarks:z.string().optional()})).length(13),recommendation:z.string().min(2),executiveSummary:z.string().optional(),targetDistricts:z.array(z.string()).min(1),targetDepartmentId:z.string().uuid().optional(),conditions:z.any().optional()})})),asyncHandler(submitCaseFeasibility));
export default router;
