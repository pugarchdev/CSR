import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import { asyncHandler } from "../middlewares/asyncHandler";
import {
  createDepartment,
  listDepartments,
  updateDepartment,
  deleteDepartment,
  listGovernmentOrganizationsByDistrict
} from "../controllers/departmentController";

const router = Router();

router.use(authenticateToken);

router.get("/government-orgs", asyncHandler(listGovernmentOrganizationsByDistrict));
router.post("/", asyncHandler(createDepartment));
router.get("/", asyncHandler(listDepartments));
router.put("/:id", asyncHandler(updateDepartment));
router.delete("/:id", asyncHandler(deleteDepartment));

export default router;
