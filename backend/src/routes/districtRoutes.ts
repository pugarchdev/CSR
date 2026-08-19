import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import { createProjectInspection, listCsrProjects } from "../controllers/csrLifecycleController";

const router = Router();
router.use(authenticateToken);

router.get("/requirements", (req, res) => res.json([]));
router.post("/inspections", createProjectInspection);
router.get("/projects", listCsrProjects);

export default router;
