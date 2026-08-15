import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  getFieldVisits,
  getFieldVisitById,
  createFieldVisit
} from "../controllers/fieldVisitController";

const router = Router();

router.use(authenticateToken);

router.get("/", getFieldVisits);
router.get("/:id", getFieldVisitById);
router.post("/", createFieldVisit);

export default router;
