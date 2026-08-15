import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  getEvidenceList,
  createEvidence
} from "../controllers/evidenceController";

const router = Router();

router.use(authenticateToken);

router.get("/", getEvidenceList);
router.post("/", createEvidence);

export default router;
