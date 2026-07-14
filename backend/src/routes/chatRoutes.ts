/**
 * @deprecated LEGACY - NOT MOUNTED in app.ts (ENABLE_LEGACY_NGO_MARKETPLACE guard).
 * This router is not registered; changes here have no runtime effect.
 */
import { Router } from "express";
import { getOrCreateChat, listChats, getChatMessages } from "../controllers/chatController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = Router();

router.get("/", authenticateToken, listChats);
router.post("/", authenticateToken, getOrCreateChat);
router.get("/:id/messages", authenticateToken, getChatMessages);

export default router;
