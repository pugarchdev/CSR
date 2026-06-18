import { Router } from "express";
import { getOrCreateChat, listChats, getChatMessages } from "../controllers/chatController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = Router();

router.get("/", authenticateToken, listChats);
router.post("/", authenticateToken, getOrCreateChat);
router.get("/:id/messages", authenticateToken, getChatMessages);

export default router;
