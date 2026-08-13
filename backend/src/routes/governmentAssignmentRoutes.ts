import { Router } from "express";
import { z } from "zod";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/validationMiddleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import { Role } from "../types/role";
import { createGovernmentAssignment, escalateWrongDistrict, getGovernmentAssignmentDetail, getGovernmentAssignmentOptions, listGovernmentAssignmentWorkspace, reassignRejectedNodal, respondToGovernmentAssignment } from "../controllers/governmentAssignmentController";

const router = Router();
router.use(authenticateToken);
router.get("/", asyncHandler(listGovernmentAssignmentWorkspace));
router.get("/options/:caseId", authorizeRoles([Role.JOINT_SECRETARY]), asyncHandler(getGovernmentAssignmentOptions));
router.post("/", authorizeRoles([Role.JOINT_SECRETARY]), validateRequest(z.object({ body: z.object({ caseId: z.string().uuid(), projectId: z.string().uuid().optional(), governmentOrganizationId: z.string().uuid(), primaryNodalUserId: z.string().uuid(), districtAssignments: z.array(z.object({ district: z.string(), governmentOrganizationId: z.string().uuid().optional(), nodalUserId: z.string().uuid().optional() })).optional(), dncUserIds: z.array(z.string().uuid()).optional() }) })), asyncHandler(createGovernmentAssignment));
router.get("/:assignmentId", asyncHandler(getGovernmentAssignmentDetail));
router.post("/:assignmentId/respond", validateRequest(z.object({ body: z.object({ decision: z.enum(["ACCEPT", "REJECT"]), reason: z.string().optional() }) })), asyncHandler(respondToGovernmentAssignment));
router.post("/:assignmentId/reassign-nodal", validateRequest(z.object({ body: z.object({ replacementNodalUserId: z.string().uuid(), reason: z.string().optional() }) })), asyncHandler(reassignRejectedNodal));
router.post("/:assignmentId/escalate-wrong-district", validateRequest(z.object({ body: z.object({ reason: z.string().min(3) }) })), asyncHandler(escalateWrongDistrict));
export default router;
