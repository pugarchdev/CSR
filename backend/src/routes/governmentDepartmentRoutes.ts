import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = Router();
router.use(authenticateToken);

router.get("/beneficiary-profile", (req, res) => res.json({ success: true }));
router.put("/beneficiary-profile", (req, res) => res.json({ success: true }));

export default router;
