import cloudinary from "../config/cloudinary";
import { UploadApiResponse } from "cloudinary";

export class UploadService {
  public static async uploadFile(fileBuffer: Buffer, fileName: string): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      // Stripping extensions for public_id
      const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf(".")) || fileName;
      const cleanName = nameWithoutExt.replace(/[^a-zA-Z0-9_]/g, "_");

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: process.env.CLOUDINARY_FOLDER || "CSR",
          resource_type: "auto", // auto detects images vs PDFs/documents
          public_id: `${cleanName}_${Date.now()}`
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          if (!result) {
            return reject(new Error("Cloudinary upload returned undefined result"));
          }
          resolve(result);
        }
      );
      
      uploadStream.end(fileBuffer);
    });
  }
}
