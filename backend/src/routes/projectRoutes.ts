/**
 * @deprecated LEGACY - NOT MOUNTED in app.ts (ENABLE_LEGACY_NGO_MARKETPLACE guard).
 * This router is not registered; changes here have no runtime effect.
 */
import { Router } from "express";
import {
  getProjects,
  getProjectById,
  createProject,
  updateProjectStatus,
  addProjectMilestones,
  submitMilestoneEvidence,
  releaseMilestoneFunding
} from "../controllers/projectController";
import { authenticateToken, authorizeRoles, optionalAuthenticateToken } from "../middlewares/authMiddleware";
import { Role } from "@prisma/client";
import { validateRequest } from "../middlewares/validationMiddleware";
import { z } from "zod";

const router = Router();

const projectCreateSchema = z.object({
  body: z.object({
    title: z.string().min(5, "Title must be at least 5 characters"),
    description: z.string().min(20, "Description must be at least 20 characters"),
    focusArea: z.string().min(2),
    sdgGoal: z.string().min(2),
    beneficiaryCount: z.number().int().positive(),
    budgetRequested: z.number().positive(),
    district: z.string().min(2),
    taluka: z.string().min(2),
    village: z.string().optional(),
    startDate: z.string().datetime().or(z.string()),
    endDate: z.string().datetime().or(z.string())
  })
});

const milestonesSchema = z.object({
  body: z.object({
    milestones: z.array(
      z.object({
        name: z.string().min(2),
        description: z.string().min(5),
        amount: z.number().positive(),
        dueDate: z.string().datetime().or(z.string())
      })
    )
  })
});

const statusSchema = z.object({
  body: z.object({
    status: z.enum(["DRAFT", "SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "FUNDED", "COMPLETED"])
  })
});

router.get("/", optionalAuthenticateToken, getProjects);
router.get("/:id", optionalAuthenticateToken, getProjectById);
router.post("/", authenticateToken, validateRequest(projectCreateSchema), createProject);
router.patch("/:id/status", authenticateToken, validateRequest(statusSchema), updateProjectStatus);
router.post("/:id/milestones", authenticateToken, validateRequest(milestonesSchema), addProjectMilestones);
router.patch("/milestones/:milestoneId/submit", authenticateToken, submitMilestoneEvidence);
router.patch("/milestones/:milestoneId/approve", authenticateToken, releaseMilestoneFunding);

export default router;
