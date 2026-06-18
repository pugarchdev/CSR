import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { UploadService } from "../services/uploadService";
import prisma from "../config/db";

export const uploadSingleFile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file was attached to the request" });
    }

    const result = await UploadService.uploadFile(req.file.buffer, req.file.originalname);

    // Save upload activity in Audit Logs if user is logged in
    await prisma?.auditLog.create({
      data: {
        userId: req.user?.id || null,
        action: "FILE_UPLOAD",
        details: { 
          originalName: req.file.originalname, 
          url: result.secure_url,
          format: result.format,
          resourceType: result.resource_type
        }
      }
    });

    return res.json({
      message: "File uploaded successfully to Cloudinary under CSR folder.",
      url: result.secure_url,
      format: result.format,
      bytes: result.bytes
    });
  } catch (error) {
    next(error);
  }
};
