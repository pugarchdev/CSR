import { Router } from "express";
import multer from "multer";
import { uploadSingleFile } from "../controllers/uploadController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = Router();

// Configure Multer to store files in memory (to upload to Cloudinary)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit file uploads to 10MB
  },
});

router.post("/", authenticateToken, upload.single("file"), uploadSingleFile);

export default router;
