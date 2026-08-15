import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  getIssues,
  getIssueById,
  createIssue,
  updateIssue
} from "../controllers/issueController";

const router = Router();

router.use(authenticateToken);

router.get("/", getIssues);
router.get("/:id", getIssueById);
router.post("/", createIssue);
router.patch("/:id", updateIssue);

export default router;
