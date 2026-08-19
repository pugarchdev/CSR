import { Router } from "express";
import { z } from "zod";
import { authenticateToken, authorizeRoles } from "../middlewares/authMiddleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import { strictRateLimiter } from "../middlewares/rateLimitMiddleware";
import { validateRequest } from "../middlewares/validationMiddleware";
import { Role } from "../types/role";
import { createSubDepartment, decideGovernmentOnboarding, listOnboardingReviews, registerMainGovernmentOrganization, requestGovernmentOnboardingOtp, submitGovernmentOnboarding } from "../controllers/governmentOnboardingController";

const router = Router();
const email = z.string().email();
const mobile = z.union([z.literal(""), z.string().trim().regex(/^\+?[1-9]\d{9,14}$/, "Enter a valid mobile number with 10 to 15 digits")]).optional().nullable();
const officer = z.object({ name: z.string().min(2), email, mobile, designation: z.string().optional().nullable() });

router.post("/main/request-otp", strictRateLimiter, validateRequest(z.object({ body: z.object({ headEmail: email }) })), asyncHandler(requestGovernmentOnboardingOtp));
router.post("/main/register", strictRateLimiter, validateRequest(z.object({ body: z.object({ governmentType: z.enum(["COLLECTORATE", "ZILLA_PARISHAD", "MUNICIPAL_CORPORATION"]), organizationName: z.string().min(3), district: z.string().min(2), address: z.string().optional().nullable(), head: officer, nodal: officer.nullish(), otp: z.string().regex(/^\d{6}$/) }) })), asyncHandler(registerMainGovernmentOrganization));
router.post("/:organizationId/submit", authenticateToken, validateRequest(z.object({ body: z.object({ formData: z.record(z.any()).optional(), documents: z.any().optional() }) })), asyncHandler(submitGovernmentOnboarding));
router.post("/:organizationId/sub-departments", authenticateToken, validateRequest(z.object({ body: z.object({ name: z.string().min(3), code: z.string().optional().nullable(), address: z.string().optional().nullable(), admin: officer, nodal: officer.nullish() }) })), asyncHandler(createSubDepartment));
router.get("/reviews", authenticateToken, authorizeRoles([Role.SUPER_ADMIN, Role.JOINT_SECRETARY, Role.PLANNING_SECRETARY]), asyncHandler(listOnboardingReviews));
router.post("/reviews/:applicationId/decision", authenticateToken, authorizeRoles([Role.SUPER_ADMIN, Role.JOINT_SECRETARY, Role.PLANNING_SECRETARY]), validateRequest(z.object({ body: z.object({ decision: z.enum(["APPROVE", "CLARIFICATION", "REJECT"]), remarks: z.string().optional() }) })), asyncHandler(decideGovernmentOnboarding));

export default router;
