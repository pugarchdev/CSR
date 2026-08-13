import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  listMySubLogins,
  assignAgencyToProject,
  listPendingApprovals,
  decideSubLogin,
  listEligibleNgos
  ,inviteImplementingAgency, searchNgoMaster, submitNgoMasterProfile, listNgoContextProjects, listProjectAgencies
} from "../controllers/implementingAgencyController";

const router = Router();
router.use(authenticateToken);

router.get("/search", searchNgoMaster);
router.post("/projects/:id/invite", inviteImplementingAgency);
router.get("/projects/:id/agencies", listProjectAgencies);
router.post("/profile/submit", submitNgoMasterProfile);
router.get("/context/projects", listNgoContextProjects);
router.get("/sub-logins", listMySubLogins);
router.get("/eligible-ngos", listEligibleNgos);
router.post("/assign", assignAgencyToProject);
router.get("/pending-approvals", listPendingApprovals);
router.get("/approvals/pending", listPendingApprovals);
router.post("/sub-logins/:id/decide", decideSubLogin);

export default router;
