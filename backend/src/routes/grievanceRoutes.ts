import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import {
  raiseGrievance,
  listGrievances,
  getMyGrievances,
  getGrievanceById,
  getAssignableOfficers,
  respondGrievance,
  escalateGrievance,
  closeGrievance,
  assignGrievance,
} from "../controllers/grievanceController";

const router = Router();

router.use(authenticateToken);

// List & Metadata
router.get("/", asyncHandler(listGrievances));
router.get("/my", asyncHandler(getMyGrievances));
router.get("/assignable-users", asyncHandler(getAssignableOfficers));

// Creation
router.post("/", asyncHandler(raiseGrievance));

// Detail
router.get("/:id", asyncHandler(getGrievanceById));

// Hierarchy & Resolution Actions
router.post("/:id/respond", asyncHandler(respondGrievance));
router.post("/:id/escalate", asyncHandler(escalateGrievance));
router.post("/:id/close", asyncHandler(closeGrievance));
router.patch("/:id/assign", asyncHandler(assignGrievance));

export default router;

